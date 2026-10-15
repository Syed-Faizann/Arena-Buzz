import express from "express";
import {
  getDashboardStats,
  getAllUsers,
  getActiveSessions,
  terminateSession,
  updateUserRole,
  updateUserStatus,
  adminResetPassword,
  createUser,
  deleteUser,
  getAllContests,
  deleteContestByAdmin,
  getAdminPayments,
} from "../controller/admin.controller.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply authentication and superadmin authorization to ALL routes in this file
router.use(requireAuth, requireSuperAdmin);

// Dashboard Statistics
router.get("/stats", getDashboardStats);

// Platform Revenue & Subscription Payments
router.get("/payments", getAdminPayments);

// User Management
router.get("/users", getAllUsers);
router.post("/users", createUser);
router.put("/users/:id/role", updateUserRole);
router.put("/users/:id/status", updateUserStatus);
router.put("/users/:id/password", adminResetPassword);
router.delete("/users/:id", deleteUser);

// Live Sessions ("Where all the login user")
router.get("/sessions", getActiveSessions);
router.delete("/sessions/:sessionId", terminateSession);

// Contests platform overview
router.get("/contests", getAllContests);
router.delete("/contests/:id", deleteContestByAdmin);

export default router;
