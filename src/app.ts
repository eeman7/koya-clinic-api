/// <reference types="node" />
import path from "node:path";
import express from "express";

import { initializeDatabase } from "./db/data-source";
import { errorHandler } from "./common/middleware/error.middleware";
import { requireApiKey } from "./common/middleware/api-key.middleware";
import { NotFoundException } from "./common/exceptions";

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

// The booking web page is the only thing served outside /api.
app.use(express.static(path.join(process.cwd(), "public")));

// Everything else lives under /api.
const api = express.Router();

// Every API request needs the API key. The guard runs before body parsing so a
// bad key always gets 401.
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
