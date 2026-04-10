import { Router, Request, Response } from "express";
import {
  listEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getSessionEquipment,
  addSessionEquipment,
  bulkSaveSessionEquipment,
  removeSessionEquipmentLink,
  checkEquipmentLifespan,
  archiveEquipment,
  restoreEquipment,
  getEquipmentStats,
  getEquipmentMonthlyUsage,
  getEquipmentSessions,
  getNotificationPrefs,
  upsertNotificationPrefs,
} from "../controllers/equipment.controller.js";

export const equipmentRouter = Router();

equipmentRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", module: "equipment" });
});

// ── Session Equipment ──────────────────────────────────────────────────
equipmentRouter.get("/session/:sessionId", getSessionEquipment);
equipmentRouter.post("/session/:sessionId", addSessionEquipment);
equipmentRouter.put("/session/:sessionId/bulk", bulkSaveSessionEquipment);
equipmentRouter.delete("/session-link/:linkId", removeSessionEquipmentLink);

// ── Lifespan check (cron/admin) ───────────────────────────────────────
equipmentRouter.post("/check-lifespan", checkEquipmentLifespan);

// ── Equipment detail endpoints (must be before generic /:athleteId/:id) ──
equipmentRouter.put("/:athleteId/:id/archive", archiveEquipment);
equipmentRouter.put("/:athleteId/:id/restore", restoreEquipment);
equipmentRouter.get("/:athleteId/:id/stats", getEquipmentStats);
equipmentRouter.get("/:athleteId/:id/monthly-usage", getEquipmentMonthlyUsage);
equipmentRouter.get("/:athleteId/:id/sessions", getEquipmentSessions);
equipmentRouter.get("/:athleteId/:id/notifications", getNotificationPrefs);
equipmentRouter.put("/:athleteId/:id/notifications", upsertNotificationPrefs);

// ── Equipment CRUD ─────────────────────────────────────────────────────
equipmentRouter.get("/:athleteId", listEquipment);
equipmentRouter.post("/:athleteId", createEquipment);
equipmentRouter.put("/:athleteId/:id", updateEquipment);
equipmentRouter.delete("/:athleteId/:id", deleteEquipment);
