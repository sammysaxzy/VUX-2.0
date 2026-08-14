"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { randomId } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { Customer, FibreCable, NetworkNode } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SplitterSelector } from "@/components/allocation/splitter-selector";
import { FibreViewer } from "@/components/fibre/fibre-viewer";
import { PortalAccessPanel } from "@/components/customers/portal-access-panel";

const schema = z.object({
  name: z.string().min(3, "Name is required"),
  email: z.string().email(),
  phone: z.string().min(7),
  address: z.string().min(5),
  serviceLocation: z.string().min(3),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  planName: z.string().min(3),
  monthlyFee: z.coerce.number().min(0),
  paymentStatus: z.enum(["paid", "pending", "overdue"]),
  installStatus: z.enum(["pending", "scheduled", "installed"]),
  assignedEngineer: z.string().min(2),
  mstId: z.string().optional(),
  splitterPort: z.coerce.number().optional(),
  fibreCoreId: z.string().optional(),
  onuSerial: z.string().min(5),
  onuMac: z.string().optional(),
  onuVendor: z.string().optional(),
  onuModel: z.string().optional(),
  routerBrand: z.string().optional(),
  routerModel: z.string().optional(),
  routerMac: z.string().optional(),
  wifiName: z.string().optional(),
  pppoeUsername: z.string().optional(),
  oltName: z.string().min(3),
  ponPort: z.string().min(3),
  rxSignal: z.coerce.number(),
  txSignal: z.coerce.number(),
  accountStatus: z.enum(["active", "suspended"]),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  initial?: Customer;
  nodes: NetworkNode[];
  cables: FibreCable[];
  tenantId: string;
  onSubmit: (payload: Customer) => void;
  onDelete?: (customerId: string) => void;
  submitting?: boolean;
  deleting?: boolean;
};

export function CustomerForm({ initial, nodes, cables, tenantId, onSubmit, onDelete, submitting, deleting }: Props) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const user = useAppStore((state) => state.user);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      address: initial?.address ?? "",
      serviceLocation: initial?.serviceLocation ?? initial?.address ?? "",
      lat: initial?.location.lat ?? 6.452,
      lng: initial?.location.lng ?? 3.472,
      planName: initial?.planName ?? "Home 10Mbps",
      monthlyFee: initial?.monthlyFee ?? 8500,
      paymentStatus: initial?.paymentStatus ?? "pending",
      installStatus: initial?.installStatus ?? "pending",
      assignedEngineer: initial?.assignedEngineer ?? "Field Engineer",
      mstId: initial?.mstId ?? "",
      splitterPort: initial?.splitterPort,
      fibreCoreId: initial?.fibreCoreId,
      onuSerial: initial?.onuSerial ?? "",
      onuMac: initial?.onuMac ?? "",
      onuVendor: initial?.onuVendor ?? "",
      onuModel: initial?.onuModel ?? "",
      routerBrand: initial?.routerBrand ?? "",
      routerModel: initial?.routerModel ?? "",
      routerMac: initial?.routerMac ?? "",
      wifiName: initial?.wifiName ?? "",
      pppoeUsername: initial?.pppoeUsername ?? "",
      oltName: initial?.oltName ?? "OLT HQ Core",
      ponPort: initial?.ponPort ?? "",
      rxSignal: initial?.rxSignal ?? -20,
      txSignal: initial?.txSignal ?? 2,
      accountStatus: initial?.accountStatus ?? "active",
    },
  });

  const mstId = form.watch("mstId");
  const selectedMst = useMemo(
    () => nodes.find((node) => node.type === "mst" && node.id === mstId),
    [mstId, nodes],
  );
  const allCores = useMemo(() => cables.flatMap((cable) => cable.cores), [cables]);
  const canDeleteCustomer = Boolean(initial && hasPermission(user, "delete_customer"));

  const save = form.handleSubmit((values) => {
    onSubmit({
      id: initial?.id ?? randomId("cust"),
      tenantId,
      name: values.name,
      email: values.email,
      phone: values.phone,
      address: values.address,
      serviceLocation: values.serviceLocation,
      location: { lat: values.lat, lng: values.lng },
      planName: values.planName,
      monthlyFee: values.monthlyFee,
      paymentStatus: values.paymentStatus,
      balance: values.paymentStatus === "paid" ? 0 : values.monthlyFee,
      nextInvoiceDate: initial?.nextInvoiceDate ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
      installStatus: values.installStatus,
      assignedEngineer: values.assignedEngineer,
      mstId: values.mstId,
      splitterPort: values.splitterPort,
      fibreCoreId: values.fibreCoreId,
      onuSerial: values.onuSerial,
      onuMac: values.onuMac || undefined,
      onuVendor: values.onuVendor || undefined,
      onuModel: values.onuModel || undefined,
      routerBrand: values.routerBrand || undefined,
      routerModel: values.routerModel || undefined,
      routerMac: values.routerMac || undefined,
      wifiName: values.wifiName || undefined,
      pppoeUsername: values.pppoeUsername || undefined,
      oltName: values.oltName,
      ponPort: values.ponPort,
      rxSignal: values.rxSignal,
      txSignal: values.txSignal,
      accountStatus: values.accountStatus,
      online: initial?.online ?? false,
      customerSince: initial?.customerSince ?? new Date().toISOString(),
      lastSeenAt: initial?.lastSeenAt,
      uptimeMinutes: initial?.uptimeMinutes,
      notes: initial?.notes ?? [],
      history: initial?.history ?? [],
      installationRecords: initial?.installationRecords ?? [],
    });
  });

  return (
    <>
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Customer Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} />
          </Field>
          <Field label="Email">
            <Input type="email" {...form.register("email")} />
          </Field>
          <Field label="Phone">
            <Input {...form.register("phone")} />
          </Field>
          <Field label="Assigned Technician">
            <Input {...form.register("assignedEngineer")} />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Address">
            <Textarea {...form.register("address")} />
          </Field>
          <Field label="Service Location">
            <Textarea {...form.register("serviceLocation")} />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Latitude">
            <Input type="number" step="any" {...form.register("lat")} />
          </Field>
          <Field label="Longitude">
            <Input type="number" step="any" {...form.register("lng")} />
          </Field>
          <Field label="Account Status">
            <Select {...form.register("accountStatus")}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </Select>
          </Field>
          <Field label="Installation Status">
            <Select {...form.register("installStatus")}>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="installed">Installed</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Plan Name">
            <Input {...form.register("planName")} />
          </Field>
          <Field label="Monthly Fee">
            <Input type="number" {...form.register("monthlyFee")} />
          </Field>
          <Field label="Payment Status">
            <Select {...form.register("paymentStatus")}>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </Select>
          </Field>
          <Field label="PPPoE Username">
            <Input {...form.register("pppoeUsername")} />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Assigned MST">
            <Select {...form.register("mstId")}>
              <option value="">Select MST</option>
              {nodes
                .filter((node) => node.type === "mst")
                .map((mst) => (
                  <option key={mst.id} value={mst.id}>
                    {mst.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="ONU Serial">
            <Input {...form.register("onuSerial")} />
          </Field>
          <Field label="OLT/PON Port">
            <Input {...form.register("ponPort")} placeholder="1/3/7" />
          </Field>
        </div>

        {selectedMst?.splitterPorts ? (
          <SplitterSelector
            ports={selectedMst.splitterPorts}
            selectedPort={form.watch("splitterPort")}
            onSelect={(port) => form.setValue("splitterPort", port)}
          />
        ) : null}

        <FibreViewer
          cores={allCores}
          selectedCoreId={form.watch("fibreCoreId")}
          onSelect={(coreId) => form.setValue("fibreCoreId", coreId)}
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="OLT Name">
            <Input {...form.register("oltName")} />
          </Field>
          <Field label="RX (dBm)">
            <Input type="number" step="any" {...form.register("rxSignal")} />
          </Field>
          <Field label="TX (dBm)">
            <Input type="number" step="any" {...form.register("txSignal")} />
          </Field>
          <Field label="Wi-Fi Name">
            <Input {...form.register("wifiName")} />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="ONU Vendor">
            <Input {...form.register("onuVendor")} />
          </Field>
          <Field label="ONU Model">
            <Input {...form.register("onuModel")} />
          </Field>
          <Field label="ONU MAC">
            <Input {...form.register("onuMac")} />
          </Field>
          <Field label="Router Brand">
            <Input {...form.register("routerBrand")} />
          </Field>
          <Field label="Router Model">
            <Input {...form.register("routerModel")} />
          </Field>
          <Field label="Router MAC">
            <Input {...form.register("routerMac")} />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          {canDeleteCustomer ? (
            <Button type="button" variant="danger" disabled={submitting || deleting} onClick={() => setDeleteDialogOpen(true)}>
              Delete Customer
            </Button>
          ) : null}
          <Button type="submit" disabled={submitting || deleting}>
            {submitting ? "Saving..." : "Save Customer"}
          </Button>
        </div>

        {initial ? (
          <PortalAccessPanel
            customerId={initial.id}
            defaultUsername={initial.pppoeUsername ?? initial.id}
            defaultEmail={initial.email}
            defaultPhone={initial.phone}
          />
        ) : null}
      </form>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This action cannot be undone."
        className="max-w-md"
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={deleting} onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={deleting}
            onClick={() => {
              if (!initial || !onDelete) return;
              onDelete(initial.id);
            }}
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
