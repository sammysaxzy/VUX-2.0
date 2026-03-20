from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from datetime import datetime
from ..core.database import get_db
from ..models.models import ActivityLog
from ..schemas.schemas import ActivityLogCreate, ActivityLogResponse

router = APIRouter(prefix="/activity", tags=["Activity Logs"])


@router.get("", response_model=List[ActivityLogResponse])
async def list_activities(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    activity_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List activity logs with optional filtering"""
    query = select(ActivityLog)
    
    if user_id:
        query = query.where(ActivityLog.user_id == user_id)
    if activity_type:
        query = query.where(ActivityLog.activity_type == activity_type)
    
    query = query.order_by(desc(ActivityLog.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ActivityLogResponse, status_code=status.HTTP_201_CREATED)
async def create_activity(
    activity_data: ActivityLogCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new activity log entry"""
    activity = ActivityLog(**activity_data.dict())
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return activity


@router.get("/recent", response_model=List[ActivityLogResponse])
async def get_recent_activities(
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Get most recent activities for dashboard"""
    query = select(ActivityLog).order_by(desc(ActivityLog.created_at)).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats")
async def get_activity_stats(db: AsyncSession = Depends(get_db)):
    """Get activity statistics for dashboard"""
    from sqlalchemy import func
    
    # Total activities
    total_query = select(func.count(ActivityLog.id))
    total_result = await db.execute(total_query)
    total = total_result.scalar()
    
    # Activities by type
    type_query = select(
        ActivityLog.activity_type,
        func.count(ActivityLog.id).label("count")
    ).group_by(ActivityLog.activity_type)
    type_result = await db.execute(type_query)
    by_type = {row.activity_type: row.count for row in type_result}
    
    # Activities today
    today = datetime.now().date()
    today_query = select(func.count(ActivityLog.id)).where(
        func.date(ActivityLog.created_at) == today
    )
    today_result = await db.execute(today_query)
    today_count = today_result.scalar()
    
    return {
        "total": total,
        "today": today_count,
        "by_type": by_type
    }