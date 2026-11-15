import { createHash, randomUUID } from "node:crypto";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../../db/data-source";
import { NotFoundException, ConflictException, BadRequestException, UnprocessableEntityException } from "../../common/exceptions";
import { NewBooking } from "./bookings.schema";

export interface Outcome {
  status: number;
  body: unknown;
}

const toBooking = (r: any) => ({
  id: r.id,
  slot_id: r.slot_id,
  name: r.name,
  email: r.email,
  status: r.status,
  created_at: new Date(r.created_at).toISOString(),
});

const hashBody = (b: NewBooking) =>
  createHash("sha256").update(JSON.stringify([b.slot_id, b.name, b.email])).digest("hex");

export class BookingsService {
  /**
   * Books a slot. Everything happens in one transaction:
   *  - the idempotency row is claimed first (a concurrent request with the same
   *    key blocks on the primary key until we commit, then replays our result);
   *  - the slot row is locked, so two requests for one slot are serialised and
   *    the loser sees the winner's confirmed booking and gets 409.
   * The partial unique index on bookings is the final backstop.
   */
  async create(input: NewBooking, idempotencyKey?: string): Promise<Outcome> {
    return AppDataSource.transaction(async (m) => {
      const requestHash = hashBody(input);

      if (idempotencyKey) {
        const claimed = await m.query(
          `INSERT INTO idempotency_keys (key, request_hash, status_code, response)
           VALUES ($1, $2, 0, 'null') ON CONFLICT (key) DO NOTHING RETURNING key`,
          [idempotencyKey, requestHash],
        );
        if (claimed.length === 0) {
          const [prev] = await m.query(
            "SELECT request_hash, status_code, response FROM idempotency_keys WHERE key = $1",
            [idempotencyKey],
          );
          if (prev.request_hash !== requestHash) {
            throw new UnprocessableEntityException("Idempotency-Key was already used with a different request body");
          }
          // Stored as a JSON string so the replay is identical, field order included.
          return { status: prev.status_code, body: JSON.parse(prev.response) };
        }
      }

      const outcome = await this.book(m, input);

      if (idempotencyKey) {
        await m.query("UPDATE idempotency_keys SET status_code = $2, response = $3 WHERE key = $1", [
          idempotencyKey,
          outcome.status,
          JSON.stringify(JSON.stringify(outcome.body)),
        ]);
      }
      return outcome;
    });
  }

  private async book(m: EntityManager, input: NewBooking): Promise<Outcome> {
    const [slot] = await m.query(
      `SELECT id, start <= clock_timestamp() AS started FROM slots WHERE id = $1 FOR UPDATE`,
      [input.slot_id],
    );
    if (!slot) return { status: 404, body: { error: "slot not found" } };
    if (slot.started) return { status: 400, body: { error: "slot has already started" } };

    const [taken] = await m.query(
      "SELECT 1 FROM bookings WHERE slot_id = $1 AND status = 'confirmed' LIMIT 1",
      [input.slot_id],
    );
    if (taken) return { status: 409, body: { error: "slot already booked" } };

    const [row] = await m.query(
      `INSERT INTO bookings (id, slot_id, name, email, status)
       VALUES ($1, $2, $3, $4, 'confirmed') RETURNING *`,
      [randomUUID(), input.slot_id, input.name, input.email],
    );
    return { status: 201, body: toBooking(row) };
  }

  async get(id: string) {
    const rows = await AppDataSource.query("SELECT * FROM bookings WHERE id::text = $1", [id]);
    if (!rows[0]) throw new NotFoundException("booking not found");
    return toBooking(rows[0]);
  }

  async cancel(id: string) {
    return AppDataSource.transaction(async (m) => {
      const [row] = await m.query("SELECT * FROM bookings WHERE id::text = $1 FOR UPDATE", [id]);
      if (!row) throw new NotFoundException("booking not found");
      if (row.status === "cancelled") throw new ConflictException("booking already cancelled");
      // UPDATE ... RETURNING comes back as [rows, affectedCount]
      const [[updated]] = await m.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *", [row.id]);
      return toBooking(updated);
    });
  }

  /** Oldest first, keyset pagination on the insertion sequence. */
  async listByEmail(email: string, limit: number, cursor?: string) {
    let after = "0";
    if (cursor !== undefined) {
      const decoded = Buffer.from(cursor, "base64url").toString("utf8");
      if (!/^\d+$/.test(decoded) || Buffer.from(decoded).toString("base64url") !== cursor) {
        throw new BadRequestException("invalid cursor");
      }
      after = decoded;
    }
    const rows = await AppDataSource.query(
      `SELECT * FROM bookings WHERE email = $1 AND seq > $2 ORDER BY seq ASC LIMIT $3`,
      [email.toLowerCase(), after, limit + 1],
    );
    const page = rows.slice(0, limit);
    const next_cursor =
      rows.length > limit ? Buffer.from(String(page[page.length - 1].seq)).toString("base64url") : null;
    return { bookings: page.map(toBooking), next_cursor };
  }
}

export const bookingsService = new BookingsService();
