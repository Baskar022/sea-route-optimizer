import express from "express";
import cors from "cors";
import optimizerRoutes from "./routes/optimizerRoutes.js";
import { env } from "./config/env.js";

const app = express();

app.use(cors({ origin: env.corsOrigin === "*" ? true : env.corsOrigin }));
app.use(express.json({ limit: "1mb" }));

app.use("/api", optimizerRoutes);

app.use((err, _req, res, _next) => {
  res.status(500).json({
    error: "Unhandled backend error",
    details: err instanceof Error ? err.message : "Unknown error",
  });
});

export default app;
