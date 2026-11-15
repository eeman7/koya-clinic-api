import { Request, Response } from "express";
import { resetSchema } from "./slots.schema";
import { slotsService } from "./slots.service";
import { BadRequestException } from "../../common/exceptions";

export const resetSlots = async (req: Request, res: Response) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestException("body must be { slots: [{id, provider, start, end}] }");
  await slotsService.reset(parsed.data);
  res.status(200).json({ ok: true });
};

export const listSlots = async (req: Request, res: Response) => {
  const provider = typeof req.query.provider === "string" ? req.query.provider : undefined;
  res.json(await slotsService.list(provider));
};
