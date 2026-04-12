import { useState } from "react";
import { CalendarDays } from "lucide-react";
import DatePicker from "@/presentation/components/shared/DatePicker";

export default function DatePickerPreview() {
  const [previewDate, setPreviewDate] = useState("");

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Kalender & Datoformat</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Dansk datoformat (dd. måned åååå) med mandag som ugestart. Denne kalendervælger bruges i hele løsningen.
      </p>
      <div className="max-w-xs">
        <DatePicker value={previewDate} onChange={setPreviewDate} />
      </div>
    </div>
  );
}
