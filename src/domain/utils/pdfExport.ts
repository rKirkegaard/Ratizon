import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RaceTimeline } from "@/domain/types/race-plan.types";

function formatTime(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function addHeader(doc: jsPDF, title: string, athleteName: string) {
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text("Ratizon", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`${athleteName} — ${new Date().toLocaleDateString("da-DK")}`, 14, 24);
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 14, 34);
  doc.setLineWidth(0.3);
  doc.setDrawColor(200);
  doc.line(14, 37, 196, 37);
}

export function exportRacePlanPdf(timeline: RaceTimeline, athleteName: string, raceTitle: string) {
  const doc = new jsPDF();

  addHeader(doc, `Raceplan: ${raceTitle}`, athleteName);

  let y = 44;

  // Segment summary table
  doc.setFontSize(12);
  doc.text("Segmentoversigt", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Segment", "Distance", "Tid", "Pace/Effekt"]],
    body: timeline.segments.map((seg) => [
      seg.label,
      seg.distance > 0 ? `${(seg.distance / 1000).toFixed(1)} km` : "–",
      formatTime(seg.durationSec),
      seg.pace || "–",
    ]),
    foot: [["Total", "", formatTime(timeline.totalTimeSec), ""]],
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    footStyles: { fillColor: [243, 244, 246], textColor: [40, 40, 40], fontStyle: "bold" },
    styles: { fontSize: 9 },
  });

  y = (doc as any).lastAutoTable?.finalY + 10 || y + 60;

  // Nutrition totals
  doc.setFontSize(12);
  doc.text("Ernaeringsoversigt", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["", "Total", "Kal/time (cykel)", "Kal/time (loeb)", "Vaeske/time (cykel)"]],
    body: [[
      "Totaler",
      `${timeline.totals.calories} kcal`,
      `${timeline.totals.caloriesPerHourBike} kcal/t`,
      `${timeline.totals.caloriesPerHourRun} kcal/t`,
      `${timeline.totals.fluidPerHourBike} ml/t`,
    ]],
    theme: "striped",
    headStyles: { fillColor: [249, 115, 22] },
    styles: { fontSize: 9 },
  });

  y = (doc as any).lastAutoTable?.finalY + 10 || y + 30;

  // Nutrition timeline
  if (timeline.nutritionTimeline.length > 0) {
    doc.setFontSize(12);
    doc.text("Ernaeringsskema", 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Tidspunkt", "Segment", "Produkt", "Kalorier", "Vaeske"]],
      body: timeline.nutritionTimeline.map((ni) => [
        formatTime(ni.raceClockMin * 60),
        ni.segmentType.toUpperCase(),
        ni.item,
        ni.calories ? `${ni.calories} kcal` : "–",
        ni.fluidMl ? `${ni.fluidMl} ml` : "–",
      ]),
      theme: "striped",
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 9 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Ratizon — Genereret ${new Date().toLocaleString("da-DK")}`, 14, 288);
    doc.text(`Side ${i}/${pageCount}`, 185, 288);
  }

  doc.save(`raceplan-${new Date().toISOString().split("T")[0]}.pdf`);
}

export function exportSeasonSummaryPdf(
  athleteName: string,
  phases: Array<{ phaseName: string; phaseType: string; startDate: string; endDate: string; ctlTarget: number | null; actualHours: number; targetHours: number; compliancePct: number }>,
  currentCTL: number,
  raceTitle: string
) {
  const doc = new jsPDF();

  addHeader(doc, `Saesonresume: ${raceTitle}`, athleteName);

  let y = 44;

  // PMC status
  doc.setFontSize(11);
  doc.text(`Nuvaerende CTL (Fitness): ${currentCTL}`, 14, y);
  y += 10;

  // Phases table
  doc.setFontSize(12);
  doc.text("Traeningsfaser", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Fase", "Type", "Periode", "CTL-maal", "Timer", "Compliance"]],
    body: phases.map((p) => [
      p.phaseName,
      p.phaseType,
      `${new Date(p.startDate).toLocaleDateString("da-DK", { day: "numeric", month: "short" })} - ${new Date(p.endDate).toLocaleDateString("da-DK", { day: "numeric", month: "short" })}`,
      p.ctlTarget ? String(p.ctlTarget) : "–",
      `${p.actualHours} / ${p.targetHours}`,
      `${p.compliancePct}%`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [139, 92, 246] },
    styles: { fontSize: 9 },
  });

  doc.save(`saeson-resume-${new Date().toISOString().split("T")[0]}.pdf`);
}
