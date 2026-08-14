from datetime import datetime, timedelta
from datetime import datetime, timedelta
from secrets import choice
from string import ascii_letters, digits
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from ..models import (
    ActivityLog,
    BillingInvoice,
    BillingInvoiceStatus,
    BillingPayment,
    BillingReceipt,
    Client,
    CustomerPortalAccount,
    CustomerPortalNotification,
    OperationRecord,
    OperationSetting,
    PaymentProvider,
    PaymentProviderConfig,
    PaymentStatus,
    PortalNotificationSeverity,
    Ticket,
    TicketStatus,
)
from ..schemas import (
    CustomerPortalLoginRequest,
    CustomerPortalNotification as CustomerPortalNotificationSchema,
    CustomerPortalPasswordChangeRequest,
    CustomerPortalPaymentDetailed,
    CustomerPortalPaymentCreate,
    CustomerPortalPlan,
    CustomerPortalPlanChangeRequest,
    CustomerPortalProfile,
    CustomerPortalSession,
    CustomerPortalTicket,
    CustomerPortalTicketCreate,
    CustomerPortalTicketHistory,
    CustomerPortalTicketUpdateRequest,
    PortalAccessCreate,
    PortalAccessProvisionResponse,
    PortalAccessStatus,
    UsageSnapshot,
)
from ..services.payment_providers import initialize_checkout, render_invoice_html

router = APIRouter(prefix="/customer-portal", tags=["Customer Portal"])
portal_security = HTTPBearer()

DEFAULT_PORTAL_PLANS = [
    {"id": "basic-10", "name": "Basic 10Mbps", "speedMbps": 10, "priceMonthly": 8500, "description": "Starter home plan"},
    {"id": "plus-20", "name": "Plus 20Mbps", "speedMbps": 20, "priceMonthly": 12000, "description": "Streaming and work-from-home bundle", "recommended": True},
    {"id": "pro-50", "name": "Pro 50Mbps", "speedMbps": 50, "priceMonthly": 20000, "description": "Business and high-usage plan"},
    {"id": "ultra-100", "name": "Ultra 100Mbps", "speedMbps": 100, "priceMonthly": 32000, "description": "Premium SME and creator package"},
]


def _generate_password(length: int = 12) -> str:
    alphabet = ascii_letters + digits
    return "".join(choice(alphabet) for _ in range(length))


def _portal_token(account: CustomerPortalAccount) -> str:
    return create_access_token(
        {
            "sub": account.username,
            "scope": "customer_portal",
            "portal_account_id": account.id,
            "customer_id": account.customer_id,
            "tenant_id": account.tenant_id,
        },
        expires_delta=timedelta(hours=12),
    )


async def _load_portal_account(
    credentials: HTTPAuthorizationCredentials = Depends(portal_security),
    db: AsyncSession = Depends(get_db),
) -> CustomerPortalAccount:
    from ..core.security import decode_access_token

    payload = decode_access_token(credentials.credentials)
    if payload is None or payload.get("scope") != "customer_portal":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid portal credentials")

    account_id = payload.get("portal_account_id")
    customer_id = payload.get("customer_id")
    if not account_id or not customer_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Portal session is invalid")

    account = await db.get(CustomerPortalAccount, int(account_id))
    if not account or account.customer_id != customer_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Portal account not found")
    if not account.portal_access_enabled or not account.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Portal access is disabled")
    return account


def _map_payment_status(status_value: PaymentStatus) -> str:
    if status_value == PaymentStatus.PAID:
        return "success"
    if status_value == PaymentStatus.OVERDUE:
        return "failed"
    return "pending"


def _map_ticket_status(ticket: Ticket) -> str:
    if ticket.status == TicketStatus.IN_PROGRESS:
        return "in_progress"
    if ticket.status == TicketStatus.RESOLVED:
        return "resolved"
    if ticket.status == TicketStatus.ASSIGNED:
        return "in_progress"
    return "open"


def _portal_status_from_client(client: Client) -> str:
    return "active" if str(client.status.value if hasattr(client.status, "value") else client.status) == "active" else "suspended"


