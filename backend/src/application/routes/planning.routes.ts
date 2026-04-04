import { Router, Request, Response } from "express";

export const planningRouter = Router();

planningRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", module: "planning" });
});

planningRouter.get("/goals/:athleteId", (req: Request, res: Response) => {
  res.json({ data: [], message: `Maal for atlet ${req.params.athleteId} hentet` });
});

planningRouter.get("/phases/:athleteId", (req: Request, res: Response) => {
  res.json({ data: [], message: `Traeningsfaser for atlet ${req.params.athleteId} hentet` });
});

planningRouter.get("/budgets/:athleteId", (req: Request, res: Response) => {
  res.json({ data: [], message: `Ugebudgetter for atlet ${req.params.athleteId} hentet` });
});
