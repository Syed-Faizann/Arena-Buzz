import express from "express";
import { getLeaderboard } from "../controller/leaderboard.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, getLeaderboard);

export default router;
