import { Request, Response, NextFunction } from "express";
import { HttpException } from "../exceptions";
import { logger } from "../utils/logger";

/**
 * Single global error handler, mounted last. Every error response has the
 * shape `{ "error": "<message>" }`.
 */
export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpException) {
    res.set(err.headers);
    return res.status(err.status).json({ error: err.message });
  }

  // body-parser failures (malformed JSON, payload too large, ...)
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      error: err.type === "entity.parse.failed" ? "invalid JSON body" : "invalid request",
    });
  }

  logger.error({ err: err?.stack ?? err, path: req.path, method: req.method }, "Request error");
  res.status(500).json({ error: "internal server error" });
};
