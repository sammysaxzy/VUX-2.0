from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from ..core.database import get_db
from ..models.models import MSTBox, Client
from ..schemas.schemas import MSTBoxCreate, MSTBoxUpdate, MSTBoxResponse, MSTBoxDetail
from ..websocket.manager import manager

router = APIRouter(prefix="/mst", tags=["MST Boxes"])


@router.get("", response_model=List[MSTBoxResponse])
async def list_mst_boxes(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all MST boxes with optional filtering"""
    query = select(MSTBox)
    
    if status:
        query = query.where(MSTBox.status == status)
    
    query = query.offset(skip).limit(limit).order_by(MSTBox.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/map", response_model=List[MSTBoxResponse])
async def get_mst_for_map(db: AsyncSession = Depends(get_db)):
    """Get all MST boxes with coordinates for map display"""
    query = select(MSTBox).where(MSTBox.latitude.isnot(None), MSTBox.longitude.isnot(None))
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{mst_id}", response_model=MSTBoxDetail)
async def get_mst_box(mst_id: int, db: AsyncSession = Depends(get_db)):
    """Get detailed MST box information including connected clients"""
    mst = await db.get(MSTBox, mst_id)
    if not mst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MST box not found"
        )
    
    # Get connected clients
    clients_query = select(Client).where(Client.mst_box_id == mst_id)
    clients_result = await db.execute(clients_query)
    clients = clients_result.scalars().all()
    
    return MSTBoxDetail(
        **mst.__dict__,
        connected_clients=clients,
        available_cores=mst.total_cores - mst.used_cores
    )


@router.post("", response_model=MSTBoxResponse, status_code=status.HTTP_201_CREATED)
async def create_mst_box(
    mst_data: MSTBoxCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new MST box"""
    # Check if MST ID already exists
    existing = await db.execute(select(MSTBox).where(MSTBox.mst_id == mst_data.mst_id))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MST ID already exists"
        )
    
    mst = MSTBox(**mst_data.dict())
    db.add(mst)
    await db.commit()
    await db.refresh(mst)
    
    # Broadcast update via WebSocket
    await manager.broadcast({
        "type": "mst_created",
        "data": MSTBoxResponse.from_orm(mst).dict()
    })
    
    return mst


@router.put("/{mst_id}", response_model=MSTBoxResponse)
async def update_mst_box(
    mst_id: int,
    mst_data: MSTBoxUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an MST box"""
    mst = await db.get(MSTBox, mst_id)
    if not mst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MST box not found"
        )
    
    for field, value in mst_data.dict(exclude_unset=True).items():
        setattr(mst, field, value)
    
    await db.commit()
    await db.refresh(mst)
    
    # Broadcast update via WebSocket
    await manager.broadcast({
        "type": "mst_updated",
        "data": MSTBoxResponse.from_orm(mst).dict()
    })
    
    return mst


@router.delete("/{mst_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mst_box(mst_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an MST box"""
    mst = await db.get(MSTBox, mst_id)
    if not mst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MST box not found"
        )
    
    await db.delete(mst)
    await db.commit()
    
    # Broadcast update via WebSocket
    await manager.broadcast({
        "type": "mst_deleted",
        "data": {"id": mst_id}
    })


@router.get("/{mst_id}/capacity")
async def get_mst_capacity(mst_id: int, db: AsyncSession = Depends(get_db)):
    """Get MST box capacity utilization"""
    mst = await db.get(MSTBox, mst_id)
    if not mst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MST box not found"
        )
    
    return {
        "mst_id": mst.mst_id,
        "total_cores": mst.total_cores,
        "used_cores": mst.used_cores,
        "available_cores": mst.total_cores - mst.used_cores,
        "utilization_percentage": round((mst.used_cores / mst.total_cores) * 100, 2) if mst.total_cores > 0 else 0,
        "splitter_type": mst.splitter_type
    }