import express from "express";
import {
  getOrganizationByInviteCode,
  joinOrganization,
  leaveOrganization,
  getHostDashboard,
  getContestantOrganizations,
} from "../controller/organization.controller.js";
import { requireAuth, requireHost } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public: view organization profile & its ongoing contests
router.get("/public/:inviteCode", getOrganizationByInviteCode);

// Contestant: join an organization via invite code
router.post("/join/:inviteCode", requireAuth, joinOrganization);

// Contestant: leave an organization via invite code or host ID
router.post("/leave/:target", requireAuth, leaveOrganization);

// Contestant: get organizations I've joined & their ongoing contests
router.get("/my-organizations", requireAuth, getContestantOrganizations);

// Host: get host organization dashboard data (members, contests, link, stats)
router.get("/host/dashboard", requireAuth, requireHost, getHostDashboard);

export default router;
