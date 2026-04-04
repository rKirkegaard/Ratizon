import { Router, Request, Response } from "express";

export const equipmentRouter = Router();

equipmentRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", module: "equipment" });
});

equipmentRouter.get("/:athleteId", (req: Request, res: Response) => {
  res.json({ data: [], message: `Udstyr for atlet ${req.params.athleteId} hentet` });
});

equipmentRouter.post("/", (_req: Request, res: Response) => {
  res.json({ data: null, message: "Udstyr oprettet" });
});
