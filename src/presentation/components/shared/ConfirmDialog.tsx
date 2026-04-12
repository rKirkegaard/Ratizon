interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmClassName?: string;
  loading?: boolean;
}

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Slet", confirmClassName, loading }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div data-testid="confirm-dialog" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuller</button>
          <button onClick={onConfirm} disabled={loading} className={confirmClassName ?? "rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
