import { Waves, Bike, Footprints } from "lucide-react";

type Sport = "swim" | "bike" | "run";

interface SportIconProps {
  sport: Sport;
  size?: number;
  className?: string;
}

const sportColorVars: Record<Sport, string> = {
  swim: "var(--sport-swim)",
  bike: "var(--sport-bike)",
  run: "var(--sport-run)",
};

const sportIcons: Record<Sport, typeof Waves> = {
  swim: Waves,
  bike: Bike,
  run: Footprints,
};

export function SportIcon({ sport, size = 18, className }: SportIconProps) {
  const Icon = sportIcons[sport];
  const color = sportColorVars[sport];

  return (
    <span data-testid="sport-icon" className={className}>
      <Icon size={size} style={{ color }} />
    </span>
  );
}

export default SportIcon;
