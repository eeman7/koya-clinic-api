import { Request, Response } from "express";
import { BadRequestException } from "../../common/exceptions";
import { listQuerySchema, newBookingSchema } from "./bookings.schema";
import { bookingsService } from "./bookings.service";
import { consumeAttempt } from "./rate-limit.service";

/** The email to rate-limit on, if the body has a usable one. */
const rateLimitKey = (body: any): string | null =>
  typeof body?.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;

export const createBooking = async (req: Request, res: Response) => {
  // Every attempt counts, including ones that fail validation below.
  const key = rateLimitKey(req.body);
  if (key) await consumeAttempt(key);

  const parsed = newBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    throw new BadRequestException(field ? `invalid or missing ${String(field)}` : "invalid request body");
  }

  const idemKey = req.header("idempotency-key")?.trim() || undefined;
  if (idemKey && idemKey.length > 255) throw new BadRequestException("Idempotency-Key too long");

  const { status, body } = await bookingsService.create(parsed.data, idemKey);
  res.status(status).json(body);
};

export const listBookings = async (req: Request, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    throw new BadRequestException(`invalid or missing ${String(field ?? "query")}`);
  }
  const { email, limit = 10, cursor } = parsed.data;
  res.json(await bookingsService.listByEmail(email, limit, cursor));
};

export const getBooking = async (req: Request, res: Response) => {
  res.json(await bookingsService.get(String(req.params.id)));
};

export const cancelBooking = async (req: Request, res: Response) => {
  res.json(await bookingsService.cancel(String(req.params.id)));
};
