import { type ReactNode, useMemo, useState } from "react";
import { Boxes, Plus, TriangleAlert } from "lucide-react";
import {
  useApproveWorkOrderUsage,
  useCreateInventoryItem,
  useCreateInventoryMovement,
  useCreateInventoryPurchase,
  useCreateWorkOrder,
  useInventoryItems,
  useInventoryPurchases,
  useInventorySummary,
  useSuppliers,
  useWorkOrders,
} from "@/hooks/api/use-inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { InventoryCategory, InventoryDeductionMode, ReferenceType, StockMovementType, WorkOrderType } from "@/types";

const categories: InventoryCategory[] = ["cable", "device", "accessory", "voucher", "bundle", "infrastructure", "tool", "other"];
const movementTypes: StockMovementType[] = ["purchase", "usage", "sale", "transfer", "adjustment", "return"];
const referenceTypes: ReferenceType[] = [
  "inventory_purchase",
  "inventory_usage",
  "customer_installation",
  "subscription",
  "device_sale",
  "salary",
  "maintenance",
  "logistics",
  "other",
];

export function InventoryPage() {
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [itemForm, setItemForm] = useState({
    sku: "",
    name: "",
    category: "device" as InventoryCategory,
    unit_of_measure: "unit",
    quantity_in_stock: 0,
    unit_cost: 0,
    selling_price: 0,
    minimum_stock_level: 0,
    supplier_id: undefined as number | undefined,
    description: "",
    core_type: undefined as number | undefined,
    length_meters: undefined as number | undefined,
  });
  const [movementForm, setMovementForm] = useState({
    item_id: 0,
    movement_type: "purchase" as StockMovementType,
    quantity: 0,
    unit_cost: 0,
    reference_type: "inventory_purchase" as ReferenceType,
    reference_id: "",
    job_reference: "",
    notes: "",
    client_id: undefined as number | undefined,
    mst_id: undefined as number | undefined,
    fibre_route_id: undefined as number | undefined,
  });
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: undefined as number | undefined,
    purchase_date: new Date().toISOString().slice(0, 16),
    reference_id: "",
    item_id: 0,
    quantity: 0,
    unit_cost: 0,
    notes: "",
  });
  const [workOrderForm, setWorkOrderForm] = useState({
    work_type: "installation" as WorkOrderType,
    inventory_deduction_mode: "automatic" as InventoryDeductionMode,
    title: "",
    customer_name: "",
    service_address: "",
    installation_fee: 0,
    notes: "",
    item_id: 0,
    quantity_planned: 0,
    serial_number: "",
    mac_address: "",
    cable_length_used: 0,
  });

  const summary = useInventorySummary();
  const items = useInventoryItems(search, lowStockOnly);
  const suppliers = useSuppliers();
  const purchases = useInventoryPurchases();
  const workOrders = useWorkOrders();
  const createItem = useCreateInventoryItem();
  const createMovement = useCreateInventoryMovement();
  const createPurchase = useCreateInventoryPurchase();
  const createWorkOrder = useCreateWorkOrder();
  const approveWorkOrder = useApproveWorkOrderUsage();

  const lowStockNames = useMemo(
    () => (items.data ?? []).filter((item) => item.quantity_in_stock <= item.minimum_stock_level).slice(0, 5).map((item) => item.name),
    [items.data],
  );

  if (summary.isLoading || items.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventory Control</h1>
          <p className="text-sm text-muted-foreground">Store, field usage, and material accountability for FTTH operations.</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Boxes className="h-3.5 w-3.5" />
          {summary.data?.total_items ?? 0} stocked items
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Inventory Value" value={`NGN ${(summary.data?.inventory_value ?? 0).toLocaleString()}`} subtitle="Current stock at cost price" />
        <MetricCard title="Stock Units" value={`${summary.data?.total_stock_units ?? 0}`} subtitle="Combined quantity across categories" />
        <MetricCard title="Low Stock Alerts" value={`${summary.data?.low_stock_items ?? 0}`} subtitle={lowStockNames.length ? lowStockNames.join(", ") : "No urgent stock alerts"} />
        <MetricCard title="Recent Movements" value={`${summary.data?.recent_movements.length ?? 0}`} subtitle="Latest deductions, purchases, and transfers" />
        <MetricCard title="Pending Approvals" value={`${summary.data?.pending_approvals ?? 0}`} subtitle="Completed jobs waiting for stock approval" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Table</CardTitle>
            <CardDescription>Search, filter, and monitor stock levels before installations or purchases.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by item name or SKU" />
              <Button variant={lowStockOnly ? "default" : "outline"} onClick={() => setLowStockOnly((value) => !value)}>
                <TriangleAlert className="mr-2 h-4 w-4" />
                Low Stock Only
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(items.data ?? []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                      </TableCell>
                      <TableCell className="capitalize">{item.category}</TableCell>
                      <TableCell>{item.quantity_in_stock} {item.unit_of_measure}</TableCell>
                      <TableCell>NGN {item.unit_cost.toLocaleString()}</TableCell>
                      <TableCell>{suppliers.data?.find((supplier) => supplier.id === item.supplier_id)?.name ?? "Unassigned"}</TableCell>
                      <TableCell>
                        <Badge variant={item.quantity_in_stock <= item.minimum_stock_level ? "warning" : "success"}>
                          {item.quantity_in_stock <= item.minimum_stock_level ? "Low stock" : "Healthy"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Inventory Item</CardTitle>
              <CardDescription>Create a stock master for cables, ONUs, MST materials, vouchers, and accessories.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <FormField label="SKU">
                <Input value={itemForm.sku} onChange={(event) => setItemForm((state) => ({ ...state, sku: event.target.value }))} />
              </FormField>
              <FormField label="Item Name">
                <Input value={itemForm.name} onChange={(event) => setItemForm((state) => ({ ...state, name: event.target.value }))} />
              </FormField>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Category">
                  <Select value={itemForm.category} onChange={(event) => setItemForm((state) => ({ ...state, category: event.target.value as InventoryCategory }))}>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Unit">
                  <Input value={itemForm.unit_of_measure} onChange={(event) => setItemForm((state) => ({ ...state, unit_of_measure: event.target.value }))} />
                </FormField>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Opening Stock">
                  <Input type="number" value={itemForm.quantity_in_stock} onChange={(event) => setItemForm((state) => ({ ...state, quantity_in_stock: Number(event.target.value) }))} />
                </FormField>
                <FormField label="Minimum Stock">
                  <Input type="number" value={itemForm.minimum_stock_level} onChange={(event) => setItemForm((state) => ({ ...state, minimum_stock_level: Number(event.target.value) }))} />
                </FormField>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Unit Cost">
                  <Input type="number" value={itemForm.unit_cost} onChange={(event) => setItemForm((state) => ({ ...state, unit_cost: Number(event.target.value) }))} />
                </FormField>
                <FormField label="Selling Price">
                  <Input type="number" value={itemForm.selling_price} onChange={(event) => setItemForm((state) => ({ ...state, selling_price: Number(event.target.value) }))} />
                </FormField>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Core Type">
                  <Input type="number" value={itemForm.core_type ?? ""} onChange={(event) => setItemForm((state) => ({ ...state, core_type: event.target.value ? Number(event.target.value) : undefined }))} />
                </FormField>
                <FormField label="Cable Length (m)">
                  <Input type="number" value={itemForm.length_meters ?? ""} onChange={(event) => setItemForm((state) => ({ ...state, length_meters: event.target.value ? Number(event.target.value) : undefined }))} />
                </FormField>
              </div>
              <FormField label="Description">
                <Textarea value={itemForm.description} onChange={(event) => setItemForm((state) => ({ ...state, description: event.target.value }))} />
              </FormField>
              <Button
                onClick={() =>
                  createItem.mutate({
                    ...itemForm,
                    supplier_id: itemForm.supplier_id,
                  })
                }
                disabled={!itemForm.sku || !itemForm.name}
              >
                <Plus className="mr-2 h-4 w-4" />
                Save Item
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record Purchase</CardTitle>
              <CardDescription>Post supplier purchases directly into inventory and finance in one action.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <FormField label="Supplier">
                <Select value={String(purchaseForm.supplier_id ?? "")} onChange={(event) => setPurchaseForm((state) => ({ ...state, supplier_id: event.target.value ? Number(event.target.value) : undefined }))}>
                  <option value="">Select supplier</option>
                  {(suppliers.data ?? []).map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Purchase Date">
                <Input type="datetime-local" value={purchaseForm.purchase_date} onChange={(event) => setPurchaseForm((state) => ({ ...state, purchase_date: event.target.value }))} />
              </FormField>
              <FormField label="Item">
                <Select value={String(purchaseForm.item_id)} onChange={(event) => setPurchaseForm((state) => ({ ...state, item_id: Number(event.target.value) }))}>
                  <option value="0">Select item</option>
                  {(items.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Quantity">
                  <Input type="number" value={purchaseForm.quantity} onChange={(event) => setPurchaseForm((state) => ({ ...state, quantity: Number(event.target.value) }))} />
                </FormField>
                <FormField label="Unit Cost">
                  <Input type="number" value={purchaseForm.unit_cost} onChange={(event) => setPurchaseForm((state) => ({ ...state, unit_cost: Number(event.target.value) }))} />
                </FormField>
              </div>
              <FormField label="Reference ID">
                <Input value={purchaseForm.reference_id} onChange={(event) => setPurchaseForm((state) => ({ ...state, reference_id: event.target.value }))} placeholder="Invoice or supplier receipt number" />
              </FormField>
              <FormField label="Notes">
                <Textarea value={purchaseForm.notes} onChange={(event) => setPurchaseForm((state) => ({ ...state, notes: event.target.value }))} />
              </FormField>
              <Button
                onClick={() =>
                  createPurchase.mutate({
                    supplier_id: purchaseForm.supplier_id,
                    purchase_date: new Date(purchaseForm.purchase_date).toISOString(),
                    reference_id: purchaseForm.reference_id || undefined,
                    notes: purchaseForm.notes || undefined,
                    lines: [
                      {
                        item_id: purchaseForm.item_id,
                        quantity: purchaseForm.quantity,
                        unit_cost: purchaseForm.unit_cost,
                        notes: purchaseForm.notes || undefined,
                      },
                    ],
                  })
                }
                disabled={!purchaseForm.item_id || !purchaseForm.quantity || !purchaseForm.unit_cost}
              >
                Record Purchase
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record Usage or Purchase</CardTitle>
              <CardDescription>Every movement becomes part of the audit trail and supports automation for installations and map work.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <FormField label="Inventory Item">
                <Select value={String(movementForm.item_id)} onChange={(event) => setMovementForm((state) => ({ ...state, item_id: Number(event.target.value) }))}>
                  <option value="0">Select item</option>
                  {(items.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Movement Type">
                  <Select value={movementForm.movement_type} onChange={(event) => setMovementForm((state) => ({ ...state, movement_type: event.target.value as StockMovementType }))}>
                    {movementTypes.map((movementType) => (
                      <option key={movementType} value={movementType}>
                        {movementType}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Reference Type">
                  <Select value={movementForm.reference_type} onChange={(event) => setMovementForm((state) => ({ ...state, reference_type: event.target.value as ReferenceType }))}>
                    {referenceTypes.map((referenceType) => (
                      <option key={referenceType} value={referenceType}>
                        {referenceType}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Quantity">
                  <Input type="number" value={movementForm.quantity} onChange={(event) => setMovementForm((state) => ({ ...state, quantity: Number(event.target.value) }))} />
                </FormField>
                <FormField label="Unit Cost">
                  <Input type="number" value={movementForm.unit_cost} onChange={(event) => setMovementForm((state) => ({ ...state, unit_cost: Number(event.target.value) }))} />
                </FormField>
              </div>
              <FormField label="Job Reference">
                <Input value={movementForm.job_reference} onChange={(event) => setMovementForm((state) => ({ ...state, job_reference: event.target.value }))} placeholder="Install ticket, map job, or field ref" />
              </FormField>
              <FormField label="Reference ID">
                <Input value={movementForm.reference_id} onChange={(event) => setMovementForm((state) => ({ ...state, reference_id: event.target.value }))} placeholder="Invoice, customer id, or purchase ref" />
              </FormField>
              <FormField label="Notes">
                <Textarea value={movementForm.notes} onChange={(event) => setMovementForm((state) => ({ ...state, notes: event.target.value }))} />
              </FormField>
              <Button
                onClick={() => createMovement.mutate(movementForm)}
                disabled={!movementForm.item_id || !movementForm.quantity}
              >
                Record Movement
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Installation / Field Work Order</CardTitle>
            <CardDescription>Create a job that can automatically deduct stock or wait for manual approval after completion.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Work Type">
                <Select value={workOrderForm.work_type} onChange={(event) => setWorkOrderForm((state) => ({ ...state, work_type: event.target.value as WorkOrderType }))}>
                  <option value="installation">installation</option>
                  <option value="maintenance">maintenance</option>
                  <option value="repair">repair</option>
                  <option value="upgrade">upgrade</option>
                  <option value="survey">survey</option>
                </Select>
              </FormField>
              <FormField label="Stock Deduction">
                <Select value={workOrderForm.inventory_deduction_mode} onChange={(event) => setWorkOrderForm((state) => ({ ...state, inventory_deduction_mode: event.target.value as InventoryDeductionMode }))}>
                  <option value="automatic">automatic</option>
                  <option value="manual_approval">manual approval</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Title">
              <Input value={workOrderForm.title} onChange={(event) => setWorkOrderForm((state) => ({ ...state, title: event.target.value }))} placeholder="New customer installation" />
            </FormField>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Customer Name">
                <Input value={workOrderForm.customer_name} onChange={(event) => setWorkOrderForm((state) => ({ ...state, customer_name: event.target.value }))} />
              </FormField>
              <FormField label="Installation Fee">
                <Input type="number" value={workOrderForm.installation_fee} onChange={(event) => setWorkOrderForm((state) => ({ ...state, installation_fee: Number(event.target.value) }))} />
              </FormField>
            </div>
            <FormField label="Service Address">
              <Textarea value={workOrderForm.service_address} onChange={(event) => setWorkOrderForm((state) => ({ ...state, service_address: event.target.value }))} />
            </FormField>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Material">
                <Select value={String(workOrderForm.item_id)} onChange={(event) => setWorkOrderForm((state) => ({ ...state, item_id: Number(event.target.value) }))}>
                  <option value="0">Select item</option>
                  {(items.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Planned Quantity">
                <Input type="number" value={workOrderForm.quantity_planned} onChange={(event) => setWorkOrderForm((state) => ({ ...state, quantity_planned: Number(event.target.value) }))} />
              </FormField>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Serial Number">
                <Input value={workOrderForm.serial_number} onChange={(event) => setWorkOrderForm((state) => ({ ...state, serial_number: event.target.value }))} />
              </FormField>
              <FormField label="MAC Address">
                <Input value={workOrderForm.mac_address} onChange={(event) => setWorkOrderForm((state) => ({ ...state, mac_address: event.target.value }))} />
              </FormField>
            </div>
            <FormField label="Cable Length Used (m)">
              <Input type="number" value={workOrderForm.cable_length_used} onChange={(event) => setWorkOrderForm((state) => ({ ...state, cable_length_used: Number(event.target.value) }))} />
            </FormField>
            <FormField label="Notes">
              <Textarea value={workOrderForm.notes} onChange={(event) => setWorkOrderForm((state) => ({ ...state, notes: event.target.value }))} />
            </FormField>
            <Button
              onClick={() =>
                createWorkOrder.mutate({
                  work_type: workOrderForm.work_type,
                  inventory_deduction_mode: workOrderForm.inventory_deduction_mode,
                  title: workOrderForm.title,
                  customer_name: workOrderForm.customer_name || undefined,
                  service_address: workOrderForm.service_address || undefined,
                  installation_fee: workOrderForm.installation_fee,
                  notes: workOrderForm.notes || undefined,
                  materials: workOrderForm.item_id
                    ? [
                        {
                          item_id: workOrderForm.item_id,
                          quantity_planned: workOrderForm.quantity_planned,
                          quantity_used: workOrderForm.quantity_planned,
                          serial_number: workOrderForm.serial_number || undefined,
                          mac_address: workOrderForm.mac_address || undefined,
                          cable_length_used: workOrderForm.cable_length_used || undefined,
                          notes: workOrderForm.notes || undefined,
                        },
                      ]
                    : [],
                })
              }
              disabled={!workOrderForm.title}
            >
              Create Work Order
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approvals & Recent Purchases</CardTitle>
            <CardDescription>Track pending stock approvals and recent procurement activity in one place.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <h3 className="text-sm font-medium">Pending Work Orders</h3>
              <div className="mt-3 space-y-2">
                {(workOrders.data ?? [])
                  .filter((entry) => entry.approval_status === "pending")
                  .slice(0, 5)
                  .map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{entry.work_order_code}</p>
                          <p className="text-xs text-muted-foreground">{entry.title}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => approveWorkOrder.mutate({ workOrderId: entry.id })}>
                          Approve Usage
                        </Button>
                      </div>
                    </div>
                  ))}
                {!(workOrders.data ?? []).some((entry) => entry.approval_status === "pending") ? (
                  <p className="text-sm text-muted-foreground">No work orders are waiting for approval.</p>
                ) : null}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium">Recent Purchases</h3>
              <div className="mt-3 space-y-2">
                {(purchases.data ?? []).slice(0, 5).map((purchase) => (
                  <div key={purchase.id} className="rounded-lg border border-border/70 p-3">
                    <p className="font-medium">{purchase.purchase_code}</p>
                    <p className="text-xs text-muted-foreground">NGN {purchase.total_cost.toLocaleString()} on {new Date(purchase.purchase_date).toLocaleDateString()}</p>
                  </div>
                ))}
                {!(purchases.data ?? []).length ? <p className="text-sm text-muted-foreground">No purchases recorded yet.</p> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
