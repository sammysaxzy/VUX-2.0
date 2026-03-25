"use client";

import { Button } from "@/components/ui/button";

type Props = {
  totalRows: number;
  successCount: number;
  failedCount: number;
  onDownloadErrors?: () => void;
};

export function ImportSummary({ totalRows, successCount, failedCount, onDownloadErrors }: Props) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total rows</p>
          <p className="text-xl font-semibold">{totalRows}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Successful imports</p>
          <p className="text-xl font-semibold text-success">{successCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Failed rows</p>
          <p className="text-xl font-semibold text-danger">{failedCount}</p>
        </div>
      </div>
      {failedCount > 0 && onDownloadErrors ? (
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="outline" onClick={onDownloadErrors}>
            Download Error Report
          </Button>
        </div>
      ) : null}
    </div>
  );
}

