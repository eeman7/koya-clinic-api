import { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";
import { UnauthorizedException } from "../exceptions";

const expected = Buffer.from(env.API_KEY);

/** Rejects any request that does not carry the configured X-API-Key. */
export const requireApiKey = (req: Request, _res: Response, next: NextFunction) => {
  const provided = Buffer.from(req.header("x-api-key") ?? "");
  const ok = provided.length === expected.length && timingSafeEqual(provided, expected);
  if (!ok) throw new UnauthorizedException("missing or invalid API key");
  next();
};
