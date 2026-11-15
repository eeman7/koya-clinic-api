/// <reference types="node" />
import path from "node:path";
import express from "express";

import { initializeDatabase } from "./db/data-source";
import { errorHandler } from "./common/middleware/error.middleware";
import { requireApiKey } from "./common/middleware/api-key.middleware";
import { env } from "./config/env";
import { NotFoundException } from "./common/exceptions";

import healthRoutes from "./modules/health/health.routes";
import slotsRoutes from "./modules/slots/slots.routes";
import bookingsRoutes from "./modules/bookings/bookings.routes";

/**
 * The Express app, exported without listening so it can run both as a normal
 * server (`main.ts`) and as a Vercel function (Vercel looks for `src/app.ts`).
 */
const app = express();
app.disable("x-powered-by");

// Connect (and run pending migrations) on first request; reused afterwards.
let ready: Promise<unknown> | null = null;
app.use(async (_req, _res, next) => {
  ready ??= initializeDatabase().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  next();
});

// 1. Public: liveness probe and the booking web page 
app.use("/health", healthRoutes);
app.use(express.static(path.join(process.cwd(), "public")));

// 2. Web page gateway: the page calls /site/<api path>; the server adds the API
//    key itself, so the browser never holds it. Only the calls the page needs are
//    allowed (no /reset, no listing by email). Rate limits still apply.
const SITE_ALLOWED: [string, RegExp][] = [
  ["GET", /^\/slots(\?.*)?$/],
  ["POST", /^\/bookings$/],
  ["GET", /^\/bookings\/[^/?]+$/],
  ["DELETE", /^\/bookings\/[^/?]+$/],
];
app.use((req, _res, next) => {
  if (!req.url.startsWith("/site/")) return next();
  const target = req.url.slice("/site".length);
  if (!SITE_ALLOWED.some(([m, re]) => m === req.method && re.test(target))) {
    return next(new NotFoundException("not found"));
  }
  req.url = "/api" + target;
  req.headers["x-api-key"] = env.API_KEY;
  next();
});

// 3. The API, mounted at /api. The key guard runs before body parsing so a bad
//    key always gets 401.
const api = express.Router();
api.use(requireApiKey);
api.use(express.json());
api.use(slotsRoutes);
api.use("/bookings", bookingsRoutes);
app.use("/api", api);

// 4. Anything else
app.use((_req, _res, next) => next(new NotFoundException("not found")));

// 5. Global error handler — must be last
app.use(errorHandler);

export default app;
