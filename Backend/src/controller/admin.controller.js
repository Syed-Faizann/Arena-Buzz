import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/user.js";
import Contest from "../models/contest.js";
import Payment from "../models/payment.js";
import { generateUniqueInviteCode } from "../lib/inviteCode.js";

/**
 * Helper to get the MongoDB sessions collection
 */
const getSessionsCollection = () => {
  return mongoose.connection.collection("sessions");
};

/**
 * @route   GET /api/admin/stats
 * @desc    Fetch platform-wide stats for Super Admin dashboard
 * @access  Super Admin only
 */
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalContestants,
      totalHosts,
      totalSuperAdmins,
      blockedUsers,
      totalContests,
      ongoingContests,
      archivedContests,
      totalOrganizations,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ userType: "contestant" }),
      User.countDocuments({ userType: "host" }),
      User.countDocuments({ userType: "superadmin" }),
      User.countDocuments({ status: "blocked" }),
      Contest.countDocuments(),
      Contest.countDocuments({ status: "ongoing" }),
      Contest.countDocuments({ status: "archived" }),
      User.countDocuments({ userType: "host", organizationName: { $exists: true, $ne: "" } }),
    ]);

    // Organization type breakdown
    const orgTypes = await User.aggregate([
      { $match: { userType: "host", organizationName: { $exists: true, $ne: "" } } },
      { $group: { _id: "$organizationType", count: { $sum: 1 } } },
    ]);
    const orgBreakdown = {};
    orgTypes.forEach((item) => {
      if (item._id) orgBreakdown[item._id] = item.count;
    });

    // Calculate active sessions in MongoDB
    let activeSessionsCount = 0;
    try {
      const now = new Date();
      activeSessionsCount = await getSessionsCollection().countDocuments({
        expires: { $gt: now },
      });
    } catch (sessionErr) {
      console.warn("Could not read sessions count:", sessionErr.message);
    }

    // Recent 5 registered users
    const recentUsers = await User.find()
      .select("-password -resetPasswordOtp -resetPasswordExpires")
      .populate("joinedOrganizations", "organizationName organizationType inviteCode")
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate real revenue from Payment model (excluding simulated sandbox payments)
    let totalRevenue = 0;
    let totalPayments = 0;
    try {
      const revenueAgg = await Payment.aggregate([
        { $match: { status: "completed", paymentMethod: { $ne: "sandbox" } } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]);
      totalRevenue = revenueAgg[0]?.total || 0;
      totalPayments = revenueAgg[0]?.count || 0;
    } catch (payAggErr) {
      console.warn("Could not calculate revenue:", payAggErr.message);
    }

    const activeSubscriptions = await User.countDocuments({
      "subscription.status": "active",
      "subscription.expiresAt": { $gt: new Date() },
    });

    return res.status(200).json({
      stats: {
        totalUsers,
        totalContestants,
        totalHosts,
        totalSuperAdmins,
        blockedUsers,
        totalContests,
        ongoingContests,
        archivedContests,
        activeSessionsCount,
        totalOrganizations,
        orgBreakdown,
        totalRevenue,
        totalPayments,
        activeSubscriptions,
      },
      recentUsers,
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    return res.status(500).json({ message: "Failed to load dashboard statistics" });
  }
};

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with search, role, and status filtering
 * @access  Super Admin only
 */
export const getAllUsers = async (req, res) => {
  try {
    const { search = "", role = "all", status = "all" } = req.query;

    const query = {};

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { organizationName: regex },
        { inviteCode: regex },
      ];
    }

    if (role && role !== "all") {
      query.userType = role;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    const users = await User.find(query)
      .select("-password -resetPasswordOtp -resetPasswordExpires")
      .populate("joinedOrganizations", "organizationName organizationType inviteCode")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      users,
      count: users.length,
    });
  } catch (error) {
    console.error("getAllUsers error:", error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

/**
 * @route   GET /api/admin/sessions
 * @desc    Get all currently active logged-in user sessions from MongoDB
 * @access  Super Admin only
 */
export const getActiveSessions = async (req, res) => {
  try {
    const now = new Date();
    const rawSessions = await getSessionsCollection()
      .find({ expires: { $gt: now } })
      .toArray();

    const sessionList = [];
    const userIds = new Set();

    for (const doc of rawSessions) {
      try {
        let parsedSession = doc.session;
        if (typeof parsedSession === "string") {
          parsedSession = JSON.parse(parsedSession);
        }

        const userId = parsedSession?.userId || parsedSession?.user?.id;
        if (userId) {
          userIds.add(userId.toString());
          sessionList.push({
            sessionId: doc._id.toString(),
            expires: doc.expires,
            userId: userId.toString(),
            userSnapshot: parsedSession?.user || null,
          });
        }
      } catch (parseErr) {
        // Skip unparseable sessions
      }
    }

    // Lookup fresh user profiles from MongoDB
    const usersMap = {};
    if (userIds.size > 0) {
      const users = await User.find({
        _id: { $in: Array.from(userIds).map((id) => new mongoose.Types.ObjectId(id)) },
      }).select("-password -resetPasswordOtp -resetPasswordExpires");

      for (const u of users) {
        usersMap[u._id.toString()] = u;
      }
    }

    const formattedSessions = sessionList.map((item) => {
      const fullUser = usersMap[item.userId];
      return {
        sessionId: item.sessionId,
        expires: item.expires,
        isCurrentSession: item.sessionId === req.sessionID,
        user: fullUser
          ? {
              _id: fullUser._id,
              firstName: fullUser.firstName,
              lastName: fullUser.lastName,
              email: fullUser.email,
              userType: fullUser.userType,
              status: fullUser.status,
              avatar: fullUser.avatar,
              lastLogin: fullUser.lastLogin,
            }
          : item.userSnapshot || { _id: item.userId, email: "Unknown user" },
      };
    });

    return res.status(200).json({
      sessions: formattedSessions,
      count: formattedSessions.length,
    });
  } catch (error) {
    console.error("getActiveSessions error:", error);
    return res.status(500).json({ message: "Failed to retrieve active sessions" });
  }
};

/**
 * @route   DELETE /api/admin/sessions/:sessionId
 * @desc    Terminate an active user session (forces logout)
 * @access  Super Admin only
 */
export const terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const result = await getSessionsCollection().deleteOne({ _id: sessionId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Session not found or already expired" });
    }

    return res.status(200).json({ message: "User session terminated successfully" });
  } catch (error) {
    console.error("terminateSession error:", error);
    return res.status(500).json({ message: "Failed to terminate session" });
  }
};

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Change user role (contestant, host, superadmin)
 * @access  Super Admin only
 */
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { userType } = req.body;

    if (!["contestant", "host", "superadmin"].includes(userType)) {
      return res.status(400).json({ message: "Invalid user role specified" });
    }

    // Prevent current admin from demoting themselves if they are the only super admin
    if (id === req.session.userId && userType !== "superadmin") {
      const superAdminCount = await User.countDocuments({ userType: "superadmin" });
      if (superAdminCount <= 1) {
        return res.status(400).json({
          message: "Cannot demote yourself as you are the only Super Admin.",
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { userType },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: `User role changed to ${userType} successfully`,
      user,
    });
  } catch (error) {
    console.error("updateUserRole error:", error);
    return res.status(500).json({ message: "Failed to update user role" });
  }
};

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Change user status (active, blocked)
 * @access  Super Admin only
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "blocked"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'active' or 'blocked'" });
    }

    // Prevent admin from blocking themselves
    if (id === req.session.userId && status === "blocked") {
      return res.status(400).json({ message: "You cannot block your own account" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If blocked, purge any active sessions from MongoDB so they are logged out immediately
    if (status === "blocked") {
      try {
        const rawSessions = await getSessionsCollection().find().toArray();
        for (const doc of rawSessions) {
          try {
            let parsed = doc.session;
            if (typeof parsed === "string") parsed = JSON.parse(parsed);
            const uid = parsed?.userId || parsed?.user?.id;
            if (uid && uid.toString() === id.toString()) {
              await getSessionsCollection().deleteOne({ _id: doc._id });
            }
          } catch {
            // Ignore parse errors
          }
        }
      } catch (err) {
        console.warn("Error purging sessions for blocked user:", err.message);
      }
    }

    return res.status(200).json({
      message: `User marked as ${status}`,
      user,
    });
  } catch (error) {
    console.error("updateUserStatus error:", error);
    return res.status(500).json({ message: "Failed to update user status" });
  }
};

/**
 * @route   PUT /api/admin/users/:id/password
 * @desc    Super Admin directly resets any user's password
 * @access  Super Admin only
 */
export const adminResetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Security rule: Super Admin cannot reset other users' passwords
    if (id !== req.session.userId) {
      return res.status(403).json({
        message:
          "Super Admin cannot reset passwords for other users. Users must reset their own password via Forgot Password.",
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const user = await User.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Your Super Admin password has been updated successfully in the database",
    });
  } catch (error) {
    console.error("adminResetPassword error:", error);
    return res.status(500).json({ message: "Failed to update password" });
  }
};

