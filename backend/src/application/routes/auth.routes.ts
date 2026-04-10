import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  devListUsers,
  devLogin,
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

export const authRouter = Router();

// Public routes
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);

// Dev routes (no auth)
authRouter.get("/dev-users", devListUsers);
authRouter.post("/dev-login", devLogin);

// Protected routes
authRouter.post("/logout", authenticateToken, logout);
authRouter.get("/me", authenticateToken, getMe);
authRouter.put("/change-password", authenticateToken, changePassword);
