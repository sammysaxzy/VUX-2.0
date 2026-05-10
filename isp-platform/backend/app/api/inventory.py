from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import get_current_user_dependency as get_current_user
from ..models import (
    ActivityLog,
    ApprovalStatus,
    Client,
    FinanceEntryType,
    FibreRoute,
    FinancialTransaction,
    InventoryDeductionMode,
    InventoryItem,
    InventoryMovement,
    InventoryPurchase,
    InventoryPurchaseLine,
    MSTBox,
    ReferenceType,
    StockMovementType,
    Supplier,
    WorkOrder,
    WorkOrderMaterial,
    WorkOrderStatus,
    WorkOrderType,
)
from ..schemas import (
    InventoryItem as InventoryItemSchema,
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryMovement as InventoryMovementSchema,
    InventoryMovementCreate,
    InventoryPurchase as InventoryPurchaseSchema,
    InventoryPurchaseCreate,
    InventorySummary,
    Supplier as SupplierSchema,
    SupplierCreate,
    WorkOrder as WorkOrderSchema,
    WorkOrderApproval,
    WorkOrderComplete,
    WorkOrderCreate,
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


async def _log_activity(
    db: AsyncSession,
    *,
    user_id: int,
    action_type: str,
    description: str,
    client_id: Optional[int] = None,
    mst_id: Optional[int] = None,
    fibre_route_id: Optional[int] = None,
    after_state: Optional[dict] = None,
):
    db.add(
        ActivityLog(
            user_id=user_id,
            action_type=action_type,
            action_description=description,
            client_id=client_id,
            mst_id=mst_id,
            fibre_route_id=fibre_route_id,
            after_state=after_state,
        )
    )


def _build_code(prefix: str, timestamp: Optional[datetime] = None) -> str:
    stamp = timestamp or datetime.utcnow()
    return f"{prefix}-{stamp.strftime('%Y%m%d%H%M%S%f')}"


def _decimal(value: Decimal | int | float | str | None, default: str = "0") -> Decimal:
    if value is None:
        return Decimal(default)
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


async def _create_finance_entry(
    db: AsyncSession,
    *,
    entry_type: FinanceEntryType,
    category: str,
    amount: Decimal,
    description: str,
    reference_type: ReferenceType,
    current_user_id: int,
    reference_id: Optional[str] = None,
    inventory_item_id: Optional[int] = None,
    inventory_movement_id: Optional[int] = None,
    client_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    work_order_id: Optional[int] = None,
    purchase_id: Optional[int] = None,
    transaction_date: Optional[datetime] = None,
):
    tx_time = transaction_date or datetime.utcnow()
    transaction = FinancialTransaction(
        transaction_code=_build_code("TXN", tx_time),
        entry_type=entry_type,
        category=category,
        amount=amount,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id,
        inventory_item_id=inventory_item_id,
        inventory_movement_id=inventory_movement_id,
        client_id=client_id,
        supplier_id=supplier_id,
        work_order_id=work_order_id,
        purchase_id=purchase_id,
        created_by_user_id=current_user_id,
        transaction_date=tx_time,
    )
    db.add(transaction)
    await db.flush()
    return transaction


async def _record_inventory_movement(
    db: AsyncSession,
    *,
    item: InventoryItem,
    movement_type: StockMovementType,
    quantity: Decimal,
    unit_cost: Decimal,
    current_user_id: int,
    reference_type: ReferenceType,
    reference_id: Optional[str] = None,
    job_reference: Optional[str] = None,
    client_id: Optional[int] = None,
    mst_id: Optional[int] = None,
    fibre_route_id: Optional[int] = None,
    source_location=None,
    destination_location=None,
    notes: Optional[str] = None,
    latitude: Optional[Decimal] = None,
    longitude: Optional[Decimal] = None,
) -> InventoryMovement:
    if movement_type in {StockMovementType.USAGE, StockMovementType.SALE} and item.quantity_in_stock < quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient stock for item '{item.name}'")

    if movement_type == StockMovementType.ADJUSTMENT:
        item.quantity_in_stock = item.quantity_in_stock + quantity
    elif movement_type in {StockMovementType.PURCHASE, StockMovementType.RETURN}:
        item.quantity_in_stock = item.quantity_in_stock + quantity
    elif movement_type in {StockMovementType.USAGE, StockMovementType.SALE}:
        item.quantity_in_stock = item.quantity_in_stock - quantity

    item.updated_at = datetime.utcnow()
    if unit_cost > 0:
        item.unit_cost = unit_cost

    movement = InventoryMovement(
        item_id=item.id,
        movement_type=movement_type,
        quantity=quantity,
        unit_cost=unit_cost,
        total_cost=unit_cost * quantity,
        source_location=source_location,
        destination_location=destination_location,
        notes=notes,
        reference_type=reference_type,
        reference_id=reference_id,
        job_reference=job_reference,
        used_by_user_id=current_user_id,
        client_id=client_id,
        mst_id=mst_id,
        fibre_route_id=fibre_route_id,
        latitude=latitude,
        longitude=longitude,
    )
    db.add(movement)
    await db.flush()
    return movement


async def _ensure_work_order_links(db: AsyncSession, payload: WorkOrderCreate | WorkOrderComplete):
    if payload.client_id and not await db.get(Client, payload.client_id):
        raise HTTPException(status_code=404, detail="Linked client not found")
    if payload.mst_id and not await db.get(MSTBox, payload.mst_id):
        raise HTTPException(status_code=404, detail="Linked MST not found")
    if payload.fibre_route_id and not await db.get(FibreRoute, payload.fibre_route_id):
        raise HTTPException(status_code=404, detail="Linked fibre route not found")


async def _apply_work_order_inventory(
    db: AsyncSession,
    *,
    work_order: WorkOrder,
    materials: list[WorkOrderMaterial],
    current_user_id: int,
):
    equipment_log = list(work_order.client.installed_equipment or []) if work_order.client else []
    total_usage_cost = Decimal("0")

    for material in materials:
        item = await db.get(InventoryItem, material.item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"Inventory item {material.item_id} not found")
        quantity = _decimal(material.quantity_used or material.quantity_planned)
        if quantity <= 0:
            continue
        unit_cost = _decimal(material.unit_cost or item.unit_cost)
        movement = await _record_inventory_movement(
            db,
            item=item,
            movement_type=StockMovementType.USAGE,
            quantity=quantity,
            unit_cost=unit_cost,
            current_user_id=current_user_id,
            reference_type=ReferenceType.CUSTOMER_INSTALLATION if work_order.work_type == WorkOrderType.INSTALLATION else ReferenceType.INVENTORY_USAGE,
            reference_id=work_order.work_order_code,
            job_reference=work_order.work_order_code,
            client_id=work_order.client_id,
            mst_id=work_order.mst_id,
            fibre_route_id=work_order.fibre_route_id,
            source_location=None,
            destination_location=None,
            notes=material.notes or work_order.notes,
            latitude=work_order.latitude,
            longitude=work_order.longitude,
        )
        material.quantity_used = quantity
        material.unit_cost = unit_cost
        material.total_cost = quantity * unit_cost
        material.inventory_movement_id = movement.id
        total_usage_cost += material.total_cost

        await _create_finance_entry(
            db,
            entry_type=FinanceEntryType.EXPENSE,
            category="installation_material" if work_order.work_type == WorkOrderType.INSTALLATION else "field_material",
            amount=material.total_cost,
            description=f"{work_order.work_type.value.title()} usage for {item.name} on {work_order.work_order_code}",
            reference_type=ReferenceType.CUSTOMER_INSTALLATION if work_order.work_type == WorkOrderType.INSTALLATION else ReferenceType.INVENTORY_USAGE,
            reference_id=work_order.work_order_code,
            inventory_item_id=item.id,
            inventory_movement_id=movement.id,
            client_id=work_order.client_id,
            work_order_id=work_order.id,
            current_user_id=current_user_id,
        )

        equipment_log.append(
            {
                "item_id": item.id,
                "item_name": item.name,
                "quantity_used": str(quantity),
                "unit_of_measure": item.unit_of_measure,
                "serial_number": material.serial_number,
                "mac_address": material.mac_address,
                "cable_length_used": str(material.cable_length_used) if material.cable_length_used is not None else None,
                "work_order_code": work_order.work_order_code,
                "work_type": work_order.work_type.value,
                "used_at": datetime.utcnow().isoformat(),
            }
        )

        if work_order.client:
            if material.serial_number and item.category.value == "device":
                work_order.client.onu_serial = material.serial_number
            if material.mac_address and item.category.value == "device":
                if "router" in item.name.lower():
                    work_order.client.router_mac = material.mac_address
                else:
                    work_order.client.onu_mac = material.mac_address
            if material.cable_length_used is not None:
                work_order.client.drop_cable_length = material.cable_length_used

    if work_order.client:
        if work_order.onu_serial:
            work_order.client.onu_serial = work_order.onu_serial
        if work_order.onu_mac:
            work_order.client.onu_mac = work_order.onu_mac
        if work_order.router_mac:
            work_order.client.router_mac = work_order.router_mac
        work_order.client.installed_equipment = equipment_log
        work_order.client.updated_at = datetime.utcnow()

    return total_usage_cost


@router.get("/suppliers", response_model=list[SupplierSchema])
async def list_suppliers(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Supplier).order_by(Supplier.name.asc()))
    return result.scalars().all()


