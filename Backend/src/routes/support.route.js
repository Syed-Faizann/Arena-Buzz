import express from "express";
import {
  createSupportTicket,
  getMyTickets,
  getAllTicketsAdmin,
  updateTicketAdmin,
  deleteTicketAdmin,
} from "../controller/support.controller.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.middleware.js";
import { upload, handleUploadError } from "../middleware/upload.middleware.js";

const router = express.Router();

// User routes (Contestant / Host)
router.post(
  "/",
  requireAuth,
  upload.single("image"),
  handleUploadError,
  createSupportTicket
);

router.get("/my-tickets", requireAuth, getMyTickets);

// Super Admin management routes
router.get("/admin/all", requireAuth, requireSuperAdmin, getAllTicketsAdmin);
router.patch("/admin/:id", requireAuth, requireSuperAdmin, updateTicketAdmin);
router.delete("/admin/:id", requireAuth, requireSuperAdmin, deleteTicketAdmin);

export default router;
