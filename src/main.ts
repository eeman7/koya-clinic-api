import { env } from "./config/env";
import { logger } from "./common/utils/logger";
import { AppDataSource, initializeDatabase } from "./db/data-source";
import app from "./app";

const start = async () => {
  await initializeDatabase();
  logger.info("📦 Database connection established");

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close(async () => {
      await AppDataSource.destroy();
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

start().catch((error) => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});
