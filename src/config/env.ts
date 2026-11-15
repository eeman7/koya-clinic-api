import { z } from "zod";
import "dotenv/config";

/**
 * Single source of truth for environment configuration. Invalid environment
 * exits the process at boot with a readable report.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATABASE_URL: z.string().min(1),
  /** Value clients must send in the X-API-Key header. */
  API_KEY: z.string().min(8, "API_KEY must be at least 8 chars"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
