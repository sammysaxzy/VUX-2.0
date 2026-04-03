"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ClosureBox, FibreCable } from "@/types";
import { Drawer } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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
};

export function ClosureSpliceForm({
  open,
  closure,
  cables,
  canEdit = true,
  canDelete = false,
  historyEntries,
  onAddNote,
  canAddNote = true,
  onOpenChange,
  onSave,
  onDelete,
  onDeleteClosure,
}: ClosureSpliceFormProps) {
  const [editingSpliceId, setEditingSpliceId] = useState<string | undefined>();
  const [fieldNote, setFieldNote] = useState("");
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
      form.reset();
    }
  }, [form, open]);

  useEffect(() => {
    setFieldNote("");
  }, [closure?.id]);

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
    <Drawer open={open} onOpenChange={onOpenChange} title={closure ? closure.name : "Closure Splicing"} description="Splicing only (field closure)">
      {closure ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Closure ID:</span> {closure.id}
            </p>
            <p>
              <span className="text-muted-foreground">Coordinates:</span> {closure.location.lat.toFixed(5)}, {closure.location.lng.toFixed(5)}
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Connected Fibres</p>
              <div className="flex flex-wrap gap-1.5">
                {closure.connectedCableIds.map((cableId) => {
                  const cable = cables.find((entry) => entry.id === cableId);
                  return (
                    <span key={cableId} className="rounded-full border border-border px-2 py-0.5 text-[11px]">
                      {cable?.name ?? cableId}
                    </span>
                  );
                })}
              </div>
              {closure.connectedCableIds.length === 0 ? (
                <p className="text-xs text-muted-foreground">No connected fibre cable yet.</p>
              ) : null}
            </div>
          </div>

          <form className="space-y-3" onSubmit={submit}>
            <div>
              <Label>From Cable</Label>
              <Select disabled={!canEdit} {...form.register("fromCableId")}>
                <option value="">Select cable</option>
                {cables.map((cable) => (
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
                {["blue", "orange", "green", "brown", "red", "yellow", "violet", "aqua"].map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>To Cable</Label>
              <Select disabled={!canEdit} {...form.register("toCableId")}>
                <option value="">Select cable</option>
                {cables.map((cable) => (
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
                {["blue", "orange", "green", "brown", "red", "yellow", "violet", "aqua"].map((color) => (
                  <option key={color} value={color}>
                    {color}
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
