import { Router } from "express";
import { listSlots, resetSlots } from "./slots.controller";

const router = Router();
router.post("/reset", resetSlots);
router.get("/slots", listSlots);
export default router;
