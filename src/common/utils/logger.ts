import pino from "pino";
import { env } from "../../config/env";

/**
 * Shared structured logger. In development it pretty-prints; in every other
 * environment it emits newline-delimited JSON for log collectors to parse.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
