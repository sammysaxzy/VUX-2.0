from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import get_current_user
from ..models import ActivityLog, NetworkDevice as NetworkDeviceModel
from ..schemas import NetworkDevice, NetworkDeviceCreate, NetworkDeviceUpdate

router = APIRouter(prefix="/network", tags=["Network Devices"])


@router.get("/devices", response_model=List[NetworkDevice])
async def list_devices(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(NetworkDeviceModel)
    if status_filter:
        query = query.where(NetworkDeviceModel.status == status_filter)
    query = query.offset(skip).limit(limit).order_by(NetworkDeviceModel.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/devices", response_model=NetworkDevice, status_code=status.HTTP_201_CREATED)
async def create_device(
    payload: NetworkDeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = await db.execute(
        select(NetworkDeviceModel).where(NetworkDeviceModel.device_id == payload.device_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Device ID already exists")

    device = NetworkDeviceModel(**payload.model_dump())
    db.add(device)
    db.add(
        ActivityLog(
            action_type="network_device_created",
            action_description=f"Network device '{device.name}' added",
            user_id=current_user.id,
            after_state={"device_id": device.device_id, "type": device.device_type},
        )
    )
    await db.commit()
    await db.refresh(device)
    return device


@router.put("/devices/{device_id}", response_model=NetworkDevice)
async def update_device(
    device_id: int,
    payload: NetworkDeviceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    device = await db.get(NetworkDeviceModel, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(device, key, value)
    device.last_seen = datetime.utcnow()

    db.add(
        ActivityLog(
            action_type="network_device_updated",
            action_description=f"Network device '{device.name}' updated",
            user_id=current_user.id,
            after_state={"device_id": device.device_id},
        )
    )
    await db.commit()
    await db.refresh(device)
    return device


@router.post("/devices/{device_id}/reboot")
async def reboot_device(
    device_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    device = await db.get(NetworkDeviceModel, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    device.last_seen = datetime.utcnow()
    device.status = "online"

    db.add(
        ActivityLog(
            action_type="network_device_rebooted",
            action_description=f"Device '{device.name}' reboot command issued",
            user_id=current_user.id,
            after_state={"device_id": device.device_id},
        )
    )
    await db.commit()
    await db.refresh(device)

    return {"device_id": device.id, "status": "reboot_queued", "last_seen": device.last_seen}


@router.get("/devices/{device_id}/traffic")
async def get_device_traffic(
    device_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    device = await db.get(NetworkDeviceModel, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    return {
        "device_id": device.id,
        "device_name": device.name,
        "uplink_mbps": int(device.uplink_mbps or 0),
        "downlink_mbps": int(device.downlink_mbps or 0),
        "cpu_percent": float(device.cpu_percent or 0),
        "memory_percent": float(device.memory_percent or 0),
        "timestamp": datetime.utcnow().isoformat(),
    }
