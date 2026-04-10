import { Router, Request, Response } from "express";
import {
  listAthletes,
  getAthleteProfile,
  updateAthleteProfile,
  uploadProfileImage,
  deleteProfileImage,
} from "../controllers/athlete.controller.js";

export const athleteRouter = Router();

athleteRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", module: "athletes" });
});

athleteRouter.get("/", listAthletes);

athleteRouter.get("/:athleteId/profile", getAthleteProfile);
athleteRouter.put("/:athleteId/profile", updateAthleteProfile);
athleteRouter.post("/:athleteId/profile-image", uploadProfileImage);
athleteRouter.delete("/:athleteId/profile-image", deleteProfileImage);

athleteRouter.get("/:id", (req: Request, res: Response) => {
  res.json({ data: null, message: `Atlet ${req.params.id} hentet` });
});
