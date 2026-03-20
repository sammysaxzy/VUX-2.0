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
};

export function ClosureSpliceForm({ open, closure, cables, onOpenChange, onSave, onDelete }: ClosureSpliceFormProps) {
  const [editingSpliceId, setEditingSpliceId] = useState<string | undefined>();
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
      form.reset();
    }
  }, [form, open]);

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
    <Drawer open={open} onOpenChange={onOpenChange} title={closure ? closure.name : "Closure Splicing"} description="Define and edit splice mappings">
      {closure ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Closure ID:</span> {closure.id}
            </p>
            <p>
              <span className="text-muted-foreground">Coordinates:</span> {closure.location.lat.toFixed(5)}, {closure.location.lng.toFixed(5)}
            </p>
          </div>

          <form className="space-y-3" onSubmit={submit}>
            <div>
              <Label>From Cable</Label>
              <Select {...form.register("fromCableId")}>
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
              <Select {...form.register("fromCoreColor")}>
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
              <Select {...form.register("toCableId")}>
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
              <Select {...form.register("toCoreColor")}>
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
              <Textarea {...form.register("notes")} />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit">{editingSpliceId ? "Update Splice" : "Save Splice"}</Button>
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
                  <Button type="button" size="sm" variant="outline" onClick={() => handleEdit(splice)}>
                    Edit
                  </Button>
                  {onDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
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
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a closure marker to open splice form.</p>
      )}
    </Drawer>
  );
}
