"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Cable, CircuitBoard, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { AssetPhotoSlot, ClosureBox, Customer, FibreCable } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const TRAY_COLORS = [
  { name: "Blue", hex: "#2563EB" },
  { name: "Orange", hex: "#EA580C" },
  { name: "Green", hex: "#16A34A" },
  { name: "Brown", hex: "#92400E" },
  { name: "Slate", hex: "#475569" },
  { name: "White", hex: "#E5E7EB" },
  { name: "Red", hex: "#DC2626" },
  { name: "Black", hex: "#111827" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Violet", hex: "#7C3AED" },
  { name: "Rose", hex: "#E11D48" },
  { name: "Aqua", hex: "#06B6D4" },
] as const;

const schema = z.object({
  fromCableId: z.string().min(1),
  fromCoreColor: z.string().min(1),
  toCableId: z.string().min(1),
  toCoreColor: z.string().min(1),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type ClosureSpliceFormProps = {
  open: boolean;
  closure?: ClosureBox;
  cables: FibreCable[];
  customers?: Customer[];
  canEdit?: boolean;
  canDelete?: boolean;
  historyEntries?: Array<{ id: string; message: string; timestamp: string }>;
  onAddNote?: (payload: { nodeId: string; note: string }) => void;
  canAddNote?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: {
    closureId: string;
    splice: {
      id?: string;
      fromCableId: string;
      fromCoreColor: string;
      toCableId: string;
      toCoreColor: string;
      notes?: string;
    };
  }) => void;
  onDelete?: (payload: { closureId: string; spliceId: string }) => void;
  onDeleteClosure?: (payload: { closureId: string }) => void;
  onSavePhotos?: (payload: { closureId: string; photos: AssetPhotoSlot[] }) => void;
};

type SpliceTrayCore = {
  id: string;
  cableId: string;
  cableName: string;
  coreId?: string;
  label: string;
  colorName: string;
  hex: string;
  status: "free" | "used" | "reserved" | "faulty" | "damaged" | "dark";
  usagePath?: string;
  customerIds: string[];
  splicePeerIds: string[];
};

const normalizeColor = (value: string) => value.trim().toLowerCase();

const colorVariantMap: Record<SpliceTrayCore["status"], "success" | "warning" | "danger" | "info" | "outline"> = {
  free: "success",
  used: "warning",
  reserved: "info",
  faulty: "danger",
  damaged: "danger",
  dark: "outline",
};

function describeStatus(status: SpliceTrayCore["status"]) {
  switch (status) {
    case "free":
      return "Spare";
    case "used":
      return "Live";
    case "reserved":
      return "Reserved";
    case "faulty":
      return "Faulty";
    case "damaged":
      return "Damaged";
    case "dark":
      return "Dark fiber";
    default:
      return status;
  }
}

export function ClosureSpliceForm({
  open,
  closure,
  cables,
  customers = [],
  canEdit = true,
  canDelete = false,
  historyEntries,
  onAddNote,
  canAddNote = true,
  onOpenChange,
  onSave,
  onDelete,
  onDeleteClosure,
  onSavePhotos,
}: ClosureSpliceFormProps) {
  const [editingSpliceId, setEditingSpliceId] = useState<string | undefined>();
  const [fieldNote, setFieldNote] = useState("");
  const [selectedTrayCoreId, setSelectedTrayCoreId] = useState<string | undefined>();
  const [photoSlots, setPhotoSlots] = useState<AssetPhotoSlot[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fromCableId: "",
      fromCoreColor: "",
      toCableId: "",
      toCoreColor: "",
      notes: "",
    },
  });

  const connectedCables = useMemo(
    () => cables.filter((cable) => closure?.connectedCableIds.includes(cable.id)),
    [cables, closure?.connectedCableIds],
  );

  const trayCores = useMemo(() => {
    if (!closure) return [] as SpliceTrayCore[];

    return connectedCables.flatMap((cable) =>
      TRAY_COLORS.map((color) => {
        const matchedCore = cable.cores.find((core) => normalizeColor(core.label.split("-")[0]) === normalizeColor(color.name));
        const dependentCustomers = customers.filter(
          (customer) =>
            customer.dropCableId === cable.id ||
            customer.fibreCoreId === matchedCore?.id ||
            matchedCore?.assignedToCustomerId === customer.id,
        );
        const splicePeerIds = closure.splices
          .filter(
            (splice) =>
              (splice.fromCableId === cable.id && normalizeColor(splice.fromCoreColor) === normalizeColor(color.name)) ||
              (splice.toCableId === cable.id && normalizeColor(splice.toCoreColor) === normalizeColor(color.name)),
          )
          .map((splice) => splice.id);

        return {
          id: `${cable.id}:${color.name}`,
          cableId: cable.id,
          cableName: cable.name,
          coreId: matchedCore?.id,
          label: matchedCore?.label ?? `${color.name}-tray`,
          colorName: color.name,
          hex: matchedCore?.color ?? color.hex,
          status: matchedCore?.status ?? "dark",
          usagePath: matchedCore?.usagePath,
          customerIds: dependentCustomers.map((customer) => customer.id),
          splicePeerIds,
        } satisfies SpliceTrayCore;
      }),
    );
  }, [closure, connectedCables, customers]);

  const trayCoreLookup = useMemo(() => {
    const lookup = new Map<string, SpliceTrayCore>();
    trayCores.forEach((core) => lookup.set(core.id, core));
    return lookup;
  }, [trayCores]);

  const selectedTrayCore = useMemo(
    () => (selectedTrayCoreId ? trayCoreLookup.get(selectedTrayCoreId) : trayCores[0]),
    [selectedTrayCoreId, trayCoreLookup, trayCores],
  );

  const impactedCustomers = useMemo(() => {
    if (!selectedTrayCore) return [] as Customer[];
    return customers.filter((customer) => selectedTrayCore.customerIds.includes(customer.id));
  }, [customers, selectedTrayCore]);

  const selectedCoreSplices = useMemo(() => {
    if (!closure || !selectedTrayCore) return [] as ClosureBox["splices"];
    return closure.splices.filter(
      (splice) =>
        (splice.fromCableId === selectedTrayCore.cableId && normalizeColor(splice.fromCoreColor) === normalizeColor(selectedTrayCore.colorName)) ||
        (splice.toCableId === selectedTrayCore.cableId && normalizeColor(splice.toCoreColor) === normalizeColor(selectedTrayCore.colorName)),
    );
  }, [closure, selectedTrayCore]);

  const faultPaths = useMemo(() => {
    if (!selectedTrayCore) return [] as string[];
    if (impactedCustomers.length === 0) {
      return [`${selectedTrayCore.cableName} -> ${selectedTrayCore.colorName} tray core -> no active customer dependency`];
    }

    return impactedCustomers.map((customer) => {
      const relatedSplice = selectedCoreSplices[0];
      const upstreamPath = relatedSplice
        ? `${relatedSplice.fromCableId} ${relatedSplice.fromCoreColor} -> Closure ${closure?.name ?? ""} -> ${relatedSplice.toCableId} ${relatedSplice.toCoreColor}`
        : `${selectedTrayCore.cableName} ${selectedTrayCore.colorName}`;
      return `${upstreamPath} -> MST ${customer.mstId ?? "-"} -> ${customer.name}`;
    });
  }, [closure?.name, impactedCustomers, selectedCoreSplices, selectedTrayCore]);

  const submit = form.handleSubmit((values) => {
    if (!closure) return;
    onSave({
      closureId: closure.id,
      splice: {
        id: editingSpliceId,
        fromCableId: values.fromCableId,
        fromCoreColor: values.fromCoreColor,
        toCableId: values.toCableId,
        toCoreColor: values.toCoreColor,
        notes: values.notes,
      },
    });
    form.reset();
    setEditingSpliceId(undefined);
  });

  useEffect(() => {
    if (!open) {
      setEditingSpliceId(undefined);
      setFieldNote("");
      setSelectedTrayCoreId(undefined);
      setPhotoSlots(
        closure?.photos?.length
          ? closure.photos
          : [
              { id: "before", label: "before_installation", title: "Before Installation" },
              { id: "after", label: "after_installation", title: "After Installation" },
              { id: "current", label: "current_condition", title: "Current Condition" },
            ],
      );
      form.reset();
    }
  }, [form, open]);

  useEffect(() => {
    setFieldNote("");
    setSelectedTrayCoreId(undefined);
    setPhotoSlots(
      closure?.photos?.length
        ? closure.photos
        : [
            { id: "before", label: "before_installation", title: "Before Installation" },
            { id: "after", label: "after_installation", title: "After Installation" },
            { id: "current", label: "current_condition", title: "Current Condition" },
          ],
    );
  }, [closure?.id, closure?.photos]);

  const handleEdit = (splice: ClosureBox["splices"][number]) => {
    setEditingSpliceId(splice.id);
    form.reset({
      fromCableId: splice.fromCableId,
      fromCoreColor: splice.fromCoreColor,
      toCableId: splice.toCableId,
      toCoreColor: splice.toCoreColor,
      notes: splice.notes ?? "",
    });
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={closure ? `${closure.name} Splice Tray` : "Closure Splicing"}
      description="Operational splice tray, core tracing, and customer dependency view"
    >
      {closure ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Closure ID:</span> {closure.id}
            </p>
            <p>
              <span className="text-muted-foreground">Coordinates:</span> {closure.location.lat.toFixed(5)}, {closure.location.lng.toFixed(5)}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-border/70 bg-background/80 p-2">
                <p className="text-muted-foreground">Connected cables</p>
                <p className="mt-1 text-base font-semibold">{connectedCables.length}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/80 p-2">
                <p className="text-muted-foreground">Splice links</p>
                <p className="mt-1 text-base font-semibold">{closure.splices.length}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/80 p-2">
                <p className="text-muted-foreground">Dependent users</p>
                <p className="mt-1 text-base font-semibold">{new Set(trayCores.flatMap((core) => core.customerIds)).size}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Closure Photos</p>
              <Badge variant="outline">{photoSlots.filter((slot) => Boolean(slot.url)).length}/3 ready</Badge>
            </div>
            <div className="mt-3 space-y-3">
              {photoSlots.map((slot) => (
                <div key={slot.id} className="rounded-lg border border-border/60 bg-background/70 p-2">
                  <p className="text-sm font-medium">{slot.title}</p>
                  <Input
                    className="mt-2"
                    placeholder="Paste photo URL or storage link"
                    value={slot.url ?? ""}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setPhotoSlots((prev) => prev.map((entry) => entry.id === slot.id ? { ...entry, url: event.target.value } : entry))
                    }
                  />
                  <Textarea
                    className="mt-2 min-h-[72px]"
                    placeholder="Inspection or field note"
                    value={slot.note ?? ""}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setPhotoSlots((prev) => prev.map((entry) => entry.id === slot.id ? { ...entry, note: event.target.value } : entry))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">Save inspection photos for before, after, and current field state.</p>
              <Button
                type="button"
                size="sm"
                disabled={!closure || !onSavePhotos || !canEdit}
                onClick={() => {
                  if (!closure || !onSavePhotos) return;
                  onSavePhotos({
                    closureId: closure.id,
                    photos: photoSlots.map((slot) => ({
                      ...slot,
                      capturedAt: slot.url ? (slot.capturedAt ?? new Date().toISOString()) : undefined,
                    })),
                  });
                }}
              >
                Save Photos
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-center gap-2">
              <CircuitBoard className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Fiber Splice Tray</p>
            </div>
            <div className="mt-3 space-y-3">
              {connectedCables.map((cable) => {
                const cableTray = trayCores.filter((core) => core.cableId === cable.id);
                return (
                  <div key={cable.id} className="rounded-xl border border-border/70 bg-background/80 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{cable.name}</p>
                        <p className="text-[11px] text-muted-foreground">{cable.coreCount}-core • {cable.routeStatus ?? "existing"} • {cable.installationMethod ?? "underground"}</p>
                      </div>
                      <Badge variant="outline">{cable.cableType ?? `${cable.coreCount}-core`}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {cableTray.map((core) => {
                        const isSelected = selectedTrayCore?.id === core.id;
                        return (
                          <button
                            key={core.id}
                            type="button"
                            onClick={() => setSelectedTrayCoreId(core.id)}
                            className={`rounded-xl border p-2 text-left transition ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-950/20"
                                : "border-border/70 bg-background/70 hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: core.hex }} />
                              <p className="text-[11px] font-semibold">{core.colorName}</p>
                            </div>
                            <p className="mt-1 text-[10px] text-muted-foreground">{core.label}</p>
                            <Badge className="mt-2" variant={colorVariantMap[core.status]}>
                              {describeStatus(core.status)}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {connectedCables.length === 0 ? <p className="text-xs text-muted-foreground">No connected fibre cable yet.</p> : null}
            </div>
          </div>

          {selectedTrayCore ? (
            <div className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected Core Trace</p>
                  <p className="mt-1 text-sm font-semibold">{selectedTrayCore.cableName} • {selectedTrayCore.label}</p>
                </div>
                <Badge variant={colorVariantMap[selectedTrayCore.status]}>{describeStatus(selectedTrayCore.status)}</Badge>
              </div>

              <div className="grid gap-2 text-sm">
                <p><span className="text-muted-foreground">Origin cable:</span> {selectedTrayCore.cableName}</p>
                <p><span className="text-muted-foreground">Terminates at:</span> {closure.name}</p>
                <p><span className="text-muted-foreground">Splice links:</span> {selectedCoreSplices.length}</p>
                <p><span className="text-muted-foreground">Customer dependency:</span> {impactedCustomers.length} customer(s)</p>
                <p><span className="text-muted-foreground">Core path:</span> {selectedTrayCore.usagePath ?? "Awaiting assignment or spare path"}</p>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Affected Customers If This Core Breaks</p>
                </div>
                <div className="mt-2 space-y-2">
                  {impactedCustomers.map((customer) => (
                    <div key={customer.id} className="rounded-lg border border-border/70 bg-background/70 p-2 text-sm">
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-[11px] text-muted-foreground">{customer.planName ?? "Service plan"} • {customer.address}</p>
                    </div>
                  ))}
                  {impactedCustomers.length === 0 ? <p className="text-xs text-muted-foreground">No live customer is currently depending on this tray core.</p> : null}
                </div>
              </div>

              <div className="rounded-xl border border-red-300/60 bg-red-50/70 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700 dark:text-red-300">Fault Path Preview</p>
                </div>
                <div className="mt-2 space-y-2 text-sm">
                  {faultPaths.map((path) => (
                    <div key={path} className="rounded-lg border border-red-200/70 bg-white/80 p-2 dark:border-red-900/40 dark:bg-background/40">
                      {path}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                <div className="flex items-center gap-2">
                  <Cable className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Splice Records For This Core</p>
                </div>
                <div className="mt-2 space-y-2">
                  {selectedCoreSplices.map((splice) => (
                    <div key={splice.id} className="rounded-lg border border-border/70 bg-background/70 p-2 text-xs">
                      <p>{splice.fromCableId} ({splice.fromCoreColor}) {"->"} {splice.toCableId} ({splice.toCoreColor})</p>
                      {splice.notes ? <p className="mt-1 text-muted-foreground">{splice.notes}</p> : null}
                    </div>
                  ))}
                  {selectedCoreSplices.length === 0 ? <p className="text-xs text-muted-foreground">No splice mapping recorded for this tray color yet.</p> : null}
                </div>
              </div>
            </div>
          ) : null}

          <form className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-3" onSubmit={submit}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Add Or Update Splice Mapping</p>
            <div>
              <Label>From Cable</Label>
              <Select disabled={!canEdit} {...form.register("fromCableId")}>
                <option value="">Select cable</option>
                {connectedCables.map((cable) => (
                  <option key={cable.id} value={cable.id}>
                    {cable.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>From Core Color</Label>
              <Select disabled={!canEdit} {...form.register("fromCoreColor")}>
                <option value="">Select color</option>
                {TRAY_COLORS.map((color) => (
                  <option key={color.name} value={color.name}>
                    {color.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>To Cable</Label>
              <Select disabled={!canEdit} {...form.register("toCableId")}>
                <option value="">Select cable</option>
                {connectedCables.map((cable) => (
                  <option key={cable.id} value={cable.id}>
                    {cable.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>To Core Color</Label>
              <Select disabled={!canEdit} {...form.register("toCoreColor")}>
                <option value="">Select color</option>
                {TRAY_COLORS.map((color) => (
                  <option key={color.name} value={color.name}>
                    {color.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea disabled={!canEdit} {...form.register("notes")} />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={!canEdit}>{editingSpliceId ? "Update Splice" : "Save Splice"}</Button>
              {editingSpliceId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingSpliceId(undefined);
                    form.reset();
                  }}
                >
                  Cancel Edit
                </Button>
              ) : null}
            </div>
          </form>

          <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Existing Splices</p>
            {closure.splices.map((splice) => (
              <div key={splice.id} className="rounded-lg border border-border/60 px-2 py-1 text-xs">
                <p>
                  {splice.fromCableId} ({splice.fromCoreColor}) {"->"} {splice.toCableId} ({splice.toCoreColor})
                </p>
                {splice.notes ? <p className="mt-1 text-muted-foreground">{splice.notes}</p> : null}
                <div className="mt-2 flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={!canEdit} onClick={() => handleEdit(splice)}>
                    Edit
                  </Button>
                  {onDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      disabled={!canDelete}
                      onClick={() => onDelete({ closureId: closure.id, spliceId: splice.id })}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {closure.splices.length === 0 ? <p className="text-xs text-muted-foreground">No splices yet.</p> : null}
          </div>

          <div className="rounded-xl border border-danger/40 bg-danger/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-danger">Danger Zone</p>
            <Button
              className="mt-2"
              variant="danger"
              disabled={!onDeleteClosure || !canDelete}
              onClick={() => onDeleteClosure?.({ closureId: closure.id })}
            >
              Delete Closure
            </Button>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Work History</p>
            {onAddNote && closure ? (
              <div className="mt-2 grid gap-2">
                <Textarea
                  value={fieldNote}
                  onChange={(event) => setFieldNote(event.target.value)}
                  placeholder="Field notes for this closure"
                  className="min-h-[80px]"
                  disabled={!canAddNote}
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">Notes are saved to the work history timeline.</p>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!fieldNote.trim() || !canAddNote}
                    onClick={() => {
                      if (!closure || !onAddNote) return;
                      const trimmed = fieldNote.trim();
                      if (!trimmed) return;
                      onAddNote({ nodeId: closure.id, note: trimmed });
                      setFieldNote("");
                    }}
                  >
                    Save Note
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="mt-2 space-y-2 text-xs text-muted-foreground">
              {(historyEntries ?? []).slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border/60 bg-background/70 px-2 py-1.5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{entry.timestamp}</p>
                  <p className="mt-1 text-sm text-foreground">{entry.message}</p>
                </div>
              ))}
              {(historyEntries ?? []).length === 0 ? <p>No recent activity logged.</p> : null}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a closure marker to open splice form.</p>
      )}
    </Drawer>
  );
}