/**
 * @route   POST /api/admin/users
 * @desc    Super Admin creates a new user
 * @access  Super Admin only
 */
export const createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      userType = "contestant",
      organizationName,
      organizationType,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const targetUserType = ["contestant", "host", "superadmin"].includes(userType)
      ? userType
      : "contestant";

    let hostInviteCode = undefined;
    if (targetUserType === "host") {
      hostInviteCode = await generateUniqueInviteCode(
        organizationName || `${firstName} ${lastName}`
      );
    }

    const newUser = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      userType: targetUserType,
      organizationName: "",
      organizationType: targetUserType === "host" ? "college" : "",
      inviteCode: hostInviteCode,
      status: "active",
      avatar: "",
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        userType: newUser.userType,
        organizationName: newUser.organizationName,
        organizationType: newUser.organizationType,
        inviteCode: newUser.inviteCode,
        status: newUser.status,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("createUser error:", error);
    return res.status(500).json({ message: "Failed to create user" });
  }
};

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Super Admin permanently deletes a user
 * @access  Super Admin only
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.session.userId) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete active sessions for deleted user
    try {
      const rawSessions = await getSessionsCollection().find().toArray();
      for (const doc of rawSessions) {
        try {
          let parsed = doc.session;
          if (typeof parsed === "string") parsed = JSON.parse(parsed);
          const uid = parsed?.userId || parsed?.user?.id;
          if (uid && uid.toString() === id.toString()) {
            await getSessionsCollection().deleteOne({ _id: doc._id });
          }
        } catch {
          // Ignore parse errors
        }
      }
    } catch (sessionErr) {
      console.warn("Failed to clean sessions for deleted user:", sessionErr.message);
    }

    return res.status(200).json({
      message: `User ${user.email} has been permanently deleted`,
    });
  } catch (error) {
    console.error("deleteUser error:", error);
    return res.status(500).json({ message: "Failed to delete user" });
  }
};