def _build_profile(client: Client, latest_payment: Optional[BillingPayment]) -> CustomerPortalProfile:
    speed = client.speed_download or 0
    expiry_date = latest_payment.due_date if latest_payment else None
    return CustomerPortalProfile(
        id=client.client_id,
        name=client.name,
        pppoeUsername=client.pppoe_username or client.client_id,
        planName=client.assigned_plan or "Unassigned plan",
        speedMbps=speed,
        status=_portal_status_from_client(client),
        expiryDate=expiry_date,
        usageGb=round((client.uptime_seconds or 0) / 3600 * max(speed, 1) / 200, 2),
        capGb=max(speed, 10) * 15 if speed else None,
    )


async def _add_portal_notification(
    db: AsyncSession,
    account: CustomerPortalAccount,
    title: str,
    message: str,
    severity: PortalNotificationSeverity = PortalNotificationSeverity.INFO,
) -> None:
    db.add(
        CustomerPortalNotification(
            tenant_id=account.tenant_id,
            portal_account_id=account.id,
            client_id=account.client_id,
            title=title,
            message=message,
            severity=severity,
        )
    )


def _append_activity_log(
    db: AsyncSession,
    user_id: Optional[int],
    action_type: str,
    action_description: str,
    client_id: Optional[int] = None,
    after_state: Optional[dict] = None,
) -> None:
    if not user_id:
        return
    db.add(
        ActivityLog(
            action_type=action_type,
            action_description=action_description,
            user_id=user_id,
            client_id=client_id,
            after_state=after_state,
        )
    )


async def _require_customer_access(
    customer_id: str,
    account: CustomerPortalAccount = Depends(_load_portal_account),
) -> CustomerPortalAccount:
    if account.customer_id != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer data access denied")
    return account


