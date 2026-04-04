type TrafficLightStatus = "green" | "amber" | "red";

interface TrafficLightProps {
  status: TrafficLightStatus;
  label?: string;
  size?: number;
}

const statusColors: Record<TrafficLightStatus, string> = {
  green: "#28CF59",
  amber: "#F6D74A",
  red: "#D32F2F",
};

const statusLabels: Record<TrafficLightStatus, string> = {
  green: "God",
  amber: "Advarsel",
  red: "Kritisk",
};

export function TrafficLight({ status, label, size = 12 }: TrafficLightProps) {
  return (
    <div data-testid="traffic-light" className="flex items-center gap-2">
      <span
        className="inline-block rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: statusColors[status],
        }}
      />
      {label !== undefined ? (
        <span className="text-sm text-foreground">{label}</span>
      ) : (
        <span className="text-sm text-muted-foreground">{statusLabels[status]}</span>
      )}
    </div>
  );
}

export default TrafficLight;
