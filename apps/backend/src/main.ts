import "dotenv/config";
import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { authRouter } from "./api/auth";
import { responsesRouter } from "./api/responses";
import { runtimeRouter } from "./api/runtime";
import { surveysRouter } from "./api/surveys";
import { webhooksRouter } from "./api/webhooks";
import { getEnv } from "./lib/env";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { startWebhookWorker } from "./webhooks/dispatcher";

const env = getEnv();
const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(pinoHttp({ logger }));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, env: env.NODE_ENV });
});

app.use("/auth", authRouter);
app.use("/surveys", surveysRouter);
app.use("/runtime", runtimeRouter);
app.use("/responses", responsesRouter);
app.use("/webhooks", webhooksRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const worker = startWebhookWorker();

const server = app.listen(env.PORT, () => {
  logger.info(`Survey backend listening on http://localhost:${env.PORT}`);
});

function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  clearInterval(worker);
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
