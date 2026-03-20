from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from decimal import Decimal

from ..core.database import get_db
from ..models import Client as ClientModel, MSTBox, FibreCore, ActivityLog, get_fiber_color
from ..schemas import (
    Client, ClientCreate, ClientUpdate, ClientWithMST, ClientStatus
)
from ..core.security import get_current_user

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("/", response_model=List[Client])
async def get_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    status: Optional[ClientStatus] = None,
    search: Optional[str] = None,
    mst_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all clients with optional filtering"""
    query = select(ClientModel)
    
    if status:
        query = query.where(ClientModel.status == status)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                ClientModel.name.ilike(search_term),
                ClientModel.client_id.ilike(search_term),
                ClientModel.phone.ilike(search_term),
                ClientModel.pppoe_username.ilike(search_term)
            )
        )
    
    if mst_id:
        query = query.where(ClientModel.mst_id == mst_id)
    
    query = query.offset(skip).limit(limit).order_by(ClientModel.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats", response_model=dict)
async def get_client_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get client statistics"""
    total = await db.execute(select(func.count(ClientModel.id)))
    active = await db.execute(select(func.count(ClientModel.id)).where(ClientModel.status == ClientStatus.ACTIVE))
    suspended = await db.execute(select(func.count(ClientModel.id)).where(ClientModel.status == ClientStatus.SUSPENDED))
    pending = await db.execute(select(func.count(ClientModel.id)).where(ClientModel.status == ClientStatus.PENDING))
    online = await db.execute(select(func.count(ClientModel.id)).where(ClientModel.is_online == True))
    
    return {
        "total": total.scalar(),
        "active": active.scalar(),
        "suspended": suspended.scalar(),
        "pending": pending.scalar(),
        "online": online.scalar()
    }


