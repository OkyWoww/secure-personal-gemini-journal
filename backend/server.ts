import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
import { verifyAuth, AuthenticatedRequest } from "./middleware/verifyAuth";
import entriesRouter from "./routes/entries";
import reflectionRouter from "./routes/reflection";
import adminRouter from "./routes/admin";
import { logAuditEvent } from "./lib/auditLogger";

dotenv.config();

process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/test-auth", verifyAuth, (req: AuthenticatedRequest, res: express.Response) => {
    logAuditEvent('LOGIN_SUCCESS', req.user?.uid || 'unknown', 'SUCCESS', `User ${req.user?.email} authenticated via Google OAuth`, req);
    res.json({ status: "ok", user: req.user });
  });

  app.use("/api/entries", entriesRouter);
  app.use("/api/reflection", reflectionRouter);
  app.use("/api/admin", adminRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
