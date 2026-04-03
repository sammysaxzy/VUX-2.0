import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/mapbox";
import type { FibreCable } from "@/types";

export const FIBER_ROUTE_LAYER_IDS = ["fibre-lines", "fibre-labels", "fault-glow"] as const;

type FiberRouteRendererProps = {
  cables: FibreCable[];
  highlightedCableId?: string;
  resolvedTheme: "light" | "dark";
};

export function FiberRouteRenderer({ cables, highlightedCableId, resolvedTheme }: FiberRouteRendererProps) {
  const cableSource = useMemo(
    () => ({
      type: "FeatureCollection",
      features: cables.map((cable) => {
        const cablePath = cable.geometry?.length ? cable.geometry : cable.coordinates;
        const usedCores = cable.cores.filter((core) => core.status === "used").length;
        const freeCores = Math.max(cable.coreCount - usedCores, 0);
        return {
          type: "Feature",
          id: cable.id,
          properties: {
            id: cable.id,
            faulted: cable.faulted,
            highlighted: cable.id === highlightedCableId,
            coreCount: cable.coreCount,
            usedCores,
            freeCores,
            segmentType: cable.segmentType ?? "distribution",
            flowDirection: cable.segmentType === "drop" ? "drop" : "outgoing",
            label:
              cable.segmentType === "drop"
                ? `${cable.coreUsed ?? "Drop"} • Port ${cable.splitterPort ?? "-"}`
                : `${cable.coreCount}-core`,
          },
          geometry: {
            type: "LineString",
            coordinates: cablePath.map((coord) => [coord.lng, coord.lat]),
          },
        };
      }),
    }),
    [cables, highlightedCableId],
  );

  return (
    <Source id="fibre-source" type="geojson" data={cableSource as GeoJSON.FeatureCollection}>
      <Layer
        id="fibre-lines"
        type="line"
        paint={{
          "line-width": [
            "case",
            ["boolean", ["get", "highlighted"], false],
            8,
            ["boolean", ["get", "faulted"], false],
            6,
            ["==", ["get", "segmentType"], "drop"],
            5,
            4,
          ],
          "line-color": [
            "case",
            ["boolean", ["get", "highlighted"], false],
            "#F97316",
            ["boolean", ["get", "faulted"], false],
            "#EF4444",
            ["==", ["get", "segmentType"], "drop"],
            "#2563EB",
            ["==", ["get", "flowDirection"], "incoming"],
            "#0D9488",
            ["==", ["get", "segmentType"], "backbone"],
            "#0F766E",
            "#2DD4BF",
          ],
          "line-opacity": 0.9,
        }}
      />
      <Layer
        id="fibre-labels"
        type="symbol"
        layout={{
          "symbol-placement": "line-center",
          "text-field": ["get", "label"],
          "text-size": 11,
        }}
        paint={{
          "text-color": resolvedTheme === "dark" ? "#E2E8F0" : "#111827",
          "text-halo-color": resolvedTheme === "dark" ? "#0F172A" : "#FFFFFF",
          "text-halo-width": 1,
        }}
      />
      <Layer
        id="fault-glow"
        type="line"
        filter={["==", ["get", "faulted"], true]}
        paint={{
          "line-color": "#EF4444",
          "line-width": 14,
          "line-opacity": 0.15,
          "line-blur": 1.1,
        }}
      />
    </Source>
  );
}
