import { Router } from "express";
import {
  listPages,
  getAthletePermissions,
  updateAthletePermissions,
  getUserPermissions,
  updateUserPermissions,
} from "../controllers/permissions.controller.js";

export const permissionsRouter = Router();

permissionsRouter.get("/pages", listPages);
permissionsRouter.get("/athlete/:athleteId", getAthletePermissions);
permissionsRouter.put("/athlete/:athleteId", updateAthletePermissions);
permissionsRouter.get("/user/:userId", getUserPermissions);
permissionsRouter.put("/user/:userId", updateUserPermissions);
