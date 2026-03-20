from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import get_current_user
from ..models import ActivityLog, Client, Ticket as TicketModel, TicketStatus, User
from ..schemas import Ticket, TicketCreate, TicketUpdate

router = APIRouter(prefix="/tickets", tags=["Tickets"])


class AssignTicketRequest(BaseModel):
    assigned_to_user_id: int


class ResolveTicketRequest(BaseModel):
    resolution_notes: str


def _safe_ticket_update(data: dict) -> dict:
    payload = {}
    for key, value in data.items():
        if hasattr(value, "value"):
            payload[key] = value.value
        elif isinstance(value, datetime):
            payload[key] = value.isoformat()
        else:
            payload[key] = value
    return payload


@router.get("", response_model=List[Ticket])
async def list_tickets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(TicketModel)
    if status_filter:
        query = query.where(TicketModel.status == status_filter)
    if priority:
        query = query.where(TicketModel.priority == priority)
    query = query.offset(skip).limit(limit).order_by(TicketModel.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=Ticket, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = await db.execute(select(TicketModel).where(TicketModel.ticket_id == payload.ticket_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ticket ID already exists")

    if payload.client_id:
        client = await db.get(Client, payload.client_id)
        if not client:
            raise HTTPException(status_code=400, detail="Client not found")

    if payload.assigned_to_user_id:
        assignee = await db.get(User, payload.assigned_to_user_id)
        if not assignee:
            raise HTTPException(status_code=400, detail="Assigned user not found")

    ticket = TicketModel(**payload.model_dump())
    db.add(ticket)
    db.add(
        ActivityLog(
            action_type="ticket_created",
            action_description=f"Ticket '{ticket.ticket_id}' opened: {ticket.title}",
            user_id=current_user.id,
            client_id=ticket.client_id,
            after_state={
                "status": ticket.status.value if hasattr(ticket.status, "value") else str(ticket.status),
                "priority": ticket.priority.value if hasattr(ticket.priority, "value") else str(ticket.priority),
            },
        )
    )
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.put("/{ticket_id}", response_model=Ticket)
async def update_ticket(
    ticket_id: int,
    payload: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ticket = await db.get(TicketModel, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("status") == TicketStatus.RESOLVED and not ticket.resolved_at:
        ticket.resolved_at = datetime.utcnow()
    for key, value in update_data.items():
        setattr(ticket, key, value)

    db.add(
        ActivityLog(
            action_type="ticket_updated",
            action_description=f"Ticket '{ticket.ticket_id}' updated",
            user_id=current_user.id,
            client_id=ticket.client_id,
            after_state=_safe_ticket_update(update_data),
        )
    )
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/assign", response_model=Ticket)
async def assign_ticket(
    ticket_id: int,
    payload: AssignTicketRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ticket = await db.get(TicketModel, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    assignee = await db.get(User, payload.assigned_to_user_id)
    if not assignee:
        raise HTTPException(status_code=400, detail="Assigned user not found")

    ticket.assigned_to_user_id = payload.assigned_to_user_id
    if ticket.status == TicketStatus.OPEN:
        ticket.status = TicketStatus.ASSIGNED

    db.add(
        ActivityLog(
            action_type="ticket_assigned",
            action_description=f"Ticket '{ticket.ticket_id}' assigned to {assignee.username}",
            user_id=current_user.id,
            client_id=ticket.client_id,
            after_state={"assigned_to_user_id": payload.assigned_to_user_id},
        )
    )
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/resolve", response_model=Ticket)
async def resolve_ticket(
    ticket_id: int,
    payload: ResolveTicketRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ticket = await db.get(TicketModel, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = TicketStatus.RESOLVED
    ticket.resolution_notes = payload.resolution_notes
    ticket.resolved_at = datetime.utcnow()

    db.add(
        ActivityLog(
            action_type="ticket_resolved",
            action_description=f"Ticket '{ticket.ticket_id}' resolved",
            user_id=current_user.id,
            client_id=ticket.client_id,
            after_state={"resolution_notes": payload.resolution_notes},
        )
    )
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.get("/summary")
async def ticket_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    total = await db.execute(select(func.count(TicketModel.id)))
    open_count = await db.execute(select(func.count(TicketModel.id)).where(TicketModel.status == TicketStatus.OPEN))
    assigned = await db.execute(
        select(func.count(TicketModel.id)).where(TicketModel.status == TicketStatus.ASSIGNED)
    )
    in_progress = await db.execute(
        select(func.count(TicketModel.id)).where(TicketModel.status == TicketStatus.IN_PROGRESS)
    )
    resolved = await db.execute(
        select(func.count(TicketModel.id)).where(TicketModel.status == TicketStatus.RESOLVED)
    )

    return {
        "total": total.scalar() or 0,
        "open": open_count.scalar() or 0,
        "assigned": assigned.scalar() or 0,
        "in_progress": in_progress.scalar() or 0,
        "resolved": resolved.scalar() or 0,
    }
