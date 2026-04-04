import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./application/routes/index.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3002", 10);

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Routes
registerRoutes(app);

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "ratizon-api",
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[ERROR]", err.message);
  console.error(err.stack);

  const statusCode = "statusCode" in err ? (err as { statusCode: number }).statusCode : 500;

  res.status(statusCode).json({
    error: {
      message: err.message || "Intern serverfejl",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { message: "Endpoint ikke fundet" } });
});

app.listen(PORT, () => {
  console.log(`Ratizon API korer pa port ${PORT}`);
  console.log(`Miljoe: ${process.env.NODE_ENV || "development"}`);
});

export default app;
