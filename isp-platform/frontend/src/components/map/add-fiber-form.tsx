"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import length from "@turf/length";
import { lineString } from "@turf/helpers";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { GeoPoint, NetworkNode } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const coreCountValues = [2, 4, 8, 12, 24] as const;

const schema = z
  .object({
    name: z.string().optional(),
    mode: z.enum(["mst", "manual"]),
    startMstId: z.string().optional(),
    endMstId: z.string().optional(),
    startLat: z.coerce.number().optional(),
    startLng: z.coerce.number().optional(),
    endLat: z.coerce.number().optional(),
    endLng: z.coerce.number().optional(),
    coreCount: z.coerce.number().refine((value) => coreCountValues.includes(value as (typeof coreCountValues)[number])),
  })
  .superRefine((values, context) => {
    if (values.mode === "mst") {
      if (!values.startMstId) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["startMstId"], message: "Select start MST" });
      }
      if (!values.endMstId) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["endMstId"], message: "Select end MST" });
      }
      if (values.startMstId && values.endMstId && values.startMstId === values.endMstId) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["endMstId"], message: "MST endpoints must be different" });
      }
      return;
    }

    const coordinateFields: Array<keyof Pick<typeof values, "startLat" | "startLng" | "endLat" | "endLng">> = [
      "startLat",
      "startLng",
      "endLat",
      "endLng",
    ];
    coordinateFields.forEach((field) => {
      if (values[field] === undefined || Number.isNaN(values[field])) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Coordinate is required" });
      }
    });
  });

type FormValues = z.infer<typeof schema>;

type AddFiberPayload = {
  name?: string;
  start: GeoPoint;
  end: GeoPoint;
  coreCount: 2 | 4 | 8 | 12 | 24;
  startMstId?: string;
  endMstId?: string;
};

type AddFiberFormProps = {
  mstNodes: NetworkNode[];
  onSubmit: (payload: AddFiberPayload) => void;
};

export function AddFiberForm({ mstNodes, onSubmit }: AddFiberFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      mode: "mst",
      startMstId: "",
      endMstId: "",
      startLat: 6.455,
      startLng: 3.476,
      endLat: 6.46,
      endLng: 3.49,
      coreCount: 12,
    },
  });

  const mode = form.watch("mode");
  const startMstId = form.watch("startMstId");
  const endMstId = form.watch("endMstId");
  const startLat = form.watch("startLat");
  const startLng = form.watch("startLng");
  const endLat = form.watch("endLat");
  const endLng = form.watch("endLng");

  const previewDistance = useMemo(() => {
    if (mode === "mst") {
      const startNode = mstNodes.find((node) => node.id === startMstId);
      const endNode = mstNodes.find((node) => node.id === endMstId);
      if (!startNode || !endNode) return null;
      return Math.round(
        length(
          lineString([
            [startNode.location.lng, startNode.location.lat],
            [endNode.location.lng, endNode.location.lat],
          ]),
          { units: "kilometers" },
        ) * 1000,
      );
    }

    if (
      startLat === undefined ||
      startLng === undefined ||
      endLat === undefined ||
      endLng === undefined ||
      Number.isNaN(startLat) ||
      Number.isNaN(startLng) ||
      Number.isNaN(endLat) ||
      Number.isNaN(endLng)
    ) {
      return null;
    }

    return Math.round(
      length(
        lineString([
          [startLng, startLat],
          [endLng, endLat],
        ]),
        { units: "kilometers" },
      ) * 1000,
    );
  }, [endLat, endLng, endMstId, mode, mstNodes, startLat, startLng, startMstId]);

  const submit = form.handleSubmit((values) => {
    if (values.mode === "mst") {
      const startNode = mstNodes.find((node) => node.id === values.startMstId);
      const endNode = mstNodes.find((node) => node.id === values.endMstId);
      if (!startNode || !endNode) return;
      onSubmit({
        name: values.name?.trim(),
        startMstId: startNode.id,
        endMstId: endNode.id,
        start: startNode.location,
        end: endNode.location,
        coreCount: values.coreCount as 2 | 4 | 8 | 12 | 24,
      });
      return;
    }

    if (
      values.startLat === undefined ||
      values.startLng === undefined ||
      values.endLat === undefined ||
      values.endLng === undefined
    ) {
      return;
    }

    onSubmit({
      name: values.name?.trim(),
      start: { lat: values.startLat, lng: values.startLng },
      end: { lat: values.endLat, lng: values.endLng },
      coreCount: values.coreCount as 2 | 4 | 8 | 12 | 24,
    });
  });

  return (
    <form onSubmit={submit} className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Add Fibre (Coordinates)</p>

      <div>
        <Label htmlFor="fiber-name" className="text-xs">
          Cable Name (Optional)
        </Label>
        <Input id="fiber-name" placeholder="MST-KUKA-001 to MST-KUKA-002" {...form.register("name")} />
      </div>

      <div>
        <Label htmlFor="fiber-mode" className="text-xs">
          Coordinate Source
        </Label>
        <Select id="fiber-mode" {...form.register("mode")}>
          <option value="mst">Select MST Markers</option>
          <option value="manual">Manual Coordinates</option>
        </Select>
      </div>

      {mode === "mst" ? (
        <div className="grid grid-cols-1 gap-2">
          <div>
            <Label htmlFor="fiber-start-mst" className="text-xs">
              Start MST
            </Label>
            <Select id="fiber-start-mst" {...form.register("startMstId")}>
              <option value="">Select start MST</option>
              {mstNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="fiber-end-mst" className="text-xs">
              End MST
            </Label>
            <Select id="fiber-end-mst" {...form.register("endMstId")}>
              <option value="">Select end MST</option>
              {mstNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="fiber-start-lat" className="text-xs">
              Start Lat
            </Label>
            <Input id="fiber-start-lat" type="number" step="any" {...form.register("startLat")} />
          </div>
          <div>
            <Label htmlFor="fiber-start-lng" className="text-xs">
              Start Lng
            </Label>
            <Input id="fiber-start-lng" type="number" step="any" {...form.register("startLng")} />
          </div>
          <div>
            <Label htmlFor="fiber-end-lat" className="text-xs">
              End Lat
            </Label>
            <Input id="fiber-end-lat" type="number" step="any" {...form.register("endLat")} />
          </div>
          <div>
            <Label htmlFor="fiber-end-lng" className="text-xs">
              End Lng
            </Label>
            <Input id="fiber-end-lng" type="number" step="any" {...form.register("endLng")} />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="fiber-core-count" className="text-xs">
          Core Count
        </Label>
        <Select id="fiber-core-count" {...form.register("coreCount")}>
          {coreCountValues.map((count) => (
            <option key={count} value={count}>
              {count}-core
            </option>
          ))}
        </Select>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {previewDistance !== null ? `Distance: ${(previewDistance / 1000).toFixed(2)} km` : "Provide valid endpoints to preview distance"}
      </p>

      <Button type="submit" size="sm" className="w-full">
        Create Fibre Polyline
      </Button>
    </form>
  );
}
