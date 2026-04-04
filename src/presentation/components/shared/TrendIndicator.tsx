import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  value: number;
  suffix?: string;
}

export function TrendIndicator({ value, suffix = "%" }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isFlat = value === 0;

  return (
    <div
      data-testid="trend-indicator"
      className={`flex items-center gap-1 text-xs font-medium ${
        isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"
      }`}
    >
      {isPositive && <ArrowUp size={12} />}
      {isNegative && <ArrowDown size={12} />}
      {isFlat && <Minus size={12} />}
      <span>
        {isPositive && "+"}
        {value}
        {suffix}
      </span>
    </div>
  );
}

export default TrendIndicator;
