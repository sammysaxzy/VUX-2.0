import json
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import HTMLResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import decode_access_token, get_current_user
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
    PaymentProvider,
    PaymentProviderConfig,
    PaymentStatus,
    PaymentWebhookEvent,
    PortalNotificationSeverity,
)
from ..schemas import (
    ActivationQueueRecord,
    ActivationRetryResponse,
    PaymentProviderConfig as PaymentProviderConfigSchema,
    PaymentProviderConfigCreate,
    PaymentWebhookProcessResponse,
)
from ..services.payment_providers import (
    build_activation_payload,
    dispatch_service_activation,
    render_invoice_html,
    render_invoice_pdf,
    render_receipt_html,
    render_receipt_pdf,
    verify_provider_transaction,
    verify_webhook_signature,
)

router = APIRouter(prefix="/payment-gateway", tags=["Payment Gateway"])
portal_security = HTTPBearer()


async def _load_portal_account(
    credentials: HTTPAuthorizationCredentials = Depends(portal_security),
    db: AsyncSession = Depends(get_db),
) -> CustomerPortalAccount:
    payload = decode_access_token(credentials.credentials)
    if payload is None or payload.get("scope") != "customer_portal":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid portal credentials")
    account = await db.get(CustomerPortalAccount, int(payload.get("portal_account_id", 0)))
    if not account:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Portal account not found")
    return account


def _provider_from_string(value: str) -> PaymentProvider:
    try:
        return PaymentProvider(value.lower())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Unsupported payment provider") from exc


def _reference_from_payload(provider: PaymentProvider, payload: dict) -> Optional[str]:
    data = payload.get("data", {}) if isinstance(payload, dict) else {}
    if provider == PaymentProvider.PAYSTACK:
        return data.get("reference")
    return data.get("tx_ref") or data.get("flw_ref")


async def _issue_receipt(
    db: AsyncSession,
    invoice: BillingInvoice,
    payment: BillingPayment,
    client: Client,
    tenant_name: str,
) -> BillingReceipt:
    existing = await db.execute(select(BillingReceipt).where(BillingReceipt.invoice_id == invoice.id))
    receipt = existing.scalar_one_or_none()
    if receipt:
        return receipt

    receipt = BillingReceipt(
        receipt_number=f"RCT-{invoice.invoice_number}",
        tenant_id=invoice.tenant_id,
        client_id=client.id,
        invoice_id=invoice.id,
        payment_id=payment.id,
        amount=payment.amount,
        currency=payment.currency,
        payment_method=payment.payment_method,
        payment_reference=payment.invoice_reference or payment.payment_id,
    )
    receipt.rendered_html = render_receipt_html(receipt, invoice, client, tenant_name)
    db.add(receipt)
    await db.flush()
    return receipt


async def _resolve_branding(db: AsyncSession, tenant_id: str) -> dict:
    config_result = await db.execute(
        select(PaymentProviderConfig)
        .where(PaymentProviderConfig.tenant_id == tenant_id)
        .order_by(desc(PaymentProviderConfig.updated_at))
    )
    config = config_result.scalars().first()
    return config.receipt_branding if config and config.receipt_branding else {}


def _update_activation_record(record: OperationRecord, result) -> None:
    payload = dict(record.payload or {})
    attempts = int(payload.get("attempt_count", 0)) + 1
    payload["attempt_count"] = attempts
    payload["last_attempt_at"] = datetime.utcnow().isoformat()
    payload["last_error"] = None if result.success else result.message
    payload["external_reference"] = result.external_reference or payload.get("external_reference")
    payload["activation_response"] = result.response_payload or {"message": result.message}
    record.status = result.status
    record.payload = payload


