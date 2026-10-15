import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../controller/notification.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, getNotifications);
router.patch("/read-all", requireAuth, markAllAsRead);
router.patch("/:id/read", requireAuth, markAsRead);
router.delete("/clear-all", requireAuth, clearAllNotifications);
router.delete("/:id", requireAuth, deleteNotification);

export default router;
