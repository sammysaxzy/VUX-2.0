from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import get_current_user
from ..models import ActivityLog, BillingPayment as BillingPaymentModel, Client, PaymentStatus
from ..schemas import BillingPayment, BillingPaymentCreate, BillingPaymentUpdate

router = APIRouter(prefix="/billing", tags=["Billing"])


def _json_safe(data: dict) -> dict:
    payload = {}
    for key, value in data.items():
        if hasattr(value, "value"):
            payload[key] = value.value
        elif isinstance(value, datetime):
            payload[key] = value.isoformat()
        else:
            payload[key] = value
    return payload


@router.get("/payments", response_model=List[BillingPayment])
async def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    status_filter: Optional[str] = Query(None, alias="status"),
    client_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(BillingPaymentModel)
    if status_filter:
        query = query.where(BillingPaymentModel.status == status_filter)
    if client_id:
        query = query.where(BillingPaymentModel.client_id == client_id)
    query = query.offset(skip).limit(limit).order_by(BillingPaymentModel.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/payments", response_model=BillingPayment, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payload: BillingPaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = await db.execute(
        select(BillingPaymentModel).where(BillingPaymentModel.payment_id == payload.payment_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Payment ID already exists")

    client = await db.get(Client, payload.client_id)
    if not client:
        raise HTTPException(status_code=400, detail="Client not found")

    payment = BillingPaymentModel(**payload.model_dump())
    db.add(payment)
    db.add(
        ActivityLog(
            action_type="billing_payment_created",
            action_description=f"Billing payment '{payment.payment_id}' created for client '{client.name}'",
            user_id=current_user.id,
            client_id=client.id,
            after_state={
                "amount": float(payment.amount),
                "status": payment.status.value if hasattr(payment.status, "value") else str(payment.status),
            },
        )
    )
    await db.commit()
    await db.refresh(payment)
    return payment


@router.put("/payments/{payment_id}", response_model=BillingPayment)
async def update_payment(
    payment_id: int,
    payload: BillingPaymentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    payment = await db.get(BillingPaymentModel, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == PaymentStatus.PAID and not update_data.get("paid_at"):
        update_data["paid_at"] = datetime.utcnow()

    for key, value in update_data.items():
        setattr(payment, key, value)

    db.add(
        ActivityLog(
            action_type="billing_payment_updated",
            action_description=f"Billing payment '{payment.payment_id}' updated",
            user_id=current_user.id,
            client_id=payment.client_id,
            after_state=_json_safe(update_data),
        )
    )
    await db.commit()
    await db.refresh(payment)
    return payment


@router.post("/payments/{payment_id}/mark-paid", response_model=BillingPayment)
async def mark_payment_paid(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    payment = await db.get(BillingPaymentModel, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    payment.status = PaymentStatus.PAID
    payment.paid_at = datetime.utcnow()

    db.add(
        ActivityLog(
            action_type="billing_payment_paid",
            action_description=f"Payment '{payment.payment_id}' marked as paid",
            user_id=current_user.id,
            client_id=payment.client_id,
        )
    )
    await db.commit()
    await db.refresh(payment)
    return payment


@router.get("/summary")
async def billing_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    total_count = await db.execute(select(func.count(BillingPaymentModel.id)))
    paid_count = await db.execute(
        select(func.count(BillingPaymentModel.id)).where(BillingPaymentModel.status == PaymentStatus.PAID)
    )
    pending_count = await db.execute(
        select(func.count(BillingPaymentModel.id)).where(BillingPaymentModel.status == PaymentStatus.PENDING)
    )
    overdue_count = await db.execute(
        select(func.count(BillingPaymentModel.id)).where(BillingPaymentModel.status == PaymentStatus.OVERDUE)
    )
    paid_revenue = await db.execute(
        select(func.sum(BillingPaymentModel.amount)).where(BillingPaymentModel.status == PaymentStatus.PAID)
    )

    return {
        "total_invoices": total_count.scalar() or 0,
        "paid": paid_count.scalar() or 0,
        "pending": pending_count.scalar() or 0,
        "overdue": overdue_count.scalar() or 0,
        "revenue_paid": float(paid_revenue.scalar() or Decimal("0")),
        "currency": "NGN",
    }
