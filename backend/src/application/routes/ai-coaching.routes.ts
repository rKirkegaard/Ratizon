import { Router, Request, Response } from "express";

export const aiCoachingRouter = Router();

aiCoachingRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", module: "ai-coaching" });
});

aiCoachingRouter.get("/briefing/:athleteId", (req: Request, res: Response) => {
  res.json({ data: null, message: `Daglig briefing for atlet ${req.params.athleteId} hentet` });
});

aiCoachingRouter.get("/alerts/:athleteId", (req: Request, res: Response) => {
  res.json({ data: [], message: `Alerts for atlet ${req.params.athleteId} hentet` });
});

aiCoachingRouter.get("/conversations/:athleteId", (req: Request, res: Response) => {
  res.json({ data: [], message: `Samtaler for atlet ${req.params.athleteId} hentet` });
});

aiCoachingRouter.post("/chat", (_req: Request, res: Response) => {
  res.json({ data: null, message: "Chat besked modtaget" });
});
