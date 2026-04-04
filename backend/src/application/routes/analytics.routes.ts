import { Router, Request, Response } from "express";

export const analyticsRouter = Router();

analyticsRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", module: "analytics" });
});

analyticsRouter.get("/pmc/:athleteId", (req: Request, res: Response) => {
  res.json({ data: [], message: `PMC data for atlet ${req.params.athleteId} hentet` });
});

analyticsRouter.get("/session/:sessionId", (req: Request, res: Response) => {
  res.json({ data: null, message: `Analyse for session ${req.params.sessionId} hentet` });
});