@router.get("/{client_id}", response_model=ClientWithMST)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific client by ID"""
    result = await db.execute(
        select(ClientModel).where(ClientModel.id == client_id)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Build response with MST info
    client_data = ClientWithMST.model_validate(client)
    
    if client.mst:
        client_data.mst_name = client.mst.name
        client_data.mst_latitude = client.mst.latitude
        client_data.mst_longitude = client.mst.longitude
    
    if client.fibre_core:
        client_data.fibre_core_color = client.fibre_core.color
    
    return client_data


@router.get("/{client_id}/network-path", response_model=dict)
async def get_client_network_path(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get the complete network path for a client (for map visualization)"""
    result = await db.execute(
        select(ClientModel).where(ClientModel.id == client_id)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    path_data = {
        "client": {
            "id": client.id,
            "name": client.name,
            "latitude": float(client.latitude),
            "longitude": float(client.longitude)
        },
        "mst": None,
        "backbone_route": None,
        "fibre_core": None
    }
    
    if client.mst:
        path_data["mst"] = {
            "id": client.mst.id,
            "name": client.mst.name,
            "mst_id": client.mst.mst_id,
            "latitude": float(client.mst.latitude),
            "longitude": float(client.mst.longitude),
            "splitter_port": client.splitter_port
        }
        
        # Get backbone route to this MST
        route_result = await db.execute(
            select(FibreRoute).where(FibreRoute.end_mst_id == client.mst_id)
        )
        route = route_result.scalar_one_or_none()
        
        if route:
            path_data["backbone_route"] = {
                "id": route.id,
                "name": route.name,
                "fibre_type": route.fibre_type,
                "distance_meters": float(route.distance_meters) if route.distance_meters else None
            }
    
    if client.fibre_core:
        path_data["fibre_core"] = {
            "id": client.fibre_core.id,
            "core_number": client.fibre_core.core_number,
            "color": client.fibre_core.color,
            "status": client.fibre_core.status
        }
    
    return path_data


@router.post("/", response_model=Client, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new client"""
    # Check if client_id already exists
    existing = await db.execute(
        select(ClientModel).where(ClientModel.client_id == client_data.client_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client ID already exists"
        )
    
    # Validate MST if provided
    if client_data.mst_id:
        mst_result = await db.execute(
            select(MSTBox).where(MSTBox.id == client_data.mst_id)
        )
        mst = mst_result.scalar_one_or_none()
        if not mst:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MST box not found"
            )
    
    # Create client
    client = ClientModel(
        **client_data.model_dump(),
        geom=f"POINT({client_data.longitude} {client_data.latitude})"
    )
    
    db.add(client)
    await db.flush()
    
    # Create activity log
    log = ActivityLog(
        action_type="client_created",
        action_description=f"Client '{client.name}' created",
        user_id=current_user.id,
        client_id=client.id,
        after_state={"client_id": client.client_id, "name": client.name},
        latitude=client.latitude,
        longitude=client.longitude
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(client)
    
    return client


@router.put("/{client_id}", response_model=Client)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update a client"""
    result = await db.execute(
        select(ClientModel).where(ClientModel.id == client_id)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Store before state
    before_state = {
        "name": client.name,
        "status": client.status,
        "mst_id": client.mst_id,
        "splitter_port": client.splitter_port
    }
    
    # Update fields
    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    
    # Create activity log
    log = ActivityLog(
        action_type="client_updated",
        action_description=f"Client '{client.name}' updated",
        user_id=current_user.id,
        client_id=client.id,
        before_state=before_state,
        after_state=update_data
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(client)
    
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a client"""
    result = await db.execute(
        select(ClientModel).where(ClientModel.id == client_id)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Create activity log before deletion
    log = ActivityLog(
        action_type="client_deleted",
        action_description=f"Client '{client.name}' deleted",
        user_id=current_user.id,
        before_state={"client_id": client.client_id, "name": client.name}
    )
    db.add(log)
    
    await db.delete(client)
    await db.commit()


@router.post("/{client_id}/connect-mst", response_model=Client)
async def connect_client_to_mst(
    client_id: int,
    mst_id: int,
    splitter_port: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Connect a client to an MST box"""
    # Get client
    client_result = await db.execute(
        select(ClientModel).where(ClientModel.id == client_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get MST
    mst_result = await db.execute(
        select(MSTBox).where(MSTBox.id == mst_id)
    )
    mst = mst_result.scalar_one_or_none()
    if not mst:
        raise HTTPException(status_code=404, detail="MST not found")
    
    # Check port availability
    if splitter_port < 1 or splitter_port > mst.total_ports:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid splitter port. Must be between 1 and {mst.total_ports}"
        )
    
    # Check if port is already used
    port_used = await db.execute(
        select(ClientModel).where(
            ClientModel.mst_id == mst_id,
            ClientModel.splitter_port == splitter_port
        )
    )
    if port_used.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Splitter port already in use")
    
    # Connect client
    client.mst_id = mst_id
    client.splitter_port = splitter_port
    
    # Update MST used ports count
    mst.used_ports += 1
    
    # Calculate drop cable length (simple distance calculation)
    from math import radians, sin, cos, sqrt, atan2
    lat1, lon1 = float(client.latitude), float(client.longitude)
    lat2, lon2 = float(mst.latitude), float(mst.longitude)
    
    R = 6371000  # Earth's radius in meters
    phi1, phi2 = radians(lat1), radians(lat2)
    delta_phi = radians(lat2 - lat1)
    delta_lambda = radians(lon2 - lon1)
    
    a = sin(delta_phi/2)**2 + cos(phi1)*cos(phi2)*sin(delta_lambda/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    client.drop_cable_length = Decimal(R * c)
    
    # Create activity log
    log = ActivityLog(
        action_type="client_connected",
        action_description=f"Client '{client.name}' connected to MST '{mst.name}' on port {splitter_port}",
        user_id=current_user.id,
        client_id=client.id,
        mst_id=mst.id,
        after_state={"mst_id": mst_id, "splitter_port": splitter_port}
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(client)
    
    return client


# Import FibreRoute for the query
from ..models import FibreRoute