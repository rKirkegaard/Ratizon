import { Router, Request, Response } from "express";

export const wellnessRouter = Router();

wellnessRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", module: "wellness" });
});

wellnessRouter.get("/daily/:athleteId", (req: Request, res: Response) => {
  res.json({ data: [], message: `Wellness data for atlet ${req.params.athleteId} hentet` });
});

wellnessRouter.get("/injuries/:athleteId", (req: Request, res: Response) => {
  res.json({ data: [], message: `Skader for atlet ${req.params.athleteId} hentet` });
});

wellnessRouter.get("/streaks/:athleteId", (req: Request, res: Response) => {
  res.json({ data: [], message: `Streaks for atlet ${req.params.athleteId} hentet` });
});
