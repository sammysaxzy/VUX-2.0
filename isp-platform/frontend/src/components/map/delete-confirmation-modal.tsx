import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type DeleteConfirmationModalProps = {
  open: boolean;
  objectLabel: string;
  objectType?: string;
  busy?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export function DeleteConfirmationModal({
  open,
  objectLabel,
  objectType = "object",
  busy = false,
  onConfirm,
  onOpenChange,
}: DeleteConfirmationModalProps) {
  return (
    <Dialog
      open={open}
      title={`Delete ${objectType}`}
      description="Are you sure you want to delete this object?"
      onOpenChange={onOpenChange}
      className="max-w-lg"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-danger/35 bg-danger/5 p-3 text-sm">
          <p className="font-medium text-foreground">{objectLabel}</p>
          <p className="mt-1 text-muted-foreground">
            This will remove it from the map immediately and should also remove it from the backend record.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="danger" disabled={busy} onClick={onConfirm}>
            {busy ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
