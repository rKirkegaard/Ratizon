import { Router, Request, Response } from "express";
import multer from "multer";
import AdmZip from "adm-zip";
import {
  listSessions,
  getSession,
  getSessionTimeseries,
  createSession,
  updateSession,
} from "../controllers/training.controller.js";
import {
  listBricks,
  getBrickDetail,
  createBrick,
  detectBricksEndpoint,
  deleteBrick,
  getBrickTransition,
} from "../controllers/brick.controller.js";
import { uploadSession } from "../use-cases/UploadSession.js";

export const trainingRouter = Router();

// Multer config: accept up to 50MB files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().split(".").pop();
    if (ext === "fit" || ext === "tcx" || ext === "zip") {
      cb(null, true);
    } else {
      cb(new Error("Kun .fit, .tcx og .zip filer er tilladt"));
    }
  },
});

// Session endpoints mounted under /api/training
trainingRouter.get("/sessions/:athleteId", listSessions);
trainingRouter.get("/sessions/:athleteId/:sessionId", getSession);
trainingRouter.get("/sessions/:athleteId/:sessionId/timeseries", getSessionTimeseries);
trainingRouter.post("/sessions/:athleteId", createSession);
trainingRouter.patch("/sessions/:athleteId/:sessionId", updateSession);

// Brick endpoints
trainingRouter.get("/bricks/:athleteId", listBricks);
trainingRouter.get("/bricks/:athleteId/:brickId", getBrickDetail);
trainingRouter.post("/bricks/:athleteId", createBrick);
trainingRouter.post("/bricks/:athleteId/detect", detectBricksEndpoint);
trainingRouter.delete("/bricks/:athleteId/:brickId", deleteBrick);
trainingRouter.get("/bricks/:athleteId/:brickId/transition", getBrickTransition);

// File upload endpoint
trainingRouter.post(
  "/upload/:athleteId",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { athleteId } = req.params;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: { message: "Ingen fil uploadet. Send en .fit, .tcx eller .zip fil." } });
        return;
      }

      let fileBuffer = file.buffer;
      let filename = file.originalname;

      // If zip, extract first .fit or .tcx file inside
      const ext = filename.toLowerCase().split(".").pop();
      if (ext === "zip") {
        try {
          const zip = new AdmZip(fileBuffer);
          const entries = zip.getEntries();
          const fitEntry = entries.find((e) => {
            const name = e.entryName.toLowerCase();
            return (name.endsWith(".fit") || name.endsWith(".tcx")) && !e.isDirectory;
          });
          if (!fitEntry) {
            res.status(400).json({ error: { message: "Zip-filen indeholder ingen .fit eller .tcx fil." } });
            return;
          }
          fileBuffer = fitEntry.getData();
          filename = fitEntry.entryName;
        } catch (zipErr: any) {
          res.status(400).json({ error: { message: "Kunne ikke laese zip-filen: " + zipErr.message } });
          return;
        }
      }

      const result = await uploadSession(fileBuffer, athleteId, filename);

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
