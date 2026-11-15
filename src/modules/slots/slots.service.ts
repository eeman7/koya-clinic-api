import { AppDataSource } from "../../db/data-source";
import { Slot } from "../../db/entities/slot.entity";
import { BadRequestException } from "../../common/exceptions";
import { ResetPayload } from "./slots.schema";

export class SlotsService {
  async list(provider?: string) {
    const params: unknown[] = [];
    let where = "";
    if (provider !== undefined) {
      params.push(provider);
      where = "WHERE s.provider = $1";
    }
    const rows = await AppDataSource.query(
      `SELECT s.id, s.provider, s.start_text AS start, s.end_text AS "end",
              NOT EXISTS (
                SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND b.status = 'confirmed'
              ) AS available
         FROM slots s ${where}
        ORDER BY s.start ASC, s.id ASC`,
      params,
    );
    return { slots: rows };
  }

  /** Deletes every booking (and per-request state) and replaces all slots. */
  async reset({ slots }: ResetPayload) {
    const ids = new Set(slots.map((s) => s.id));
    if (ids.size !== slots.length) throw new BadRequestException("duplicate slot ids");

    await AppDataSource.transaction(async (m) => {
      await m.query(
        "TRUNCATE bookings, slots, idempotency_keys, booking_attempts RESTART IDENTITY",
      );
      if (slots.length > 0) {
        await m.insert(
          Slot,
          slots.map((s) => ({
            id: s.id,
            provider: s.provider,
            start: new Date(s.start),
            end: new Date(s.end),
            startText: s.start,
            endText: s.end,
          })),
        );
      }
    });
  }
}

export const slotsService = new SlotsService();
