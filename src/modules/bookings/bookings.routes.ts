import { Router } from "express";
import { cancelBooking, createBooking, getBooking, listBookings } from "./bookings.controller";

const router = Router();
router.post("/", createBooking);
router.get("/", listBookings);
router.get("/:id", getBooking);
router.delete("/:id", cancelBooking);
export default router;
