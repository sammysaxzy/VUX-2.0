"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { GeoPoint } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const schema = z.object({
  name: z.string().min(3, "Name is required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  type: z.enum(["mst", "closure"]),
});

type FormValues = z.infer<typeof schema>;

type AddNodeFormProps = {
  onSubmit: (payload: { name: string; type: "mst" | "closure"; location: GeoPoint }) => void;
};

export function AddNodeForm({ onSubmit }: AddNodeFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      latitude: 6.455,
      longitude: 3.476,
      type: "mst",
    },
  });

  const submit = form.handleSubmit((values) => {
    onSubmit({
      name: values.name.trim(),
      type: values.type,
      location: { lat: values.latitude, lng: values.longitude },
    });
    form.reset({
      name: "",
      latitude: values.latitude,
      longitude: values.longitude,
      type: values.type,
    });
  });

  return (
    <form onSubmit={submit} className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Add Node (Coordinates)</p>

      <div>
        <Label htmlFor="node-name" className="text-xs">
          Name
        </Label>
        <Input id="node-name" placeholder="MST-KUKA-001" {...form.register("name")} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="node-lat" className="text-xs">
            Latitude
          </Label>
          <Input id="node-lat" type="number" step="any" {...form.register("latitude")} />
        </div>
        <div>
          <Label htmlFor="node-lng" className="text-xs">
            Longitude
          </Label>
          <Input id="node-lng" type="number" step="any" {...form.register("longitude")} />
        </div>
      </div>

      <div>
        <Label htmlFor="node-type" className="text-xs">
          Type
        </Label>
        <Select id="node-type" {...form.register("type")}>
          <option value="mst">MST</option>
          <option value="closure">Closure</option>
        </Select>
      </div>

      <Button type="submit" size="sm" className="w-full">
        Add Infrastructure Node
      </Button>
    </form>
  );
}
