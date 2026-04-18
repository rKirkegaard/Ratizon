import { Router } from "express";
import {
  getRecommendations,
  createRecommendation,
  updateRecommendation,
  acceptRecommendation,
  rejectRecommendation,
  implementRecommendation,
  deleteRecommendation,
} from "../controllers/recommendations.controller.js";

export const recommendationsRouter = Router();

recommendationsRouter.get("/:athleteId", getRecommendations);
recommendationsRouter.post("/", createRecommendation);
recommendationsRouter.put("/:id", updateRecommendation);
recommendationsRouter.post("/:id/accept", acceptRecommendation);
recommendationsRouter.post("/:id/reject", rejectRecommendation);
recommendationsRouter.post("/:id/implement", implementRecommendation);
recommendationsRouter.delete("/:id", deleteRecommendation);
