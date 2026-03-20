from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from ..core.database import get_db
from ..models import MSTBox, Client
from ..schemas import MSTBoxCreate, MSTBoxUpdate, MSTBoxResponse, MSTBoxDetail
from ..core.security import get_current_user
from ..websocket.manager import manager

router = APIRouter(prefix="/mst", tags=["MST Boxes"])


def _splitter_to_total_ports(splitter_type: str) -> int:
    try:
        return int(str(splitter_type).split("/")[-1])
    except Exception:
        return 8


def _capacity_status(used_ports: int, total_ports: int) -> str:
    if total_ports <= 0:
        return "available"
    utilization = used_ports / total_ports
    if utilization >= 1:
        return "full"
    if utilization >= 0.8:
        return "nearly_full"
    return "available"


@router.get("", response_model=List[MSTBoxResponse])
async def list_mst_boxes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List MST boxes with optional capacity-status filter."""
    query = select(MSTBox)

    if status:
        query = query.where(MSTBox.capacity_status == status)

    query = query.offset(skip).limit(limit).order_by(MSTBox.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/map", response_model=List[MSTBoxResponse])
async def get_mst_for_map(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get all MST boxes with coordinates for map display."""
    query = select(MSTBox).where(MSTBox.latitude.isnot(None), MSTBox.longitude.isnot(None))
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{mst_id}", response_model=MSTBoxDetail)
async def get_mst_box(
    mst_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get one MST box and connected clients."""
    mst = await db.get(MSTBox, mst_id)
    if not mst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MST box not found",
        )

    clients_result = await db.execute(select(Client).where(Client.mst_id == mst_id))
    clients = clients_result.scalars().all()

    payload = MSTBoxDetail.model_validate(mst).model_dump()
    payload["clients"] = clients
    payload["available_ports"] = max(mst.total_ports - mst.used_ports, 0)
    return MSTBoxDetail.model_validate(payload)


@router.post("", response_model=MSTBoxResponse, status_code=status.HTTP_201_CREATED)
async def create_mst_box(
    mst_data: MSTBoxCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new MST box."""
    existing = await db.execute(select(MSTBox).where(MSTBox.mst_id == mst_data.mst_id))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MST ID already exists",
        )

    mst_dict = mst_data.model_dump()
    splitter_type = str(mst_dict.get("splitter_type") or "1/8")
    total_ports = _splitter_to_total_ports(splitter_type)
    mst_dict["total_ports"] = total_ports
    mst_dict["used_ports"] = 0
    mst_dict["capacity_status"] = _capacity_status(0, total_ports)

    mst = MSTBox(**mst_dict)
    db.add(mst)
    await db.commit()
    await db.refresh(mst)

    await manager.broadcast(
        {
            "type": "mst_created",
            "data": MSTBoxResponse.model_validate(mst).model_dump(mode="json"),
        }
    )

    return mst


@router.put("/{mst_id}", response_model=MSTBoxResponse)
async def update_mst_box(
    mst_id: int,
    mst_data: MSTBoxUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update MST details."""
    mst = await db.get(MSTBox, mst_id)
    if not mst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MST box not found",
        )

    update_data = mst_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(mst, field, value)

    if "splitter_type" in update_data:
        mst.total_ports = _splitter_to_total_ports(str(mst.splitter_type))
        if mst.used_ports > mst.total_ports:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Used ports exceed splitter capacity",
            )

    mst.capacity_status = _capacity_status(mst.used_ports or 0, mst.total_ports or 0)

    await db.commit()
    await db.refresh(mst)

    await manager.broadcast(
        {
            "type": "mst_updated",
            "data": MSTBoxResponse.model_validate(mst).model_dump(mode="json"),
        }
    )

    return mst


@router.delete("/{mst_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mst_box(
    mst_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete MST if no client is attached."""
    mst = await db.get(MSTBox, mst_id)
    if not mst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MST box not found",
        )

    linked_client = await db.execute(select(Client).where(Client.mst_id == mst_id).limit(1))
    if linked_client.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete MST with connected clients",
        )

    await db.delete(mst)
    await db.commit()

    await manager.broadcast(
        {
            "type": "mst_deleted",
            "data": {"id": mst_id},
        }
    )


@router.get("/{mst_id}/capacity")
async def get_mst_capacity(
    mst_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get MST port utilization."""
    mst = await db.get(MSTBox, mst_id)
    if not mst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MST box not found",
        )

    return {
        "mst_id": mst.mst_id,
        "total_ports": mst.total_ports,
        "used_ports": mst.used_ports,
        "available_ports": max(mst.total_ports - mst.used_ports, 0),
        "utilization_percentage": round(
            (mst.used_ports / mst.total_ports) * 100, 2
        )
        if mst.total_ports
        else 0,
        "splitter_type": str(mst.splitter_type),
        "capacity_status": mst.capacity_status,
    }
