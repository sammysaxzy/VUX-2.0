from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import get_current_user_dependency as get_current_user
from ..models import (
    ActivityLog,
    BillingPayment,
    FinanceEntryType,
    FinancialTransaction,
    InventoryItem,
    PaymentStatus,
    ReferenceType,
)
from ..schemas import FinanceSummary, FinancialTransaction as FinancialTransactionSchema, FinancialTransactionCreate

router = APIRouter(prefix="/finance", tags=["Finance"])


async def _log_activity(db: AsyncSession, user_id: int, action_type: str, description: str, after_state: dict | None = None):
    db.add(
        ActivityLog(
            user_id=user_id,
            action_type=action_type,
            action_description=description,
            after_state=after_state,
        )
    )


def _build_transaction_code(prefix: str, timestamp: datetime) -> str:
    return f"{prefix}-{timestamp.strftime('%Y%m%d%H%M%S%f')}"


@router.get("/transactions", response_model=list[FinancialTransactionSchema])
async def list_financial_transactions(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(FinancialTransaction).order_by(FinancialTransaction.transaction_date.desc()).limit(250)
    )
    return result.scalars().all()


@router.post("/transactions", response_model=FinancialTransactionSchema, status_code=status.HTTP_201_CREATED)
async def create_financial_transaction(
    payload: FinancialTransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    timestamp = payload.transaction_date or datetime.utcnow()
    transaction = FinancialTransaction(
        **payload.model_dump(exclude={"transaction_date"}),
        transaction_date=timestamp,
        transaction_code=_build_transaction_code("TXN", timestamp),
        created_by_user_id=current_user.id,
    )
    db.add(transaction)
    await db.flush()
    await _log_activity(
        db,
        user_id=current_user.id,
        action_type=f"finance_{payload.entry_type.value}_created",
        description=f"{payload.entry_type.value.title()} transaction recorded: {payload.category}.",
        after_state={"transaction_id": transaction.id, "amount": str(transaction.amount)},
    )
    await db.refresh(transaction)
    return transaction


@router.post("/sync/billing-payments")
async def sync_billing_income(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    payments = await db.execute(
        select(BillingPayment).where(
            BillingPayment.status == PaymentStatus.PAID,
            BillingPayment.id.not_in(
                select(FinancialTransaction.payment_id).where(FinancialTransaction.payment_id.is_not(None))
            ),
        )
    )

    created = 0
    for payment in payments.scalars().all():
        timestamp = payment.paid_at or payment.created_at or datetime.utcnow()
        db.add(
            FinancialTransaction(
                transaction_code=_build_transaction_code("BILL", timestamp),
                entry_type=FinanceEntryType.INCOME,
                category="subscription",
                amount=payment.amount,
                description=f"Subscription payment {payment.payment_id}",
                reference_type=ReferenceType.SUBSCRIPTION,
                reference_id=payment.payment_id,
                client_id=payment.client_id,
                payment_id=payment.id,
                created_by_user_id=current_user.id,
                transaction_date=timestamp,
            )
        )
        created += 1

    if created:
        await _log_activity(
            db,
            user_id=current_user.id,
            action_type="finance_billing_synced",
            description=f"Synchronized {created} paid billing payments into finance.",
            after_state={"created_transactions": created},
        )

    return {"created": created}


@router.get("/summary", response_model=FinanceSummary)
async def get_finance_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    total_income_result = await db.execute(
        select(func.coalesce(func.sum(FinancialTransaction.amount), 0)).where(
            FinancialTransaction.entry_type == FinanceEntryType.INCOME
        )
    )
    total_expenses_result = await db.execute(
        select(func.coalesce(func.sum(FinancialTransaction.amount), 0)).where(
            FinancialTransaction.entry_type == FinanceEntryType.EXPENSE
        )
    )
    inventory_value_result = await db.execute(
        select(func.coalesce(func.sum(InventoryItem.quantity_in_stock * InventoryItem.unit_cost), 0)).where(
            InventoryItem.is_active == True
        )
    )
    now = datetime.utcnow()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_week = start_of_day - timedelta(days=start_of_day.weekday())
    start_of_month = start_of_day.replace(day=1)
    expenses_today_result = await db.execute(
        select(func.coalesce(func.sum(FinancialTransaction.amount), 0)).where(
            FinancialTransaction.entry_type == FinanceEntryType.EXPENSE,
            FinancialTransaction.transaction_date >= start_of_day,
        )
    )
    expenses_this_week_result = await db.execute(
        select(func.coalesce(func.sum(FinancialTransaction.amount), 0)).where(
            FinancialTransaction.entry_type == FinanceEntryType.EXPENSE,
            FinancialTransaction.transaction_date >= start_of_week,
        )
    )
    expenses_this_month_result = await db.execute(
        select(func.coalesce(func.sum(FinancialTransaction.amount), 0)).where(
            FinancialTransaction.entry_type == FinanceEntryType.EXPENSE,
            FinancialTransaction.transaction_date >= start_of_month,
        )
    )
    transaction_count_result = await db.execute(select(func.count(FinancialTransaction.id)))
    recent_result = await db.execute(
        select(FinancialTransaction).order_by(FinancialTransaction.transaction_date.desc()).limit(10)
    )

    total_income = Decimal(total_income_result.scalar() or 0)
    total_expenses = Decimal(total_expenses_result.scalar() or 0)
    net_profit = total_income - total_expenses

    return FinanceSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        net_profit=net_profit,
        cash_flow=net_profit,
        inventory_value=Decimal(inventory_value_result.scalar() or 0),
        transaction_count=transaction_count_result.scalar() or 0,
        recent_transactions=[FinancialTransactionSchema.model_validate(row) for row in recent_result.scalars().all()],
        expenses_today=Decimal(expenses_today_result.scalar() or 0),
        expenses_this_week=Decimal(expenses_this_week_result.scalar() or 0),
        expenses_this_month=Decimal(expenses_this_month_result.scalar() or 0),
    )
