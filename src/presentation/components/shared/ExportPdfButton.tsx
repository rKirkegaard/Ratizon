import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

interface ExportPdfButtonProps {
  onClick: () => void | Promise<void>;
  label?: string;
}

export default function ExportPdfButton({ onClick, label = "Eksporter PDF" }: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      data-testid="export-pdf"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