@router.post("/suppliers", response_model=SupplierSchema, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    payload: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    await db.flush()
    await _log_activity(
        db,
        user_id=current_user.id,
        action_type="supplier_created",
        description=f"Created supplier '{supplier.name}'.",
        after_state={"supplier_id": supplier.id},
    )
    await db.refresh(supplier)
    return supplier


@router.get("/items", response_model=list[InventoryItemSchema])
async def list_inventory_items(
    search: Optional[str] = Query(default=None),
    low_stock_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(InventoryItem).where(InventoryItem.is_active == True)
    if search:
        like = f"%{search.strip()}%"
        query = query.where(or_(InventoryItem.name.ilike(like), InventoryItem.sku.ilike(like)))
    if low_stock_only:
        query = query.where(InventoryItem.quantity_in_stock <= InventoryItem.minimum_stock_level)
    query = query.order_by(InventoryItem.updated_at.desc(), InventoryItem.name.asc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/items", response_model=InventoryItemSchema, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    payload: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    item = InventoryItem(**payload.model_dump())
    db.add(item)
    await db.flush()
    await _log_activity(
        db,
        user_id=current_user.id,
        action_type="inventory_item_created",
        description=f"Created inventory item '{item.name}' ({item.sku}).",
        after_state={"item_id": item.id, "sku": item.sku},
    )
    await db.refresh(item)
    return item


@router.patch("/items/{item_id}", response_model=InventoryItemSchema)
async def update_inventory_item(
    item_id: int,
    payload: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    item = await db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    item.updated_at = datetime.utcnow()
    await db.flush()
    await _log_activity(
        db,
        user_id=current_user.id,
        action_type="inventory_item_updated",
        description=f"Updated inventory item '{item.name}'.",
        after_state={"item_id": item.id},
    )
    await db.refresh(item)
    return item


@router.post("/movements", response_model=InventoryMovementSchema, status_code=status.HTTP_201_CREATED)
async def create_inventory_movement(
    payload: InventoryMovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    item = await db.get(InventoryItem, payload.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    if payload.client_id and not await db.get(Client, payload.client_id):
        raise HTTPException(status_code=404, detail="Linked client not found")
    if payload.mst_id and not await db.get(MSTBox, payload.mst_id):
        raise HTTPException(status_code=404, detail="Linked MST not found")
    if payload.fibre_route_id and not await db.get(FibreRoute, payload.fibre_route_id):
        raise HTTPException(status_code=404, detail="Linked fibre route not found")

    quantity = _decimal(payload.quantity)
    movement = await _record_inventory_movement(
        db,
        item=item,
        movement_type=payload.movement_type,
        quantity=quantity,
        unit_cost=_decimal(payload.unit_cost),
        current_user_id=current_user.id,
        reference_type=payload.reference_type,
        reference_id=payload.reference_id,
        job_reference=payload.job_reference,
        client_id=payload.client_id,
        mst_id=payload.mst_id,
        fibre_route_id=payload.fibre_route_id,
        source_location=payload.source_location,
        destination_location=payload.destination_location,
        notes=payload.notes,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )

    if payload.movement_type == StockMovementType.PURCHASE:
        await _create_finance_entry(
            db,
            entry_type=FinanceEntryType.EXPENSE,
            category="inventory_purchase",
            amount=movement.total_cost,
            description=f"Stock purchase for {item.name}",
            reference_type=payload.reference_type,
            reference_id=payload.reference_id,
            inventory_item_id=item.id,
            inventory_movement_id=movement.id,
            client_id=payload.client_id,
            current_user_id=current_user.id,
        )

    await _log_activity(
        db,
        user_id=current_user.id,
        action_type=f"inventory_{payload.movement_type.value}",
        description=f"{payload.movement_type.value.title()} recorded for '{item.name}' ({quantity} {item.unit_of_measure}).",
        client_id=payload.client_id,
        mst_id=payload.mst_id,
        fibre_route_id=payload.fibre_route_id,
        after_state={
            "item_id": item.id,
            "movement_id": movement.id,
            "remaining_stock": str(item.quantity_in_stock),
            "job_reference": payload.job_reference,
        },
    )
    await db.refresh(movement)
    return movement


@router.get("/movements", response_model=list[InventoryMovementSchema])
async def list_inventory_movements(
    item_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(InventoryMovement)
    if item_id:
        query = query.where(InventoryMovement.item_id == item_id)
    query = query.order_by(InventoryMovement.created_at.desc()).limit(200)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/purchases", response_model=InventoryPurchaseSchema, status_code=status.HTTP_201_CREATED)
async def create_inventory_purchase(
    payload: InventoryPurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not payload.lines:
        raise HTTPException(status_code=400, detail="At least one purchase line is required")
    if payload.supplier_id and not await db.get(Supplier, payload.supplier_id):
        raise HTTPException(status_code=404, detail="Supplier not found")

    purchase_date = payload.purchase_date or datetime.utcnow()
    purchase = InventoryPurchase(
        purchase_code=_build_code("PUR", purchase_date),
        supplier_id=payload.supplier_id,
        purchase_date=purchase_date,
        notes=payload.notes,
        created_by_user_id=current_user.id,
        total_cost=Decimal("0"),
    )
    db.add(purchase)
    await db.flush()

    total_cost = Decimal("0")
    for line in payload.lines:
        item = await db.get(InventoryItem, line.item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"Inventory item {line.item_id} not found")
        quantity = _decimal(line.quantity)
        unit_cost = _decimal(line.unit_cost)
        movement = await _record_inventory_movement(
            db,
            item=item,
            movement_type=StockMovementType.PURCHASE,
            quantity=quantity,
            unit_cost=unit_cost,
            current_user_id=current_user.id,
            reference_type=ReferenceType.INVENTORY_PURCHASE,
            reference_id=payload.reference_id or purchase.purchase_code,
            job_reference=purchase.purchase_code,
            destination_location=None,
            notes=line.notes or payload.notes,
        )
        total = quantity * unit_cost
        db.add(
            InventoryPurchaseLine(
                purchase_id=purchase.id,
                item_id=item.id,
                quantity=quantity,
                unit_cost=unit_cost,
                total_cost=total,
                movement_id=movement.id,
                notes=line.notes,
            )
        )
        total_cost += total

    purchase.total_cost = total_cost
    await db.flush()

    await _create_finance_entry(
        db,
        entry_type=FinanceEntryType.EXPENSE,
        category="inventory_purchase",
        amount=total_cost,
        description=f"Inventory purchase {purchase.purchase_code}",
        reference_type=ReferenceType.INVENTORY_PURCHASE,
        reference_id=payload.reference_id or purchase.purchase_code,
        supplier_id=payload.supplier_id,
        purchase_id=purchase.id,
        current_user_id=current_user.id,
        transaction_date=purchase_date,
    )
    await _log_activity(
        db,
        user_id=current_user.id,
        action_type="inventory_purchase_created",
        description=f"Inventory purchase {purchase.purchase_code} recorded.",
        after_state={"purchase_id": purchase.id, "total_cost": str(total_cost)},
    )
    await db.refresh(purchase)
    return purchase


@router.get("/purchases", response_model=list[InventoryPurchaseSchema])
async def list_inventory_purchases(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(InventoryPurchase).order_by(InventoryPurchase.purchase_date.desc()).limit(100))
    return result.scalars().all()


@router.post("/work-orders", response_model=WorkOrderSchema, status_code=status.HTTP_201_CREATED)
async def create_work_order(
    payload: WorkOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _ensure_work_order_links(db, payload)

    approval_status = (
        ApprovalStatus.NOT_REQUIRED
        if payload.inventory_deduction_mode == InventoryDeductionMode.AUTOMATIC
        else ApprovalStatus.PENDING
    )
    work_order = WorkOrder(
        work_order_code=_build_code("WO"),
        work_type=payload.work_type,
        status=WorkOrderStatus.SCHEDULED if payload.scheduled_at else WorkOrderStatus.DRAFT,
        inventory_deduction_mode=payload.inventory_deduction_mode,
        approval_status=approval_status,
        title=payload.title,
        description=payload.description,
        customer_name=payload.customer_name,
        service_address=payload.service_address,
        client_id=payload.client_id,
        mst_id=payload.mst_id,
        fibre_route_id=payload.fibre_route_id,
        assigned_engineer_user_id=payload.assigned_engineer_user_id,
        onu_serial=payload.onu_serial,
        onu_mac=payload.onu_mac,
        router_mac=payload.router_mac,
        installation_fee=payload.installation_fee,
        latitude=payload.latitude,
        longitude=payload.longitude,
        map_reference=payload.map_reference,
        notes=payload.notes,
        photos=payload.photos,
        scheduled_at=payload.scheduled_at,
        created_by_user_id=current_user.id,
    )
    db.add(work_order)
    await db.flush()

    for material in payload.materials:
        item = await db.get(InventoryItem, material.item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"Inventory item {material.item_id} not found")
        unit_cost = _decimal(material.unit_cost or item.unit_cost)
        quantity_used = _decimal(material.quantity_used or material.quantity_planned)
        db.add(
            WorkOrderMaterial(
                work_order_id=work_order.id,
                item_id=material.item_id,
                quantity_planned=_decimal(material.quantity_planned),
                quantity_used=quantity_used,
                unit_cost=unit_cost,
                total_cost=quantity_used * unit_cost,
                serial_number=material.serial_number,
                mac_address=material.mac_address,
                cable_length_used=material.cable_length_used,
                notes=material.notes,
            )
        )

    await _log_activity(
        db,
        user_id=current_user.id,
        action_type="work_order_created",
        description=f"Created {payload.work_type.value} work order '{work_order.work_order_code}'.",
        client_id=payload.client_id,
        mst_id=payload.mst_id,
        fibre_route_id=payload.fibre_route_id,
        after_state={"work_order_id": work_order.id},
    )
    await db.refresh(work_order)
    return work_order


@router.get("/work-orders", response_model=list[WorkOrderSchema])
async def list_work_orders(
    status_filter: Optional[WorkOrderStatus] = Query(default=None),
    work_type: Optional[WorkOrderType] = Query(default=None),
    pending_approval_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(WorkOrder)
    if status_filter:
        query = query.where(WorkOrder.status == status_filter)
    if work_type:
        query = query.where(WorkOrder.work_type == work_type)
    if pending_approval_only:
        query = query.where(WorkOrder.approval_status == ApprovalStatus.PENDING)
    query = query.order_by(WorkOrder.created_at.desc()).limit(200)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/work-orders/{work_order_id}/complete", response_model=WorkOrderSchema)
async def complete_work_order(
    work_order_id: int,
    payload: WorkOrderComplete,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    work_order = await db.get(WorkOrder, work_order_id)
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")

    work_order.status = WorkOrderStatus.COMPLETED
    work_order.completed_at = datetime.utcnow()
    if payload.notes:
        work_order.notes = payload.notes
    if payload.photos:
        work_order.photos = payload.photos
    if payload.onu_serial:
        work_order.onu_serial = payload.onu_serial
    if payload.onu_mac:
        work_order.onu_mac = payload.onu_mac
    if payload.router_mac:
        work_order.router_mac = payload.router_mac
    if payload.latitude is not None:
        work_order.latitude = payload.latitude
    if payload.longitude is not None:
        work_order.longitude = payload.longitude

    existing_materials = (await db.execute(select(WorkOrderMaterial).where(WorkOrderMaterial.work_order_id == work_order.id))).scalars().all()
    material_map = {material.item_id: material for material in existing_materials}

    for material_payload in payload.materials:
        item = await db.get(InventoryItem, material_payload.item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"Inventory item {material_payload.item_id} not found")
        quantity_used = _decimal(material_payload.quantity_used or material_payload.quantity_planned)
        unit_cost = _decimal(material_payload.unit_cost or item.unit_cost)
        existing = material_map.get(material_payload.item_id)
        if existing:
            existing.quantity_planned = _decimal(material_payload.quantity_planned or existing.quantity_planned)
            existing.quantity_used = quantity_used
            existing.unit_cost = unit_cost
            existing.total_cost = quantity_used * unit_cost
            existing.serial_number = material_payload.serial_number
            existing.mac_address = material_payload.mac_address
            existing.cable_length_used = material_payload.cable_length_used
            existing.notes = material_payload.notes
        else:
            db.add(
                WorkOrderMaterial(
                    work_order_id=work_order.id,
                    item_id=material_payload.item_id,
                    quantity_planned=_decimal(material_payload.quantity_planned),
                    quantity_used=quantity_used,
                    unit_cost=unit_cost,
                    total_cost=quantity_used * unit_cost,
                    serial_number=material_payload.serial_number,
                    mac_address=material_payload.mac_address,
                    cable_length_used=material_payload.cable_length_used,
                    notes=material_payload.notes,
                )
            )

    await db.flush()
    materials = (await db.execute(select(WorkOrderMaterial).where(WorkOrderMaterial.work_order_id == work_order.id))).scalars().all()

    if work_order.inventory_deduction_mode == InventoryDeductionMode.AUTOMATIC:
        work_order.approval_status = ApprovalStatus.NOT_REQUIRED
        await _apply_work_order_inventory(
            db,
            work_order=work_order,
            materials=materials,
            current_user_id=current_user.id,
        )
    else:
        work_order.approval_status = ApprovalStatus.PENDING

    await _log_activity(
        db,
        user_id=current_user.id,
        action_type="work_order_completed",
        description=f"Completed work order '{work_order.work_order_code}'.",
        client_id=work_order.client_id,
        mst_id=work_order.mst_id,
        fibre_route_id=work_order.fibre_route_id,
        after_state={"work_order_id": work_order.id, "approval_status": work_order.approval_status.value},
    )
    await db.refresh(work_order)
    return work_order


@router.post("/work-orders/{work_order_id}/approve-usage", response_model=WorkOrderSchema)
async def approve_work_order_usage(
    work_order_id: int,
    payload: WorkOrderApproval,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    work_order = await db.get(WorkOrder, work_order_id)
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    if work_order.status != WorkOrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Work order must be completed before approval")
    if work_order.inventory_deduction_mode != InventoryDeductionMode.MANUAL_APPROVAL:
        raise HTTPException(status_code=400, detail="This work order does not require manual approval")
    if work_order.approval_status == ApprovalStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Work order usage already approved")

    materials = (await db.execute(select(WorkOrderMaterial).where(WorkOrderMaterial.work_order_id == work_order.id))).scalars().all()
    await _apply_work_order_inventory(
        db,
        work_order=work_order,
        materials=materials,
        current_user_id=current_user.id,
    )
    work_order.approval_status = ApprovalStatus.APPROVED
    work_order.approved_by_user_id = current_user.id
    work_order.approved_at = datetime.utcnow()
    if payload.approval_notes:
        work_order.notes = f"{work_order.notes or ''}\nApproval: {payload.approval_notes}".strip()

    await _log_activity(
        db,
        user_id=current_user.id,
        action_type="work_order_usage_approved",
        description=f"Approved inventory usage for work order '{work_order.work_order_code}'.",
        client_id=work_order.client_id,
        mst_id=work_order.mst_id,
        fibre_route_id=work_order.fibre_route_id,
        after_state={"work_order_id": work_order.id, "approved_by_user_id": current_user.id},
    )
    await db.refresh(work_order)
    return work_order


@router.get("/summary", response_model=InventorySummary)
async def get_inventory_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    total_items = await db.execute(select(func.count(InventoryItem.id)).where(InventoryItem.is_active == True))
    low_stock_items = await db.execute(
        select(func.count(InventoryItem.id)).where(
            InventoryItem.is_active == True,
            InventoryItem.quantity_in_stock <= InventoryItem.minimum_stock_level,
        )
    )
    total_units = await db.execute(
        select(func.coalesce(func.sum(InventoryItem.quantity_in_stock), 0)).where(InventoryItem.is_active == True)
    )
    inventory_value = await db.execute(
        select(func.coalesce(func.sum(InventoryItem.quantity_in_stock * InventoryItem.unit_cost), 0)).where(
            InventoryItem.is_active == True
        )
    )
    recent_movements = await db.execute(
        select(InventoryMovement).order_by(InventoryMovement.created_at.desc()).limit(10)
    )
    most_used = await db.execute(
        select(
            InventoryItem.id,
            InventoryItem.name,
            func.coalesce(func.sum(WorkOrderMaterial.quantity_used), 0).label("total_used"),
        )
        .join(WorkOrderMaterial, WorkOrderMaterial.item_id == InventoryItem.id, isouter=True)
        .group_by(InventoryItem.id, InventoryItem.name)
        .order_by(func.coalesce(func.sum(WorkOrderMaterial.quantity_used), 0).desc(), InventoryItem.name.asc())
        .limit(5)
    )
    pending_approvals = await db.execute(
        select(func.count(WorkOrder.id)).where(WorkOrder.approval_status == ApprovalStatus.PENDING)
    )

    return InventorySummary(
        total_items=total_items.scalar() or 0,
        low_stock_items=low_stock_items.scalar() or 0,
        total_stock_units=_decimal(total_units.scalar() or 0),
        inventory_value=_decimal(inventory_value.scalar() or 0),
        recent_movements=[InventoryMovementSchema.model_validate(row) for row in recent_movements.scalars().all()],
        most_used_items=[
            {"item_id": item_id, "name": name, "quantity_used": str(total_used)}
            for item_id, name, total_used in most_used.all()
        ],
        pending_approvals=pending_approvals.scalar() or 0,
    )
