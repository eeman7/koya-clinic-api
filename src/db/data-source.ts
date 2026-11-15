import "reflect-metadata";
import path from "node:path";
import { DataSource } from "typeorm";
import { env } from "../config/env";
import { Slot } from "./entities/slot.entity";
import { Booking } from "./entities/booking.entity";
import { IdempotencyKey } from "./entities/idempotency-key.entity";
import { BookingAttempt } from "./entities/booking-attempt.entity";

/**
 * A single shared TypeORM DataSource for the whole process (also loaded by the
 * TypeORM CLI for migrations). Pending migrations run at boot so a fresh
 * database is ready without a separate step.
 */
export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  entities: [Slot, Booking, IdempotencyKey, BookingAttempt],
  migrations: [path.join(__dirname, "migrations", "*.{ts,js}")],
  migrationsRun: true,
  synchronize: false,
  // Keep the pool small: serverless instances each open their own.
  extra: { max: 5 },
  logging: ["error"],
});

export const initializeDatabase = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
};