@router.post("/access", response_model=PortalAccessProvisionResponse, status_code=status.HTTP_201_CREATED)
async def create_or_reset_portal_access(
    payload: PortalAccessCreate,
    x_tenant_id: Optional[str] = Header(default=None, alias="x-tenant-id"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tenant_id = x_tenant_id or getattr(current_user, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant ID is required")

    client_result = await db.execute(select(Client).where(Client.client_id == payload.customer_id))
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    requested_username = (payload.username or client.pppoe_username or client.client_id).strip()
    account_result = await db.execute(
        select(CustomerPortalAccount).where(
            CustomerPortalAccount.tenant_id == tenant_id,
            CustomerPortalAccount.customer_id == payload.customer_id,
        )
    )
    account = account_result.scalar_one_or_none()

    username_conflict = await db.execute(
        select(CustomerPortalAccount).where(
            CustomerPortalAccount.username == requested_username,
            CustomerPortalAccount.customer_id != payload.customer_id,
        )
    )
    if username_conflict.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Portal username already exists")

    temporary_password = payload.temporary_password or _generate_password()
    if account is None:
        account = CustomerPortalAccount(
            tenant_id=tenant_id,
            customer_id=client.client_id,
            client_id=client.id,
            username=requested_username,
            hashed_password=get_password_hash(temporary_password),
            email=payload.email or client.email,
            phone=payload.phone or client.phone,
            created_by_user_id=current_user.id,
        )
        db.add(account)
        await db.flush()
        _append_activity_log(
            db,
            current_user.id,
            "portal_account_created",
            f"Customer portal access created for '{client.name}'",
            client.id,
            {"customer_id": client.client_id, "username": requested_username},
        )
    else:
        account.username = requested_username
        account.email = payload.email or client.email
        account.phone = payload.phone or client.phone
        account.hashed_password = get_password_hash(temporary_password)
        account.portal_access_enabled = True
        account.is_active = True
        account.first_login_required = True
        account.password_reset_required = False
        account.failed_login_attempts = 0
        account.locked_until = None
        _append_activity_log(
            db,
            current_user.id,
            "portal_account_reset",
            f"Customer portal access reset for '{client.name}'",
            client.id,
            {"customer_id": client.client_id, "username": requested_username},
        )

    await _add_portal_notification(
        db,
        account,
        "Portal access ready",
        "Your ISP has enabled customer portal access. Use the temporary password shared by the ISP and change it at first login.",
        PortalNotificationSeverity.INFO,
    )
    await db.commit()
    await db.refresh(account)

    return PortalAccessProvisionResponse(
        customer_id=account.customer_id,
        username=account.username,
        email=account.email,
        phone=account.phone,
        is_active=account.is_active,
        portal_access_enabled=account.portal_access_enabled,
        first_login_required=account.first_login_required,
        password_reset_required=account.password_reset_required,
        last_login=account.last_login,
        created_at=account.created_at,
        temporary_password=temporary_password,
    )


@router.get("/access/{customer_id}", response_model=PortalAccessStatus)
async def get_portal_access_status(
    customer_id: str,
    x_tenant_id: Optional[str] = Header(default=None, alias="x-tenant-id"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tenant_id = x_tenant_id or getattr(current_user, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant ID is required")

    result = await db.execute(
        select(CustomerPortalAccount).where(
            CustomerPortalAccount.tenant_id == tenant_id,
            CustomerPortalAccount.customer_id == customer_id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portal access not found")

    return PortalAccessStatus(
        customer_id=account.customer_id,
        username=account.username,
        email=account.email,
        phone=account.phone,
        is_active=account.is_active,
        portal_access_enabled=account.portal_access_enabled,
        first_login_required=account.first_login_required,
        password_reset_required=account.password_reset_required,
        last_login=account.last_login,
        created_at=account.created_at,
    )


@router.post("/login", response_model=CustomerPortalSession)
async def customer_portal_login(
    payload: CustomerPortalLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    query = select(CustomerPortalAccount).where(
        or_(
            CustomerPortalAccount.username == payload.identity,
            CustomerPortalAccount.customer_id == payload.identity,
        )
    )
    if payload.tenant_id:
        query = query.where(CustomerPortalAccount.tenant_id == payload.tenant_id)

    result = await db.execute(query)
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Portal credentials are invalid")
    if account.locked_until and account.locked_until > datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Portal account is temporarily locked")
    if not account.portal_access_enabled or not account.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Portal access is disabled")
    if not verify_password(payload.password, account.hashed_password):
        account.failed_login_attempts += 1
        if account.failed_login_attempts >= 5:
            account.locked_until = datetime.utcnow() + timedelta(minutes=15)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Portal credentials are invalid")

    account.failed_login_attempts = 0
    account.locked_until = None
    account.last_login = datetime.utcnow()
    await db.commit()

    return CustomerPortalSession(
        access_token=_portal_token(account),
        customer_id=account.customer_id,
        tenant_id=account.tenant_id,
        username=account.username,
        first_login_required=account.first_login_required or account.password_reset_required,
    )


@router.post("/change-password")
async def change_portal_password(
    payload: CustomerPortalPasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_load_portal_account),
):
    if not verify_password(payload.current_password, account.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    account.hashed_password = get_password_hash(payload.new_password)
    account.first_login_required = False
    account.password_reset_required = False
    await _add_portal_notification(
        db,
        account,
        "Password changed",
        "Your customer portal password was changed successfully.",
        PortalNotificationSeverity.INFO,
    )
    await db.commit()
    return {"success": True}


@router.get("/plans", response_model=List[CustomerPortalPlan])
async def list_customer_portal_plans(
    account: CustomerPortalAccount = Depends(_load_portal_account),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(OperationSetting).where(OperationSetting.setting_key == f"portal_plans:{account.tenant_id}")
    )
    setting = result.scalar_one_or_none()
    plan_payload = setting.payload if setting and isinstance(setting.payload, list) else DEFAULT_PORTAL_PLANS
    return [CustomerPortalPlan(**plan) for plan in plan_payload]


@router.get("/{customer_id}/profile", response_model=CustomerPortalProfile)
async def get_customer_portal_profile(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_require_customer_access),
):
    client = await db.get(Client, account.client_id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    payment_result = await db.execute(
        select(BillingPayment)
        .where(BillingPayment.client_id == client.id)
        .order_by(BillingPayment.created_at.desc())
    )
    latest_payment = payment_result.scalars().first()
    return _build_profile(client, latest_payment)


@router.get("/{customer_id}/tickets", response_model=List[CustomerPortalTicket])
async def get_customer_portal_tickets(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_require_customer_access),
):
    result = await db.execute(
        select(Ticket).where(Ticket.client_id == account.client_id).order_by(Ticket.created_at.desc())
    )
    tickets = result.scalars().all()
    return [
        CustomerPortalTicket(
            id=ticket.ticket_id,
            subject=ticket.title,
            description=ticket.description,
            category=ticket.category,
            status=_map_ticket_status(ticket),
            createdAt=ticket.opened_at,
            updatedAt=ticket.updated_at or ticket.created_at or ticket.opened_at,
            history=[
                CustomerPortalTicketHistory(
                    id=f"{ticket.ticket_id}-created",
                    message=ticket.resolution_notes or "Ticket submitted and awaiting support review.",
                    createdAt=ticket.updated_at or ticket.created_at or ticket.opened_at,
                    author="Support",
                )
            ],
        )
        for ticket in tickets
    ]


@router.post("/{customer_id}/tickets", response_model=CustomerPortalTicket, status_code=status.HTTP_201_CREATED)
async def create_customer_portal_ticket(
    customer_id: str,
    payload: CustomerPortalTicketCreate,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_require_customer_access),
):
    ticket = Ticket(
        ticket_id=f"TKT-{int(datetime.utcnow().timestamp())}",
        title=payload.subject,
        description=payload.description,
        category=payload.category,
        client_id=account.client_id,
    )
    db.add(ticket)
    _append_activity_log(
        db,
        account.created_by_user_id,
        "portal_ticket_created",
        f"Portal ticket '{ticket.ticket_id}' created by customer",
        account.client_id,
        {"category": payload.category},
    )
    await db.flush()
    await _add_portal_notification(
        db,
        account,
        "Support ticket created",
        f"Your complaint '{payload.subject}' has been logged under reference {ticket.ticket_id}.",
        PortalNotificationSeverity.WARNING,
    )
    await db.commit()
    await db.refresh(ticket)

    return CustomerPortalTicket(
        id=ticket.ticket_id,
        subject=ticket.title,
        description=ticket.description,
        category=ticket.category,
        status="open",
        createdAt=ticket.opened_at,
        updatedAt=ticket.updated_at or ticket.created_at or ticket.opened_at,
        history=[
            CustomerPortalTicketHistory(
                id=f"{ticket.ticket_id}-created",
                message="Ticket created by customer.",
                createdAt=ticket.opened_at,
                author="Customer",
            )
        ],
    )


@router.patch("/{customer_id}/tickets/{ticket_id}", response_model=CustomerPortalTicket)
async def update_customer_portal_ticket(
    customer_id: str,
    ticket_id: str,
    payload: CustomerPortalTicketUpdateRequest,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_require_customer_access),
):
    result = await db.execute(
        select(Ticket).where(Ticket.client_id == account.client_id, Ticket.ticket_id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    requested_status = payload.status.lower()
    if requested_status in {"resolved", "closed"}:
        ticket.status = TicketStatus.RESOLVED
        ticket.resolved_at = datetime.utcnow()
    elif requested_status == "in_progress":
        ticket.status = TicketStatus.IN_PROGRESS
    else:
        ticket.status = TicketStatus.OPEN

    if payload.note:
        ticket.resolution_notes = payload.note

    await db.commit()
    await db.refresh(ticket)

    return CustomerPortalTicket(
        id=ticket.ticket_id,
        subject=ticket.title,
        description=ticket.description,
        category=ticket.category,
        status=_map_ticket_status(ticket),
        createdAt=ticket.opened_at,
        updatedAt=ticket.updated_at or ticket.created_at or ticket.opened_at,
        history=[
            CustomerPortalTicketHistory(
                id=f"{ticket.ticket_id}-update",
                message=payload.note or f"Ticket marked {payload.status}",
                createdAt=ticket.updated_at or ticket.created_at or ticket.opened_at,
                author="Customer",
            )
        ],
    )


@router.get("/{customer_id}/notifications", response_model=List[CustomerPortalNotificationSchema])
async def get_customer_portal_notifications(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_require_customer_access),
):
    result = await db.execute(
        select(CustomerPortalNotification)
        .where(CustomerPortalNotification.portal_account_id == account.id)
        .order_by(CustomerPortalNotification.created_at.desc())
    )
    notifications = result.scalars().all()
    return [
        CustomerPortalNotificationSchema(
            id=str(item.id),
            title=item.title,
            message=item.message,
            severity=item.severity.value if hasattr(item.severity, "value") else str(item.severity),
            createdAt=item.created_at,
            read=item.is_read,
        )
        for item in notifications
    ]


@router.get("/{customer_id}/payments", response_model=List[CustomerPortalPaymentDetailed])
async def get_customer_portal_payments(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_require_customer_access),
):
    client = await db.get(Client, account.client_id)
    result = await db.execute(
        select(BillingPayment).where(BillingPayment.client_id == account.client_id).order_by(BillingPayment.created_at.desc())
    )
    payments = result.scalars().all()
    invoices_result = await db.execute(select(BillingInvoice).where(BillingInvoice.client_id == account.client_id))
    invoices = {invoice.payment_id: invoice for invoice in invoices_result.scalars().all()}
    receipts_result = await db.execute(select(BillingReceipt).where(BillingReceipt.client_id == account.client_id))
    receipts = {receipt.payment_id: receipt for receipt in receipts_result.scalars().all()}
    return [
        CustomerPortalPaymentDetailed(
            id=payment.payment_id,
            amount=float(payment.amount),
            status=_map_payment_status(payment.status),
            reference=payment.invoice_reference or payment.payment_id,
            createdAt=payment.created_at,
            method=payment.payment_method,
            planName=client.assigned_plan if client and client.assigned_plan else "Subscription",
            invoice_number=invoices.get(payment.id).invoice_number if invoices.get(payment.id) else None,
            provider=payment.payment_method,
            receipt_number=receipts.get(payment.id).receipt_number if receipts.get(payment.id) else None,
        )
        for payment in payments
    ]


@router.post("/{customer_id}/payments", response_model=CustomerPortalPaymentDetailed, status_code=status.HTTP_201_CREATED)
async def create_customer_portal_payment(
    customer_id: str,
    payload: CustomerPortalPaymentCreate,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_require_customer_access),
):
    client = await db.get(Client, account.client_id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    plans_result = await db.execute(
        select(OperationSetting).where(OperationSetting.setting_key == f"portal_plans:{account.tenant_id}")
    )
    plans_setting = plans_result.scalar_one_or_none()
    plans_payload = plans_setting.payload if plans_setting and isinstance(plans_setting.payload, list) else DEFAULT_PORTAL_PLANS
    plan = next((entry for entry in plans_payload if entry.get("id") == payload.planId), None)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    provider_values = {provider.value for provider in PaymentProvider}
    provider_enum = PaymentProvider(payload.method) if payload.method in provider_values else PaymentProvider.MANUAL
    invoice_number = f"INV-{account.customer_id}-{int(datetime.utcnow().timestamp())}"
    payment = BillingPayment(
        payment_id=f"PAY-{int(datetime.utcnow().timestamp())}",
        client_id=client.id,
        amount=plan["priceMonthly"],
        currency="NGN",
        status=PaymentStatus.PENDING,
        payment_method=payload.method,
        due_date=datetime.utcnow() + timedelta(days=7),
        invoice_reference=invoice_number,
        notes="Customer portal payment request created. Awaiting provider verification webhook integration.",
    )
    db.add(payment)
    await db.flush()
    invoice = BillingInvoice(
        invoice_number=invoice_number,
        tenant_id=account.tenant_id,
        client_id=client.id,
        payment_id=payment.id,
        plan_name=plan["name"],
        amount=payment.amount,
        currency=payment.currency,
        status=BillingInvoiceStatus.ISSUED,
        balance=payment.amount,
        due_date=payment.due_date,
        billing_period_start=datetime.utcnow(),
        billing_period_end=datetime.utcnow() + timedelta(days=30),
        line_items=[
            {
                "description": f"{plan['name']} subscription",
                "quantity": 1,
                "amount": float(payment.amount),
            }
        ],
    )
    invoice.notes = "Portal-generated invoice awaiting verified settlement."
    db.add(invoice)
    await db.flush()

    _append_activity_log(
        db,
        account.created_by_user_id,
        "portal_payment_created",
        f"Portal payment request '{payment.payment_id}' created for '{client.name}'",
        client.id,
        {"plan": plan["name"], "method": payload.method, "amount": plan["priceMonthly"]},
    )
    await _add_portal_notification(
        db,
        account,
        "Payment request created",
        f"A pending payment request for {plan['name']} has been created with invoice {invoice.invoice_number}.",
        PortalNotificationSeverity.INFO,
    )
    config_result = await db.execute(
        select(PaymentProviderConfig).where(
            PaymentProviderConfig.tenant_id == account.tenant_id,
            PaymentProviderConfig.provider == provider_enum,
            PaymentProviderConfig.enabled == True,
        )
    )
    provider_config = config_result.scalar_one_or_none()
    checkout = {
        "checkout_url": None,
        "access_code": None,
    }
    if provider_config:
        checkout = await initialize_checkout(provider_config, payment, client, invoice.invoice_number)
    await db.commit()
    await db.refresh(payment)

    return CustomerPortalPaymentDetailed(
        id=payment.payment_id,
        amount=float(payment.amount),
        status="pending",
        reference=payment.invoice_reference or payment.payment_id,
        createdAt=payment.created_at,
        method=payment.payment_method,
        planName=plan["name"],
        invoice_number=invoice.invoice_number,
        provider=provider_enum.value,
        checkout_url=checkout.get("checkout_url"),
        access_code=checkout.get("access_code"),
    )


@router.post("/{customer_id}/upgrade", response_model=CustomerPortalProfile)
async def request_customer_plan_change(
    customer_id: str,
    payload: CustomerPortalPlanChangeRequest,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_require_customer_access),
):
    client = await db.get(Client, account.client_id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    operation = OperationRecord(
        module="customer_portal_plan_change",
        record_key=f"plan-change-{account.customer_id}-{int(datetime.utcnow().timestamp())}",
        title=f"Plan change request for {client.name}",
        status="pending_review",
        client_id=client.id,
        created_by_user_id=account.created_by_user_id,
        updated_by_user_id=account.created_by_user_id,
        payload={"requested_plan_id": payload.planId, "source": "customer_portal"},
    )
    db.add(operation)
    await _add_portal_notification(
        db,
        account,
        "Plan change request submitted",
        "Your plan change request has been sent to the ISP for billing and service approval.",
        PortalNotificationSeverity.INFO,
    )
    await db.commit()

    latest_payment_result = await db.execute(
        select(BillingPayment).where(BillingPayment.client_id == client.id).order_by(BillingPayment.created_at.desc())
    )
    latest_payment = latest_payment_result.scalars().first()
    return _build_profile(client, latest_payment)


@router.get("/{customer_id}/usage", response_model=List[UsageSnapshot])
async def get_customer_portal_usage(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_require_customer_access),
):
    client = await db.get(Client, account.client_id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    speed = client.speed_download or 0
    return [
        UsageSnapshot(
            month=datetime.utcnow().strftime("%Y-%m"),
            usedGb=round((client.uptime_seconds or 0) / 3600 * max(speed, 1) / 200, 2),
            capGb=max(speed, 10) * 15 if speed else None,
        )
    ]
