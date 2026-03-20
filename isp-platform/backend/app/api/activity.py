from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import get_current_user
from ..models import ActivityLog
from ..schemas import ActivityLogCreate, ActivityLogResponse

router = APIRouter(prefix="/activity", tags=["Activity Logs"])


@router.get("", response_model=List[ActivityLogResponse])
async def list_activities(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    activity_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List activity logs with optional filtering."""
    query = select(ActivityLog)

    if user_id:
        query = query.where(ActivityLog.user_id == user_id)
    if activity_type:
        query = query.where(ActivityLog.action_type == activity_type)

    query = query.order_by(desc(ActivityLog.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ActivityLogResponse, status_code=status.HTTP_201_CREATED)
async def create_activity(
    activity_data: ActivityLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create an activity log entry."""
    payload = activity_data.model_dump()
    if not payload.get("user_id"):
        payload["user_id"] = current_user.id
    activity = ActivityLog(**payload)
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return activity


@router.get("/recent", response_model=List[ActivityLogResponse])
async def get_recent_activities(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get recent activities for dashboard."""
    query = select(ActivityLog).order_by(desc(ActivityLog.created_at)).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats")
async def get_activity_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get aggregate activity statistics."""
    total_result = await db.execute(select(func.count(ActivityLog.id)))
    total = total_result.scalar() or 0

    type_result = await db.execute(
        select(ActivityLog.action_type, func.count(ActivityLog.id).label("count")).group_by(
            ActivityLog.action_type
        )
    )
    by_type = {row.action_type: row.count for row in type_result}

    today = datetime.now().date()
    today_result = await db.execute(
        select(func.count(ActivityLog.id)).where(func.date(ActivityLog.created_at) == today)
    )
    today_count = today_result.scalar() or 0

    return {
        "total": total,
        "today": today_count,
        "by_type": by_type,
    }
