import mongoose from "mongoose";
import User from "../models/user.js";
import Contest from "../models/contest.js";
import { generateUniqueInviteCode } from "../lib/inviteCode.js";
import { checkSubscriptionStatus } from "../lib/subscription.js";

/**
 * Helper to check if a contest deadline has passed
 */
function isContestExpired(activeTill) {
  if (!activeTill) return false;
  const dateStr = typeof activeTill === "string" ? activeTill : activeTill.date;
  if (!dateStr) return false;
  try {
    const timeStr = (typeof activeTill === "object" && activeTill.time) || "23:59:59";
    const target = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(target.getTime())) return false;
    return target - new Date() <= 0;
  } catch {
    return false;
  }
}

/**
 * @route   GET /api/org/public/:inviteCode
 * @desc    Public endpoint to view an organization and its ongoing & expired contests
 * @access  Public
 */
export const getOrganizationByInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.params;

    if (!inviteCode) {
      return res.status(400).json({ message: "Invite code is required" });
    }

    const host = await User.findOne({
      inviteCode: inviteCode.trim().toUpperCase(),
      userType: "host",
    }).select("firstName lastName avatar organizationName organizationType organizationDescription inviteCode createdAt");

    if (!host) {
      return res.status(404).json({ message: "Organization not found for this invite code" });
    }

    // Retrieve all contests created by this host organization
    const allContests = await Contest.find({
      host: host._id,
    }).sort({ createdAt: -1 }).lean();

    const enrichedContests = allContests.map((c) => {
      const expired = c.status === "archived" || isContestExpired(c.activeTill);
      return {
        ...c,
        isExpired: Boolean(expired),
        displayStatus: expired ? "expired" : "ongoing",
      };
    });

    const ongoingContests = enrichedContests.filter((c) => !c.isExpired);
    const expiredContests = enrichedContests.filter((c) => c.isExpired);

    // Count enrolled contestants
    const totalMembers = await User.countDocuments({
      joinedOrganizations: host._id,
    });

    // Check if the current viewer is already a member
    let isMember = false;
    if (req.session && req.session.userId) {
      const viewer = await User.findById(req.session.userId);
      if (viewer && viewer.joinedOrganizations?.some((id) => id.toString() === host._id.toString())) {
        isMember = true;
      }
    }

    return res.status(200).json({
      organization: {
        _id: host._id,
        name: host.organizationName || `${host.firstName}'s Institute`,
        type: host.organizationType || "institute",
        description: host.organizationDescription || "",
        avatar: host.avatar || "",
        hostName: `${host.firstName} ${host.lastName}`,
        inviteCode: host.inviteCode,
        createdAt: host.createdAt,
        totalMembers,
        isMember,
        ongoingCount: ongoingContests.length,
        expiredCount: expiredContests.length,
        totalContests: enrichedContests.length,
      },
      contests: enrichedContests,
      ongoingContests,
      expiredContests,
      count: enrichedContests.length,
      ongoingCount: ongoingContests.length,
      expiredCount: expiredContests.length,
    });
  } catch (error) {
    console.error("getOrganizationByInviteCode error:", error);
    return res.status(500).json({ message: "Failed to retrieve organization details" });
  }
};

/**
 * @route   POST /api/org/join/:inviteCode
 * @desc    Contestant joins a host organization via invite code
 * @access  Authenticated (Contestants)
 */
export const joinOrganization = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const currentUserId = req.session.userId;

    if (!inviteCode) {
      return res.status(400).json({ message: "Invite code is required" });
    }

    const host = await User.findOne({
      inviteCode: inviteCode.trim().toUpperCase(),
      userType: "host",
    });

    if (!host) {
      return res.status(404).json({ message: "Invalid invite code. Organization not found." });
    }

    if (host._id.toString() === currentUserId.toString()) {
      return res.status(400).json({ message: "You are the host of this organization." });
    }

    const contestant = await User.findById(currentUserId);
    if (!contestant) {
      return res.status(404).json({ message: "User not found" });
    }

    if (contestant.userType === "superadmin") {
      return res.status(400).json({
        message: "Super Admins cannot join organizations as contestants.",
      });
    }

    if (contestant.userType === "host") {
      return res.status(400).json({
        message: "Host accounts cannot join other organizations as contestants.",
      });
    }

    const alreadyJoined = contestant.joinedOrganizations?.some(
      (id) => id.toString() === host._id.toString()
    );

    if (alreadyJoined) {
      return res.status(200).json({
        message: `You are already enrolled in ${host.organizationName || "this organization"}`,
        organization: {
          _id: host._id,
          name: host.organizationName || `${host.firstName}'s Institute`,
          type: host.organizationType || "institute",
          inviteCode: host.inviteCode,
        },
      });
    }

    // Add host to contestant's joinedOrganizations
    contestant.joinedOrganizations.push(host._id);
    await contestant.save();

    return res.status(200).json({
      message: `Successfully joined ${host.organizationName || `${host.firstName}'s Organization`}!`,
      organization: {
        _id: host._id,
        name: host.organizationName || `${host.firstName}'s Institute`,
        type: host.organizationType || "institute",
        inviteCode: host.inviteCode,
      },
    });
  } catch (error) {
    console.error("joinOrganization error:", error);
    return res.status(500).json({ message: "Failed to join organization" });
  }
};

