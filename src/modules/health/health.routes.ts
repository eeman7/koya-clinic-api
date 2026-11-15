import { Router } from "express";
import { AppDataSource } from "../../db/data-source";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    await AppDataSource.query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ error: "database unreachable" });
  }
});

export default router;
