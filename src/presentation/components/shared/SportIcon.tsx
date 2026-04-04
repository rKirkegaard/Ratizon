import {
  Waves,
  Bike,
  Footprints,
  Dumbbell,
  Mountain,
  Flame,
  Heart,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { useAthleteStore } from "@/application/stores/athleteStore";

const ICON_MAP: Record<string, LucideIcon> = {
  waves: Waves,
  bike: Bike,
  footprints: Footprints,
  dumbbell: Dumbbell,
  mountain: Mountain,
  flame: Flame,
  heart: Heart,
  activity: Activity,
};

interface SportIconProps {
  sport: string;
  size?: number;
  className?: string;
  color?: string;
}

export function SportIcon({ sport, size = 18, className, color }: SportIconProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const getSportIcon = useAthleteStore((s) => s.getSportIcon);

  const iconName = getSportIcon(sport);
  const resolvedColor = color ?? getSportColor(sport);
  const Icon = ICON_MAP[iconName] ?? Activity;

  return (
    <span data-testid="sport-icon" data-sport={sport} className={className}>
      <Icon size={size} style={{ color: resolvedColor }} />
    </span>
  );
}

export default SportIcon;
