import { Router, Request, Response } from "express";
import multer from "multer";
import {
  listSessions,
  getSession,
  getSessionTimeseries,
  createSession,
} from "../controllers/training.controller.js";
import { uploadSession } from "../use-cases/UploadSession.js";

export const trainingRouter = Router();

// Multer config: accept up to 50MB files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().split(".").pop();
    if (ext === "fit" || ext === "tcx") {
      cb(null, true);
    } else {
      cb(new Error("Kun .fit og .tcx filer er tilladt"));
    }
  },
});

// Session endpoints mounted under /api/training
trainingRouter.get("/sessions/:athleteId", listSessions);
trainingRouter.get("/sessions/:athleteId/:sessionId", getSession);
trainingRouter.get("/sessions/:athleteId/:sessionId/timeseries", getSessionTimeseries);
trainingRouter.post("/sessions/:athleteId", createSession);

// File upload endpoint
trainingRouter.post(
  "/upload/:athleteId",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { athleteId } = req.params;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: { message: "Ingen fil uploadet. Send en .fit eller .tcx fil." } });
        return;
      }

      const result = await uploadSession(file.buffer, athleteId, file.originalname);

      res.status(201).json({
        data: {
          sessionId: result.sessionId,
          sport: result.sport,
          title: result.title,
          message: "Session uploadet og behandlet",
        },
      });
    } catch (error: any) {
      console.error("Fejl ved upload af session:", error);
      res.status(500).json({ error: { message: error.message || "Fejl ved behandling af fil" } });
    }
  }
);
