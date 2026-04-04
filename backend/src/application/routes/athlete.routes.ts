import { Router, Request, Response } from "express";

export const athleteRouter = Router();

athleteRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", module: "athletes" });
});

athleteRouter.get("/", (_req: Request, res: Response) => {
  res.json({ data: [], message: "Atleter hentet" });
});

athleteRouter.get("/:id", (req: Request, res: Response) => {
  res.json({ data: null, message: `Atlet ${req.params.id} hentet` });
});
