import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  details?: { label: string; value: React.ReactNode }[];
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  details,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  loading,
  onConfirm,
}: ConfirmDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="max-w-md rounded-lg">
      <AlertDialogHeader>
        <AlertDialogTitle className="font-serif text-base">{title}</AlertDialogTitle>
        {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
      </AlertDialogHeader>

      {details && details.length > 0 && (
        <div className="rounded-md border border-border bg-secondary/50 p-3 text-sm">
          {details.map((d) => (
            <div key={d.label} className="flex min-w-0 items-start justify-between gap-3 py-0.5">
              <span className="text-xs font-medium text-muted-foreground">{d.label}</span>
              <span className="min-w-0 break-words text-right font-medium text-foreground">{d.value}</span>
            </div>
          ))}
        </div>
      )}

      <AlertDialogFooter className="gap-2">
        <AlertDialogCancel className="h-10 rounded-md">{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction
          disabled={loading}
          onClick={onConfirm}
          className={cn(
            "h-10 rounded-md",
            destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          )}
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default ConfirmDialog;
