interface ArchiveConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  equipmentName: string;
  isRestore?: boolean;
  loading?: boolean;
}

export default function ArchiveConfirmModal({ open, onClose, onConfirm, equipmentName, isRestore, loading }: ArchiveConfirmModalProps) {
  if (!open) return null;
  return (
    <div data-testid="archive-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-foreground">{isRestore ? "Gendan udstyr" : "Arkiver udstyr"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isRestore
            ? `Vil du gendanne "${equipmentName}"? Udstyret vil igen vaere synligt i din aktive liste og kan tilknyttes nye traeningssessioner.`
            : `Vil du arkivere "${equipmentName}"? Udstyret vil blive skjult fra din aktive liste. Al historik og statistik bevares. Du kan altid gendanne det igen.`
          }
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuller</button>
          <button onClick={onConfirm} disabled={loading} className={`rounded-md px-4 py-2 text-sm font-medium text-white ${isRestore ? "bg-primary hover:bg-primary/90" : "bg-amber-600 hover:bg-amber-700"} disabled:opacity-50`}>
            {isRestore ? "Gendan" : "Arkiver"}
          </button>
        </div>
      </div>
    </div>
  );
}
