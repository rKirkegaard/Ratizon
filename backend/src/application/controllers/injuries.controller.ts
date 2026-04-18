import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { sql, eq, and, desc } from "drizzle-orm";

// Direct SQL since injuries isn't in Drizzle schema yet

export async function getInjuries(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const result = await db.execute(sql`
      SELECT * FROM injuries WHERE athlete_id = ${athleteId} ORDER BY injury_date DESC
    `);
    res.json({ data: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function createInjury(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const b = req.body;
    const result = await db.execute(sql`
      INSERT INTO injuries (athlete_id, injury_type, body_location, severity, injury_date, trigger_notes, treatment, notes)
      VALUES (${athleteId}, ${b.injuryType}, ${b.bodyLocation}, ${b.severity ?? "moderate"}, ${b.injuryDate}, ${b.triggerNotes ?? null}, ${b.treatment ?? null}, ${b.notes ?? null})
      RETURNING *
    `);
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function updateInjury(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const b = req.body;
    const sets: string[] = ["updated_at = NOW()"];
    if (b.currentPhase !== undefined) sets.push(`current_phase = '${b.currentPhase}'`);
    if (b.resolvedDate !== undefined) sets.push(`resolved_date = '${b.resolvedDate}'`);
    if (b.clearanceDate !== undefined) sets.push(`clearance_date = '${b.clearanceDate}'`);
    if (b.treatment !== undefined) sets.push(`treatment = '${b.treatment}'`);
    if (b.notes !== undefined) sets.push(`notes = '${b.notes}'`);
    if (b.returnProtocol !== undefined) sets.push(`return_protocol = '${JSON.stringify(b.returnProtocol)}'::jsonb`);

    await db.execute(sql.raw(`UPDATE injuries SET ${sets.join(", ")} WHERE id = '${id}'`));
    res.json({ data: { message: "Skade opdateret" } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function deleteInjury(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await db.execute(sql`DELETE FROM injuries WHERE id = ${id}`);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function generateReturnProtocol(req: Request, res: Response) {
  try {
    const { athleteId, id } = req.params;
    const { generateChatCompletionFull } = await import("../../infrastructure/llm/LLMClient.js");

    const injResult = await db.execute(sql`SELECT * FROM injuries WHERE id = ${id}`);
    const injury = (injResult.rows as any[])[0];
    if (!injury) { res.status(404).json({ error: "Skade ikke fundet" }); return; }

    const result = await generateChatCompletionFull(
      "Du er en sportsfysioterapeut specialiseret i triathlon. Generer en return-to-training protokol. Svar paa dansk. Returner KUN JSON.",
      [{ role: "user", content: `Skade: ${injury.injury_type} (${injury.body_location}), severity: ${injury.severity}, dato: ${injury.injury_date}. Generer protokol. JSON: { "phases": [{ "phase": "acute|subacute|return_to_run|full_training", "duration": "X uger", "activities": ["..."], "restrictions": ["..."], "progressionCriteria": "..." }], "crossTraining": ["..."], "rehabExercises": [{ "name": "...", "sets": N, "reps": N, "frequency": "dagligt|3x/uge" }] }` }],
      { athleteId: athleteId as string, requestType: "return-protocol" }
    );

    let parsed: any;
    try {
      const match = result.content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, result.content];
      parsed = JSON.parse(match[1]!.trim());
    } catch { parsed = { raw: result.content }; }

    // Save protocol to injury
    await db.execute(sql`UPDATE injuries SET return_protocol = ${JSON.stringify(parsed)}::jsonb, updated_at = NOW() WHERE id = ${id}`);

    res.json({ data: { protocol: parsed, isMock: result.isMock ?? false } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}
