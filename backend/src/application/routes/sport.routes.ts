import { Router } from "express";
import {
  listSports,
  addSport,
  updateSport,
  deactivateSport,
  applyPreset,
} from "../controllers/sport.controller.js";

export const sportRouter = Router();

sportRouter.get("/:athleteId", listSports);
sportRouter.post("/:athleteId", addSport);
sportRouter.put("/:athleteId/:sportKey", updateSport);
sportRouter.delete("/:athleteId/:sportKey", deactivateSport);
sportRouter.post("/:athleteId/preset/:presetName", applyPreset);
