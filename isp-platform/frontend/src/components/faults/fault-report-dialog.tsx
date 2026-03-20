"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Fault, FibreCable, NetworkNode } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  title: z.string().min(3),
  description: z.string().min(6),
  severity: z.enum(["minor", "major", "critical"]),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  affectedNodeId: z.string().optional(),
  affectedCableId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  nodes: NetworkNode[];
  cables: FibreCable[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: Omit<Fault, "id" | "tenantId" | "createdAt">) => void;
  submitting?: boolean;
};

export function FaultReportDialog({ open, nodes, cables, onOpenChange, onSubmit, submitting }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      severity: "major",
      lat: 6.444,
      lng: 3.482,
      affectedNodeId: "",
      affectedCableId: "",
    },
  });

  const save = form.handleSubmit((values) => {
    onSubmit({
      title: values.title,
      description: values.description,
      severity: values.severity,
      status: "open",
      location: { lat: values.lat, lng: values.lng },
      affectedNodeId: values.affectedNodeId || undefined,
      affectedCableId: values.affectedCableId || undefined,
    });
    form.reset();
    onOpenChange(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Report Network Fault"
      description="Mark location, add impact notes, and broadcast to NOC in real-time."
    >
      <form className="space-y-4" onSubmit={save}>
        <div>
          <Label htmlFor="title">Fault Title</Label>
          <Input id="title" {...form.register("title")} />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" {...form.register("description")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="severity">Severity</Label>
            <Select id="severity" {...form.register("severity")}>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="lat">Lat</Label>
              <Input id="lat" type="number" step="any" {...form.register("lat")} />
            </div>
            <div>
              <Label htmlFor="lng">Lng</Label>
              <Input id="lng" type="number" step="any" {...form.register("lng")} />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="affectedNodeId">Affected Node</Label>
            <Select id="affectedNodeId" {...form.register("affectedNodeId")}>
              <option value="">Not specified</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="affectedCableId">Affected Cable</Label>
            <Select id="affectedCableId" {...form.register("affectedCableId")}>
              <option value="">Not specified</option>
              {cables.map((cable) => (
                <option key={cable.id} value={cable.id}>
                  {cable.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Fault"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
