import { Router, Request, Response } from "express";
import Busboy from "busboy";
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

// Parse multipart upload using busboy (multer has Express 5 compat issues)
function parseUpload(req: Request): Promise<{ buffer: Buffer; filename: string }> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers, limits: { fileSize: 50 * 1024 * 1024 } });
    let fileBuffer: Buffer | null = null;
    let filename = "";

    busboy.on("file", (_fieldname: string, stream: any, info: any) => {
      filename = info.filename || "";
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => { fileBuffer = Buffer.concat(chunks); });
    });

    busboy.on("finish", () => {
      if (!fileBuffer) reject(new Error("Ingen fil modtaget"));
      else resolve({ buffer: fileBuffer, filename });
    });

    busboy.on("error", reject);
    req.pipe(busboy);
  });
}

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
  async (req: Request, res: Response) => {
    try {
      const { athleteId } = req.params;

      // Parse multipart form data
      const { buffer: rawBuffer, filename: rawFilename } = await parseUpload(req);

      // Validate file extension
      const uploadExt = rawFilename.toLowerCase().split(".").pop();
      if (uploadExt !== "fit" && uploadExt !== "tcx" && uploadExt !== "zip") {
        res.status(400).json({ error: { message: "Kun .fit, .tcx og .zip filer er tilladt." } });
        return;
      }

      let fileBuffer = rawBuffer;
      let filename = rawFilename;

      // If zip, validate contents and extract .fit/.tcx
      const ext = filename.toLowerCase().split(".").pop();
      if (ext === "zip") {
        try {
          const zip = new AdmZip(fileBuffer);
          const entries = zip.getEntries().filter((e) => !e.isDirectory);

          // Security: reject zip if it contains anything other than .fit/.tcx files
          const ALLOWED_EXTENSIONS = new Set(["fit", "tcx"]);
          for (const entry of entries) {
            const entryExt = entry.entryName.toLowerCase().split(".").pop() || "";
            if (!ALLOWED_EXTENSIONS.has(entryExt)) {
              res.status(400).json({
                error: {
                  message: `Zip-filen indeholder en ikke-tilladt fil: ${entry.entryName}. Kun .fit og .tcx filer er tilladt i zip-arkiver.`,
                },
              });
              return;
            }
          }

          // Security: limit number of entries to prevent zip bombs
          if (entries.length > 50) {
            res.status(400).json({ error: { message: "Zip-filen indeholder for mange filer (max 50)." } });
            return;
          }

          // Security: limit total uncompressed size (100MB)
          const totalSize = entries.reduce((sum, e) => sum + e.header.size, 0);
          if (totalSize > 100 * 1024 * 1024) {
            res.status(400).json({ error: { message: "Zip-filens indhold er for stort (max 100MB udpakket)." } });
            return;
          }

          const fitEntry = entries.find((e) => {
            const name = e.entryName.toLowerCase();
            return name.endsWith(".fit") || name.endsWith(".tcx");
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
