import { Router, Request, Response } from "express";

const DISRUPTION_SECTIONS = new Set(["driftsinfo", "bemærk"]);

export const poolStatusRouter = Router();

/**
 * GET /api/pool-status/check?url=<encoded-url>
 * Fetches a svoemkbh.kk.dk pool page and extracts disruption notices.
 */
poolStatusRouter.get("/check", async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url || !url.startsWith("https://svoemkbh.kk.dk/")) {
    res.status(400).json({ disruptions: [], error: "Ugyldig URL" });
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      res.json({ disruptions: [], error: "Kunne ikke hente data" });
      return;
    }

    const html = await response.text();

    // 1. Find all h2 section titles and their positions
    const h2Regex =
      /<h2[^>]*field--name-title[^>]*field__item[^>]*>([\s\S]*?)<\/h2>/gi;
    const sections: { title: string; end: number }[] = [];
    let h2Match: RegExpExecArray | null;
    while ((h2Match = h2Regex.exec(html)) !== null) {
      const title = h2Match[1].replace(/<[^>]+>/g, "").trim();
      sections.push({ title, end: h2Match.index + h2Match[0].length });
    }

    // 2. For each disruption section, find the teaser that follows it
    const disruptions: { title: string; text: string }[] = [];
    const teaserRegex =
      /<div[^>]*field--name-teaser[^>]*field__item[^>]*>([\s\S]*?)<\/div>/gi;

    for (const section of sections) {
      if (!DISRUPTION_SECTIONS.has(section.title.toLowerCase())) continue;

      // Search for the first teaser after this h2
      teaserRegex.lastIndex = section.end;
      const teaserMatch = teaserRegex.exec(html);
      if (teaserMatch) {
        const text = teaserMatch[1]
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/<[^>]+>/g, "")
          .trim();
        if (text) {
          disruptions.push({ title: section.title, text });
        }
      }
    }

    res.json({ disruptions, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Pool status fetch error:", error);
    res.json({ disruptions: [], error: "Fejl ved hentning af driftsstatus" });
  }
});
