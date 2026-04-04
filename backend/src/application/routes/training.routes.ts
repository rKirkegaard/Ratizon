import { Router, Request, Response } from "express";

export const trainingRouter = Router();

trainingRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", module: "training" });
});

trainingRouter.get("/sessions", (_req: Request, res: Response) => {
  res.json({ data: [], message: "Sessioner hentet" });
});

trainingRouter.get("/sessions/:id", (req: Request, res: Response) => {
  res.json({ data: null, message: `Session ${req.params.id} hentet` });
});

trainingRouter.get("/planned", (_req: Request, res: Response) => {
  res.json({ data: [], message: "Planlagte sessioner hentet" });
});
