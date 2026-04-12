import { Info } from "lucide-react";

interface InfoTooltipProps {
  content: React.ReactNode;
  testId?: string;
}

export default function InfoTooltip({ content, testId }: InfoTooltipProps) {
  return (
    <span className="group relative" data-testid={testId}>
      <Info size={13} className="text-muted-foreground cursor-help" />
      <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-72 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {content}
      </span>
    </span>
  );
}
