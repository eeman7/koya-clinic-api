import { z } from "zod";

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const trimmed = z.string().trim().min(1);

/** Name and email are trimmed; email is stored lower-case. */
export const newBookingSchema = z.object({
  slot_id: trimmed,
  name: trimmed,
  email: trimmed
    .max(254)
    .refine((v) => EMAIL_RE.test(v), "invalid email")
    .transform((v) => v.toLowerCase()),
});

export type NewBooking = z.infer<typeof newBookingSchema>;

export const listQuerySchema = z.object({
  email: z.string().trim().min(1),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 50)
    .optional(),
  cursor: z.string().min(1).optional(),
});
