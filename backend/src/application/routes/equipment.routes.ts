import { Router, Request, Response } from "express";
import {
  listEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} from "../controllers/equipment.controller.js";

export const equipmentRouter = Router();

equipmentRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", module: "equipment" });
});

// ── Equipment CRUD ─────────────────────────────────────────────────────
equipmentRouter.get("/:athleteId", listEquipment);
equipmentRouter.post("/:athleteId", createEquipment);
equipmentRouter.put("/:athleteId/:id", updateEquipment);
equipmentRouter.delete("/:athleteId/:id", deleteEquipment);
