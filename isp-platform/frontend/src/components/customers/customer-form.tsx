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

const schema = z.object({
  name: z.string().min(3, "Name is required"),
  customerType: z.enum(["individual", "corporate"]),
  email: z.string().email(),
  phone: z.string().min(7),
  address: z.string().min(5),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  mstId: z.string().optional(),
  splitterPort: z.coerce.number().optional(),
  fibreCoreId: z.string().optional(),
  rxSignal: z.coerce.number(),
  txSignal: z.coerce.number(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  initial?: Customer;
  nodes: NetworkNode[];
  cables: FibreCable[];
  tenantId: string;
  linkedPppoeCount?: number;
  onSubmit: (payload: Customer) => void;
  onDelete?: (customerId: string) => void;
  submitting?: boolean;
  deleting?: boolean;
};

export function CustomerForm({ initial, nodes, cables, tenantId, linkedPppoeCount = 0, onSubmit, onDelete, submitting, deleting }: Props) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const user = useAppStore((state) => state.user);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      customerType: initial?.customerType ?? "individual",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      address: initial?.address ?? "",
      lat: initial?.location.lat ?? 6.452,
      lng: initial?.location.lng ?? 3.472,
      mstId: initial?.mstId ?? "",
      splitterPort: initial?.splitterPort,
      fibreCoreId: initial?.fibreCoreId,
      rxSignal: initial?.rxSignal ?? -20,
      txSignal: initial?.txSignal ?? 2,
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
      customerType: values.customerType,
      email: values.email,
      phone: values.phone,
      address: values.address,
      location: { lat: values.lat, lng: values.lng },
      mstId: values.mstId,
      splitterPort: values.splitterPort,
      fibreCoreId: values.fibreCoreId,
      onuSerial: initial?.onuSerial ?? "",
      oltName: initial?.oltName ?? "",
      ponPort: initial?.ponPort ?? "",
      rxSignal: values.rxSignal,
      txSignal: values.txSignal,
      accountStatus: initial?.accountStatus ?? "active",
      online: initial?.online ?? false,
    });
  });

  return (
    <>
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name">Customer Name</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="mt-1 text-xs text-danger">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="customerType">Customer Type</Label>
            <Select id="customerType" {...form.register("customerType" as const)}>
              <option value="individual">Individual</option>
              <option value="corporate">Corporate</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...form.register("phone")} />
          </div>
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" {...form.register("address")} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="lat">Latitude</Label>
            <Input id="lat" type="number" step="any" {...form.register("lat")} />
          </div>
          <div>
            <Label htmlFor="lng">Longitude</Label>
            <Input id="lng" type="number" step="any" {...form.register("lng")} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="mstId">Assigned MST</Label>
            <Select id="mstId" {...form.register("mstId")}>
              <option value="">Select MST</option>
              {nodes
                .filter((node) => node.type === "mst")
                .map((mst) => (
                  <option key={mst.id} value={mst.id}>
                    {mst.name}
                  </option>
                ))}
            </Select>
          </div>
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

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="rxSignal">RX (dBm)</Label>
            <Input id="rxSignal" type="number" step="any" {...form.register("rxSignal")} />
          </div>
          <div>
            <Label htmlFor="txSignal">TX (dBm)</Label>
            <Input id="txSignal" type="number" step="any" {...form.register("txSignal")} />
          </div>
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
      </form>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This action cannot be undone."
        className="max-w-md"
      >
        {linkedPppoeCount > 0 ? (
          <p className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
            Warning: this customer has {linkedPppoeCount} linked PPPoE account{linkedPppoeCount === 1 ? "" : "s"}.
            PPPoE records are separate and will not be deleted automatically.
          </p>
        ) : null}
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
