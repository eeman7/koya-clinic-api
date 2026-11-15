import { EntityManager } from "typeorm";
import { AppDataSource } from "../../db/data-source";
import { TooManyRequestsException } from "../../common/exceptions";

export const MAX_ATTEMPTS = 5;
export const WINDOW_SECONDS = 60;

/**
 * Sliding-window limiter kept in Postgres, so it is correct under concurrency
 * and across several app instances. A per-email advisory lock serialises the
 * check-and-record step. Rejected (429) attempts are not recorded, so the
 * window always drains.
 */
export const consumeAttempt = async (email: string) => {
  await AppDataSource.transaction(async (m: EntityManager) => {
    await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`attempt:${email}`]);

    const [{ count, retry_after }] = await m.query(
      `SELECT COUNT(*)::int AS count,
              CEIL(EXTRACT(EPOCH FROM (MIN(attempted_at) + make_interval(secs => $2) - clock_timestamp())))::int AS retry_after
         FROM booking_attempts
        WHERE email = $1
          AND attempted_at > clock_timestamp() - make_interval(secs => $2)`,
      [email, WINDOW_SECONDS],
    );

    if (count >= MAX_ATTEMPTS) {
      throw new TooManyRequestsException(
        "too many booking attempts, try again later",
        Math.max(1, retry_after ?? WINDOW_SECONDS),
      );
    }

    await m.query("INSERT INTO booking_attempts (email, attempted_at) VALUES ($1, clock_timestamp())", [email]);
    // opportunistic cleanup of this email's expired rows
    await m.query(
      "DELETE FROM booking_attempts WHERE email = $1 AND attempted_at <= clock_timestamp() - make_interval(secs => $2)",
      [email, WINDOW_SECONDS],
    );
  });
};
