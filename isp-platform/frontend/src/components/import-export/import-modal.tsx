"use client";

import { startTransition, useRef, useState } from "react";
import { AlertCircle, FileUp, LoaderCircle, Upload } from "lucide-react";
import { ImportSummary } from "@/components/import-export/import-summary";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RADIUS_USER_IMPORT_EXPORT_SCHEMA, type RadiusImportFailure } from "@/features/import-export/schema";
import { createRadiusImportErrorReport, downloadCsvFile } from "@/features/import-export/utils";
import { useCSVParser } from "@/hooks/use-csv-parser";

type Props = {
  open: boolean;
  existingUsernames: string[];
  validNasIds: string[];
  importing?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmImport: (payload: ReturnType<typeof useCSVParser>["payload"]) => Promise<void>;
};

type CompletedImportSummary = {
  totalRows: number;
  successCount: number;
  failedRows: RadiusImportFailure[];
};

export function ImportModal({
  open,
  existingUsernames,
  validNasIds,
  importing,
  onOpenChange,
  onConfirmImport,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<CompletedImportSummary | null>(null);
  const parser = useCSVParser({ existingUsernames, validNasIds });

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      parser.reset();
      setCompletedSummary(null);
      setIsDragging(false);
    }
    onOpenChange(nextOpen);
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    startTransition(() => {
      setCompletedSummary(null);
      void parser.parseFile(file);
    });
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const downloadErrors = (failedRows: RadiusImportFailure[]) => {
    downloadCsvFile("radius-import-errors.csv", createRadiusImportErrorReport(failedRows));
  };

  const confirmImport = async () => {
    try {
      await onConfirmImport(parser.payload);
      setCompletedSummary({
        totalRows: parser.totalRows,
        successCount: parser.payload.length,
        failedRows: parser.failedRows,
      });
    } catch {
      const apiFailedRows = parser.importRows.map(({ payload, raw, rowNumber }) => {
        return {
          rowNumber,
          username: payload.username,
          reason: "Bulk import request failed.",
          raw,
        };
      });
      setCompletedSummary({
        totalRows: parser.totalRows,
        successCount: 0,
        failedRows: [...parser.failedRows, ...apiFailedRows],
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="Import RADIUS Users"
      description="Upload a CSV or XLSX file that matches the required migration schema exactly."
      className="max-w-5xl"
    >
      <div className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`rounded-2xl border border-dashed p-8 text-center transition ${
            isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/10 hover:bg-muted/20"
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-muted p-3">
              {parser.isParsing ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            </div>
            <div>
              <p className="font-medium">{parser.isParsing ? "Parsing file..." : "Drag and drop a CSV/XLSX file"}</p>
              <p className="text-sm text-muted-foreground">Or click to browse. Required headers must match exactly.</p>
              {parser.fileName ? <p className="mt-2 text-sm text-muted-foreground">Selected: {parser.fileName}</p> : null}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
        </div>

        {parser.fileError ? (
          <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{parser.fileError}</p>
          </div>
        ) : null}

        {completedSummary ? (
          <ImportSummary
            totalRows={completedSummary.totalRows}
            successCount={completedSummary.successCount}
            failedCount={completedSummary.failedRows.length}
            onDownloadErrors={
              completedSummary.failedRows.length ? () => downloadErrors(completedSummary.failedRows) : undefined
            }
          />
        ) : null}

        {!completedSummary && parser.totalRows > 0 ? (
          <ImportSummary
            totalRows={parser.totalRows}
            successCount={parser.payload.length}
            failedCount={parser.failedRows.length}
            onDownloadErrors={parser.failedRows.length ? () => downloadErrors(parser.failedRows) : undefined}
          />
        ) : null}

        {parser.previewRows.length ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Preview first 5 rows</p>
            </div>
            <div className="max-h-72 overflow-auto rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    {RADIUS_USER_IMPORT_EXPORT_SCHEMA.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parser.previewRows.map((row, index) => (
                    <TableRow key={`${row.username}-${index}`}>
                      {RADIUS_USER_IMPORT_EXPORT_SCHEMA.map((header) => (
                        <TableCell key={`${header}-${index}`}>{row[header]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        {parser.failedRows.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Validation errors</p>
            <div className="max-h-48 space-y-2 overflow-auto rounded-xl border border-border/70 p-3">
              {parser.failedRows.slice(0, 10).map((failure) => (
                <div key={`${failure.rowNumber}-${failure.username}`} className="rounded-lg bg-muted/20 p-3 text-sm">
                  <p className="font-medium">
                    Row {failure.rowNumber}: {failure.username || "No username"}
                  </p>
                  <p className="text-muted-foreground">{failure.reason}</p>
                </div>
              ))}
              {parser.failedRows.length > 10 ? (
                <p className="text-sm text-muted-foreground">Showing first 10 errors. Download the full error report for all rows.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!parser.hasImportableRows || parser.isParsing || importing} onClick={() => void confirmImport()}>
            {importing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            {importing ? "Importing..." : "Confirm Import"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
