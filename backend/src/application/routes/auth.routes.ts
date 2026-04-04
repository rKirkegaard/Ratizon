import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  getMe,
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

export const authRouter = Router();

// Public routes
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);

// Protected routes
authRouter.post("/logout", authenticateToken, logout);
authRouter.get("/me", authenticateToken, getMe);