/**
 * @route   POST /api/org/leave/:target
 * @desc    Contestant leaves a host organization via invite code or organization ID
 * @access  Authenticated (Contestants)
 */
export const leaveOrganization = async (req, res) => {
  try {
    const { target } = req.params;
    const currentUserId = req.session.userId;

    if (!target) {
      return res.status(400).json({ message: "Organization identifier is required" });
    }

    // Target can be either an ObjectId or invite code
    let host = null;
    const isObjectId = mongoose.Types.ObjectId.isValid(target);
    if (isObjectId) {
      host = await User.findOne({ _id: target, userType: "host" });
    }
    if (!host) {
      host = await User.findOne({
        inviteCode: target.trim().toUpperCase(),
        userType: "host",
      });
    }

    if (!host) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const contestant = await User.findById(currentUserId);
    if (!contestant) {
      return res.status(404).json({ message: "User not found" });
    }

    const prevLength = (contestant.joinedOrganizations || []).length;
    contestant.joinedOrganizations = (contestant.joinedOrganizations || []).filter(
      (id) => id.toString() !== host._id.toString()
    );

    if (contestant.joinedOrganizations.length === prevLength) {
      return res.status(400).json({
        message: `You are not enrolled in ${host.organizationName || "this organization"}`,
      });
    }

    await contestant.save();

    return res.status(200).json({
      message: `You have successfully left ${host.organizationName || `${host.firstName}'s Organization`}`,
      organizationId: host._id,
      inviteCode: host.inviteCode,
    });
  } catch (error) {
    console.error("leaveOrganization error:", error);
    return res.status(500).json({ message: "Failed to leave organization" });
  }
};

/**
 * @route   GET /api/org/host/dashboard
 * @desc    Comprehensive Host Organization dashboard metrics, joined contestants, and contests
 * @access  Host only
 */
export const getHostDashboard = async (req, res) => {
  try {
    const hostId = req.session.userId;
    const host = await User.findById(hostId);

    if (!host || host.userType !== "host") {
      return res.status(403).json({
        message: "Access denied. Host organization account required.",
      });
    }

    // Auto-generate inviteCode if not present
    if (!host.inviteCode) {
      host.inviteCode = await generateUniqueInviteCode(
        host.organizationName || `${host.firstName} ${host.lastName}`
      );
      await host.save();
    }

    // Host contests
    const contests = await Contest.find({ host: hostId }).sort({ createdAt: -1 });

    const totalContests = contests.length;
    const ongoingContests = contests.filter((c) => c.status === "ongoing" && !isContestExpired(c.activeTill)).length;
    const archivedContests = contests.filter((c) => c.status === "archived" || isContestExpired(c.activeTill)).length;

    let totalSubmissions = 0;
    for (const c of contests) {
      totalSubmissions += c.submissions?.length || 0;
    }

    // Contestants who joined via this host's invite code
    const joinedMembers = await User.find({
      joinedOrganizations: hostId,
    })
      .select("firstName lastName email avatar createdAt lastLogin")
      .sort({ createdAt: -1 });

    const subscriptionStatus = await checkSubscriptionStatus(host);

    return res.status(200).json({
      organization: {
        _id: host._id,
        name: host.organizationName || `${host.firstName}'s Organization`,
        type: host.organizationType || "institute",
        description: host.organizationDescription || "",
        inviteCode: host.inviteCode,
        avatar: host.avatar || "",
        email: host.email,
        hostName: `${host.firstName} ${host.lastName}`,
      },
      stats: {
        totalContests,
        ongoingContests,
        archivedContests,
        totalMembers: joinedMembers.length,
        totalSubmissions,
      },
      subscription: subscriptionStatus,
      members: joinedMembers,
      contests,
    });
  } catch (error) {
    console.error("getHostDashboard error:", error);
    return res.status(500).json({ message: "Failed to load host dashboard" });
  }
};

/**
 * @route   GET /api/org/contestant/organizations
 * @desc    Get all organizations that the current contestant has joined + their ongoing contests
 * @access  Authenticated
 */
export const getContestantOrganizations = async (req, res) => {
  try {
    const userId = req.session.userId;
    const contestant = await User.findById(userId).populate(
      "joinedOrganizations",
      "firstName lastName avatar organizationName organizationType organizationDescription inviteCode"
    );

    if (!contestant) {
      return res.status(404).json({ message: "User not found" });
    }

    const orgIds = contestant.joinedOrganizations?.map((o) => o._id) || [];

    // Retrieve all ongoing contests from all joined organizations
    const orgContests = await Contest.find({
      host: { $in: orgIds },
      status: "ongoing",
    })
      .populate("host", "firstName lastName avatar organizationName organizationType")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      organizations: contestant.joinedOrganizations || [],
      contests: orgContests,
    });
  } catch (error) {
    console.error("getContestantOrganizations error:", error);
    return res.status(500).json({ message: "Failed to fetch contestant organizations" });
  }
};
