import { z } from "zod";

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "must be an ISO date-time");

export const resetSchema = z.object({
  slots: z.array(
    z.object({
      id: z.string().min(1),
      provider: z.string().min(1),
      start: isoDate,
      end: isoDate,
    }),
  ),
});

export type ResetPayload = z.infer<typeof resetSchema>;
