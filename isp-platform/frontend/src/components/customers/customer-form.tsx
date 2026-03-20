"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { randomId } from "@/lib/utils";
import type { Customer, FibreCable, NetworkNode } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SplitterSelector } from "@/components/allocation/splitter-selector";
import { FibreViewer } from "@/components/fibre/fibre-viewer";

const schema = z.object({
  name: z.string().min(3, "Name is required"),
  email: z.string().email(),
  phone: z.string().min(7),
  address: z.string().min(5),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  mstId: z.string().optional(),
  splitterPort: z.coerce.number().optional(),
  fibreCoreId: z.string().optional(),
  onuSerial: z.string().min(5),
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
  submitting?: boolean;
};

export function CustomerForm({ initial, nodes, cables, tenantId, onSubmit, submitting }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      address: initial?.address ?? "",
      lat: initial?.location.lat ?? 6.452,
      lng: initial?.location.lng ?? 3.472,
      mstId: initial?.mstId ?? "",
      splitterPort: initial?.splitterPort,
      fibreCoreId: initial?.fibreCoreId,
      onuSerial: initial?.onuSerial ?? "",
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

  const save = form.handleSubmit((values) => {
    onSubmit({
      id: initial?.id ?? randomId("cust"),
      tenantId,
      name: values.name,
      email: values.email,
      phone: values.phone,
      address: values.address,
      location: { lat: values.lat, lng: values.lng },
      mstId: values.mstId,
      splitterPort: values.splitterPort,
      fibreCoreId: values.fibreCoreId,
      onuSerial: values.onuSerial,
      oltName: values.oltName,
      ponPort: values.ponPort,
      rxSignal: values.rxSignal,
      txSignal: values.txSignal,
      accountStatus: values.accountStatus,
      online: initial?.online ?? false,
    });
  });

  return (
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
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...form.register("phone")} />
        </div>
        <div>
          <Label htmlFor="accountStatus">Account Status</Label>
          <Select id="accountStatus" {...form.register("accountStatus")}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
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
        <div>
          <Label htmlFor="onuSerial">ONU Serial</Label>
          <Input id="onuSerial" {...form.register("onuSerial")} />
        </div>
        <div>
          <Label htmlFor="ponPort">OLT/PON Port</Label>
          <Input id="ponPort" {...form.register("ponPort")} placeholder="1/3/7" />
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
          <Label htmlFor="oltName">OLT</Label>
          <Input id="oltName" {...form.register("oltName")} />
        </div>
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
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Customer"}
        </Button>
      </div>
    </form>
  );
}
