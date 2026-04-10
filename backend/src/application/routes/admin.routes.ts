import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth.middleware.js";
import {
  listUsers, createUser, updateUser, deleteUser, setPassword, resetPassword,
  listAssignments, createAssignment, deleteAssignment,
} from "../controllers/admin.controller.js";

export const adminRouter = Router();

// All admin routes require admin role
adminRouter.use(authenticateToken, requireRole("admin"));

// Users
adminRouter.get("/users", listUsers);
adminRouter.post("/users", createUser);
adminRouter.put("/users/:id", updateUser);
adminRouter.delete("/users/:id", deleteUser);
adminRouter.put("/users/:id/password", setPassword);
adminRouter.post("/users/:id/reset-password", resetPassword);

// Coach-Athlete Assignments
adminRouter.get("/assignments", listAssignments);
adminRouter.post("/assignments", createAssignment);
adminRouter.delete("/assignments/:id", deleteAssignment);
