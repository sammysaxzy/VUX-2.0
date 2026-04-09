import type { RadiusTrafficPoint } from "@/types";
import { formatRelativeDate } from "@/lib/utils";

type Props = {
  points: RadiusTrafficPoint[];
  offline?: boolean;
};

const chartWidth = 720;
const chartHeight = 260;
const padding = { top: 20, right: 18, bottom: 36, left: 42 };

function buildLine(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function TrafficChart({ points, offline = false }: Props) {
  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground">
        No traffic data available.
      </div>
    );
  }

  const maxValue = Math.max(1, ...points.flatMap((point) => [point.upload, point.download]));
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const lastIndex = Math.max(1, points.length - 1);

  const downloadPoints = points.map((point, index) => ({
    x: padding.left + (index / lastIndex) * innerWidth,
    y: padding.top + innerHeight - (point.download / maxValue) * innerHeight,
  }));
  const uploadPoints = points.map((point, index) => ({
    x: padding.left + (index / lastIndex) * innerWidth,
    y: padding.top + innerHeight - (point.upload / maxValue) * innerHeight,
  }));

  const ticks = [0, maxValue / 2, maxValue].map((value) => Number(value.toFixed(1)));
  const xLabels = [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]].filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            Download
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Upload
          </span>
        </div>
        {offline ? <span>Session ended</span> : <span>Live refresh enabled</span>}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/40 p-3">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-64 w-full" preserveAspectRatio="none" role="img" aria-label="Traffic chart">
          {ticks.map((tick) => {
            const y = padding.top + innerHeight - (tick / maxValue) * innerHeight;
            return (
              <g key={tick}>
                <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" />
                <text x={8} y={y + 4} fontSize="12" fill="currentColor" opacity="0.7">
                  {tick} Mbps
                </text>
              </g>
            );
          })}
          <path d={buildLine(downloadPoints)} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <path d={buildLine(uploadPoints)} fill="none" stroke="#10b981" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {xLabels.map((point, index) => {
            const x = padding.left + ((points.indexOf(point) || 0) / lastIndex) * innerWidth;
            return (
              <text key={`${point.time}-${index}`} x={x} y={chartHeight - 10} textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.7">
                {formatRelativeDate(point.time)}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