async def _finalize_verified_payment(
    db: AsyncSession,
    invoice: BillingInvoice,
    payment: BillingPayment,
    config: PaymentProviderConfig,
    verification_currency: str,
    verification_amount: Decimal,
) -> BillingReceipt:
    if payment.status == PaymentStatus.PAID and invoice.status == BillingInvoiceStatus.PAID:
        existing = await db.execute(select(BillingReceipt).where(BillingReceipt.invoice_id == invoice.id))
        receipt = existing.scalar_one_or_none()
        if receipt:
            return receipt

    if Decimal(payment.amount) != verification_amount:
        raise HTTPException(status_code=400, detail="Verified amount does not match payment request")
    if payment.currency != verification_currency:
        raise HTTPException(status_code=400, detail="Verified currency does not match payment request")

    client = await db.get(Client, payment.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Customer not found")

    payment.status = PaymentStatus.PAID
    payment.paid_at = datetime.utcnow()
    invoice.status = BillingInvoiceStatus.PAID
    invoice.paid_at = datetime.utcnow()
    invoice.balance = Decimal("0")

    branding = config.receipt_branding or {}
    tenant_name = branding.get("display_name") or invoice.tenant_id
    invoice.notes = (invoice.notes or "") + "\nVerified via provider webhook."
    receipt = await _issue_receipt(db, invoice, payment, client, tenant_name)
    receipt.rendered_html = render_receipt_html(receipt, invoice, client, tenant_name, branding)

    account_result = await db.execute(
        select(CustomerPortalAccount).where(
            CustomerPortalAccount.client_id == client.id,
            CustomerPortalAccount.tenant_id == invoice.tenant_id,
        )
    )
    account = account_result.scalar_one_or_none()
    if account:
        db.add(
            CustomerPortalNotification(
                tenant_id=invoice.tenant_id,
                portal_account_id=account.id,
                client_id=client.id,
                title="Payment verified",
                message=f"Your payment for invoice {invoice.invoice_number} has been verified successfully.",
                severity=PortalNotificationSeverity.INFO,
            )
        )

    if config.automatic_activation:
        activation_key = f"service-activation-{invoice.invoice_number}"
        existing_activation = await db.execute(
            select(OperationRecord).where(OperationRecord.record_key == activation_key)
        )
        activation_record = existing_activation.scalar_one_or_none()
        if not activation_record:
            activation_record = OperationRecord(
                module="service_activation",
                record_key=activation_key,
                title=f"Activation pending for {client.name}",
                status="pending",
                client_id=client.id,
                payload=build_activation_payload(client, payment, invoice),
            )
            db.add(activation_record)
            await db.flush()
        dispatch_result = await dispatch_service_activation(activation_record)
        _update_activation_record(activation_record, dispatch_result)

    if account and account.created_by_user_id:
        db.add(
            ActivityLog(
                action_type="payment_verified",
                action_description=f"Payment '{payment.payment_id}' verified for invoice '{invoice.invoice_number}'",
                user_id=account.created_by_user_id,
                client_id=client.id,
                after_state={"invoice_number": invoice.invoice_number, "provider": config.provider.value},
            )
        )
    await db.flush()
    receipt.rendered_html = render_receipt_html(receipt, invoice, client, tenant_name, branding)
    return receipt


@router.get("/configs", response_model=List[PaymentProviderConfigSchema])
async def list_payment_provider_configs(
    x_tenant_id: Optional[str] = Header(default=None, alias="x-tenant-id"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tenant_id = x_tenant_id or getattr(current_user, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID is required")
    result = await db.execute(select(PaymentProviderConfig).where(PaymentProviderConfig.tenant_id == tenant_id))
    return result.scalars().all()


@router.post("/configs", response_model=PaymentProviderConfigSchema)
async def upsert_payment_provider_config(
    payload: PaymentProviderConfigCreate,
    x_tenant_id: Optional[str] = Header(default=None, alias="x-tenant-id"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tenant_id = x_tenant_id or getattr(current_user, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID is required")

    provider = _provider_from_string(payload.provider)
    result = await db.execute(
        select(PaymentProviderConfig).where(
            PaymentProviderConfig.tenant_id == tenant_id,
            PaymentProviderConfig.provider == provider,
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        config = PaymentProviderConfig(tenant_id=tenant_id, provider=provider)
        db.add(config)

    for key, value in payload.model_dump().items():
        if key == "provider":
            setattr(config, key, provider)
        else:
            setattr(config, key, value)

    await db.commit()
    await db.refresh(config)
    return config


@router.post("/webhooks/{provider}", response_model=PaymentWebhookProcessResponse)
async def process_payment_webhook(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    provider_enum = _provider_from_string(provider)
    raw_body = await request.body()
    try:
        payload = json.loads(raw_body.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook payload") from exc

    reference = _reference_from_payload(provider_enum, payload)
    if not reference:
        raise HTTPException(status_code=400, detail="Payment reference not found in webhook")

    invoice_result = await db.execute(select(BillingInvoice).where(BillingInvoice.invoice_number == reference))
    invoice = invoice_result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found for webhook reference")

    config_result = await db.execute(
        select(PaymentProviderConfig).where(
            PaymentProviderConfig.tenant_id == invoice.tenant_id,
            PaymentProviderConfig.provider == provider_enum,
        )
    )
    config = config_result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Provider configuration not found")

    signature = (
        request.headers.get("x-paystack-signature")
        if provider_enum == PaymentProvider.PAYSTACK
        else request.headers.get("verif-hash")
    )
    signature_valid = verify_webhook_signature(provider_enum, raw_body, signature, config)
    payment = await db.get(BillingPayment, invoice.payment_id) if invoice.payment_id else None

    webhook_event = PaymentWebhookEvent(
        tenant_id=invoice.tenant_id,
        provider=provider_enum,
        payment_id=payment.id if payment else None,
        event_reference=reference,
        event_type=payload.get("event"),
        signature_valid=signature_valid,
        payload=payload,
    )
    db.add(webhook_event)
    await db.flush()

    if not signature_valid:
        await db.commit()
        raise HTTPException(status_code=400, detail="Webhook signature verification failed")
    if not payment:
        await db.commit()
        raise HTTPException(status_code=404, detail="Payment record not found")

    verification = await verify_provider_transaction(provider_enum, config, reference)
    webhook_event.verified_with_provider = verification.status in {"success", "successful"}
    if not webhook_event.verified_with_provider:
        await db.commit()
        return PaymentWebhookProcessResponse(processed=False, payment_reference=reference, invoice_number=invoice.invoice_number)

    receipt = await _finalize_verified_payment(db, invoice, payment, config, verification.currency, verification.amount)
    webhook_event.processed = True
    await db.commit()

    return PaymentWebhookProcessResponse(
        processed=True,
        payment_reference=reference,
        invoice_number=invoice.invoice_number,
        receipt_number=receipt.receipt_number,
    )


@router.get("/portal/{customer_id}/payments/{payment_id}/invoice", response_class=HTMLResponse)
async def get_portal_invoice_html(
    customer_id: str,
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_load_portal_account),
):
    if account.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="Customer data access denied")

    result = await db.execute(
        select(BillingInvoice).join(BillingPayment, BillingInvoice.payment_id == BillingPayment.id).where(
            BillingPayment.payment_id == payment_id,
            BillingInvoice.client_id == account.client_id,
        )
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    client = await db.get(Client, account.client_id)
    branding = await _resolve_branding(db, invoice.tenant_id)
    tenant_name = branding.get("display_name") or invoice.tenant_id
    return HTMLResponse(render_invoice_html(invoice, client, tenant_name, branding))


@router.get("/portal/{customer_id}/payments/{payment_id}/receipt", response_class=HTMLResponse)
async def get_portal_receipt_html(
    customer_id: str,
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_load_portal_account),
):
    if account.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="Customer data access denied")

    result = await db.execute(
        select(BillingReceipt)
        .join(BillingPayment, BillingReceipt.payment_id == BillingPayment.id)
        .where(BillingPayment.payment_id == payment_id, BillingReceipt.client_id == account.client_id)
    )
    receipt = result.scalar_one_or_none()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    invoice = await db.get(BillingInvoice, receipt.invoice_id)
    client = await db.get(Client, account.client_id)
    branding = await _resolve_branding(db, receipt.tenant_id)
    tenant_name = branding.get("display_name") or receipt.tenant_id
    return HTMLResponse(receipt.rendered_html or render_receipt_html(receipt, invoice, client, tenant_name, branding))


@router.get("/portal/{customer_id}/payments/{payment_id}/invoice.pdf")
async def get_portal_invoice_pdf(
    customer_id: str,
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_load_portal_account),
):
    if account.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="Customer data access denied")

    result = await db.execute(
        select(BillingInvoice).join(BillingPayment, BillingInvoice.payment_id == BillingPayment.id).where(
            BillingPayment.payment_id == payment_id,
            BillingInvoice.client_id == account.client_id,
        )
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    client = await db.get(Client, account.client_id)
    branding = await _resolve_branding(db, invoice.tenant_id)
    tenant_name = branding.get("display_name") or invoice.tenant_id
    pdf_bytes = render_invoice_pdf(invoice, client, tenant_name, branding)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{invoice.invoice_number}.pdf"'},
    )


@router.get("/portal/{customer_id}/payments/{payment_id}/receipt.pdf")
async def get_portal_receipt_pdf(
    customer_id: str,
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    account: CustomerPortalAccount = Depends(_load_portal_account),
):
    if account.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="Customer data access denied")

    result = await db.execute(
        select(BillingReceipt)
        .join(BillingPayment, BillingReceipt.payment_id == BillingPayment.id)
        .where(BillingPayment.payment_id == payment_id, BillingReceipt.client_id == account.client_id)
    )
    receipt = result.scalar_one_or_none()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    invoice = await db.get(BillingInvoice, receipt.invoice_id)
    client = await db.get(Client, account.client_id)
    branding = await _resolve_branding(db, receipt.tenant_id)
    tenant_name = branding.get("display_name") or receipt.tenant_id
    pdf_bytes = render_receipt_pdf(receipt, invoice, client, tenant_name, branding)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{receipt.receipt_number}.pdf"'},
    )


@router.get("/activation-queue", response_model=List[ActivationQueueRecord])
async def list_activation_queue(
    x_tenant_id: Optional[str] = Header(default=None, alias="x-tenant-id"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tenant_id = x_tenant_id or getattr(current_user, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID is required")

    result = await db.execute(
        select(OperationRecord)
        .join(Client, OperationRecord.client_id == Client.id)
        .where(
            OperationRecord.module == "service_activation",
            Client.tenant_id == tenant_id,
        )
        .order_by(desc(OperationRecord.updated_at))
    )
    return result.scalars().all()


@router.post("/activation-queue/{record_id}/retry", response_model=ActivationRetryResponse)
async def retry_activation_queue_record(
    record_id: int,
    x_tenant_id: Optional[str] = Header(default=None, alias="x-tenant-id"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tenant_id = x_tenant_id or getattr(current_user, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID is required")

    result = await db.execute(
        select(OperationRecord)
        .join(Client, OperationRecord.client_id == Client.id)
        .where(
            OperationRecord.id == record_id,
            OperationRecord.module == "service_activation",
            Client.tenant_id == tenant_id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Activation record not found")

    dispatch_result = await dispatch_service_activation(record)
    _update_activation_record(record, dispatch_result)
    await db.commit()
    await db.refresh(record)
    return ActivationRetryResponse(
        success=dispatch_result.success,
        status=record.status,
        message=dispatch_result.message,
        external_reference=(record.payload or {}).get("external_reference"),
    )
