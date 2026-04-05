import { Router } from "express";
import {
  garminConnect,
  garminCallback,
  garminStatus,
  garminDisconnect,
  garminSync,
  garminWebhook,
} from "../controllers/garmin.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

export const garminRouter = Router();

// Protected routes (require JWT)
garminRouter.get("/connect", authenticateToken, garminConnect);
garminRouter.get("/status/:athleteId", authenticateToken, garminStatus);
garminRouter.post("/disconnect/:athleteId", authenticateToken, garminDisconnect);
garminRouter.post("/sync/:athleteId", authenticateToken, garminSync);

// Semi-public: callback from Garmin SSO (no JWT, uses state token)
garminRouter.get("/callback", garminCallback);

// Public: webhook from Garmin servers (signature-verified, not JWT)
garminRouter.post("/webhook", garminWebhook);
