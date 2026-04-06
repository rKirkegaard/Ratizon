import { Router } from "express";
import {
  listTests,
  createTest,
  deleteTest,
  applyBaseline,
} from "../controllers/test.controller.js";

export const testRouter = Router();

testRouter.get("/:athleteId", listTests);
testRouter.post("/:athleteId", createTest);
testRouter.delete("/:athleteId/:testId", deleteTest);
testRouter.post("/:athleteId/:testId/apply-baseline", applyBaseline);