/**
 * @route   GET /api/admin/contests
 * @desc    Get all contests on the platform with host details and submissions count
 * @access  Super Admin only
 */
export const getAllContests = async (req, res) => {
  try {
    const contests = await Contest.find()
      .populate("host", "firstName lastName email avatar organizationName organizationType")
      .sort({ createdAt: -1 });

    const formatted = contests.map((c) => ({
      _id: c._id,
      name: c.name,
      image: c.image,
      activeTill: c.activeTill,
      startDate: c.startDate,
      status: c.status,
      host: c.host,
      totalQuestions: c.questions?.length || 0,
      totalSubmissions: c.submissions?.length || 0,
      createdAt: c.createdAt,
    }));

    return res.status(200).json({
      contests: formatted,
      count: formatted.length,
    });
  } catch (error) {
    console.error("getAllContests error:", error);
    return res.status(500).json({ message: "Failed to retrieve contests" });
  }
};

/**
 * @route   DELETE /api/admin/contests/:id
 * @desc    Super Admin deletes any contest
 * @access  Super Admin only
 */
export const deleteContestByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const contest = await Contest.findByIdAndDelete(id);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    return res.status(200).json({
      message: `Contest '${contest.name}' has been deleted`,
    });
  } catch (error) {
    console.error("deleteContestByAdmin error:", error);
    return res.status(500).json({ message: "Failed to delete contest" });
  }
};

/**
 * @route   GET /api/admin/payments
 * @desc    Retrieve all platform subscription payments credited to Super Admin account
 * @access  Super Admin only
 */
export const getAdminPayments = async (req, res) => {
  try {
    const { search = "", plan = "all", status = "all" } = req.query;

    const query = {};

    if (plan && plan !== "all") {
      query.plan = plan;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { hostName: regex },
        { hostEmail: regex },
        { transactionId: regex },
        { organizationName: regex },
        { "card.last4": regex },
      ];
    }

    const payments = await Payment.find(query)
      .populate("host", "firstName lastName email organizationName avatar")
      .populate("recipient", "firstName lastName email")
      .sort({ createdAt: -1 });

    // Revenue metrics aggregation (excluding sandbox test payments)
    const revenueAgg = await Payment.aggregate([
      { $match: { status: "completed", paymentMethod: { $ne: "sandbox" } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    const monthlyCount = await Payment.countDocuments({ plan: "monthly", status: "completed", paymentMethod: { $ne: "sandbox" } });
    const yearlyCount = await Payment.countDocuments({ plan: "yearly", status: "completed", paymentMethod: { $ne: "sandbox" } });
    const activeSubscribers = await User.countDocuments({
      "subscription.status": "active",
      "subscription.expiresAt": { $gt: new Date() },
    });

    const adminUser = await User.findOne({ userType: "superadmin" });

    return res.status(200).json({
      payments,
      totalRevenue: revenueAgg[0]?.total || 0,
      totalPayments: revenueAgg[0]?.count || 0,
      activeSubscribers,
      breakdown: {
        monthlyCount,
        yearlyCount,
      },
      adminAccount: {
        id: adminUser?._id,
        email: adminUser?.email || process.env.ADMIN_EMAIL || "admin@fantsy.com",
        name: adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : "Super Admin",
        role: "Super Admin (Platform Beneficiary)",
      },
    });
  } catch (error) {
    console.error("getAdminPayments error:", error);
    return res.status(500).json({ message: "Failed to fetch platform payment records" });
  }
};
