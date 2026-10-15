import Contest from "../models/contest.js";
import User from "../models/user.js";

/**
 * Checks and updates the subscription status of a user (especially hosts).
 * Auto-expires active plans whose expiresAt date has passed.
 *
 * @param {Object|string} userOrId Mongoose User document or User ID
 * @returns {Promise<Object>} Subscription details and permissions
 */
export const checkSubscriptionStatus = async (userOrId) => {
  let user = userOrId;
  if (typeof userOrId === "string" || userOrId?._id === undefined) {
    user = await User.findById(userOrId);
  }

  if (!user) {
    return {
      canCreateContest: false,
      blockReason: "User not found",
    };
  }

  // Non-hosts (or superadmins) have no restriction
  if (user.userType === "superadmin") {
    return {
      canCreateContest: true,
      isSuperAdmin: true,
      plan: "superadmin",
      status: "active",
      trialRemaining: 999,
      freeLimit: 999,
      contestCount: 0,
    };
  }

  const now = new Date();
  let modified = false;

  // Initialize subscription object if not present
  if (!user.subscription) {
    user.subscription = {
      plan: "free",
      status: "trial",
      startDate: user.createdAt || now,
      expiresAt: null,
      autoRenew: true,
    };
    modified = true;
  }

  // Check if active subscription has passed its expiration date
  if (
    user.subscription.status === "active" &&
    user.subscription.expiresAt &&
    new Date(user.subscription.expiresAt) <= now
  ) {
    user.subscription.status = "expired";
    modified = true;
  }

  if (modified) {
    await user.save();
  }

  // Total contests created by this host
  const contestCount = await Contest.countDocuments({ host: user._id });
  const freeLimit = user.freeContestsLimit ?? 3;
  const trialRemaining = Math.max(0, freeLimit - contestCount);

  const isActive =
    user.subscription.status === "active" &&
    user.subscription.expiresAt &&
    new Date(user.subscription.expiresAt) > now;

  const isExpired =
    user.subscription.status === "expired" ||
    (user.subscription.expiresAt &&
      new Date(user.subscription.expiresAt) <= now &&
      user.subscription.plan !== "free");

  const isCancelled = user.subscription.status === "cancelled";

  const isTrial = !isActive && !isExpired && !isCancelled && contestCount < freeLimit;

  let canCreateContest = false;
  let blockReason = "";

  if (isActive) {
    canCreateContest = true;
  } else if (isCancelled) {
    canCreateContest = false;
    blockReason =
      "Your subscription has been cancelled. Please subscribe to a plan to continue creating contests.";
  } else if (contestCount < freeLimit) {
    canCreateContest = true;
  } else if (isExpired) {
    canCreateContest = false;
    blockReason =
      "Your subscription plan has expired. Please renew your plan to create more contests.";
  } else {
    canCreateContest = false;
    blockReason = `You have reached your free trial limit of ${freeLimit} contests. Please subscribe to a plan to continue creating contests.`;
  }

  // Calculate days remaining
  let daysRemaining = null;
  if (user.subscription.expiresAt && isActive) {
    const diffMs = new Date(user.subscription.expiresAt).getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    canCreateContest,
    blockReason,
    contestCount,
    freeLimit,
    trialRemaining,
    isTrial,
    isActive,
    isExpired,
    isCancelled,
    daysRemaining,
    subscription: {
      plan: user.subscription.plan || "free",
      status: user.subscription.status || (isTrial ? "trial" : isCancelled ? "cancelled" : "expired"),
      startDate: user.subscription.startDate,
      expiresAt: user.subscription.expiresAt,
      autoRenew: user.subscription.autoRenew ?? true,
      stripeCustomerId: user.subscription.stripeCustomerId || "",
      stripeSubscriptionId: user.subscription.stripeSubscriptionId || "",
    },
  };
};

/**
 * Activates or renews a subscription plan for a host.
 */
export const applySubscriptionPlan = async (
  user,
  plan = "monthly",
  { stripeCustomerId = "", stripeSubscriptionId = "", stripePriceId = "", customExpiresAt = null } = {}
) => {
  const now = new Date();
  let expiresAt = customExpiresAt;

  if (!expiresAt) {
    if (plan === "yearly") {
      expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    } else {
      // Monthly default (30 days)
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  if (!user.subscription) {
    user.subscription = {};
  }

  user.subscription.plan = plan;
  user.subscription.status = "active";
  user.subscription.startDate = now;
  user.subscription.expiresAt = expiresAt;
  user.subscription.autoRenew = true;

  if (stripeCustomerId) user.subscription.stripeCustomerId = stripeCustomerId;
  if (stripeSubscriptionId) user.subscription.stripeSubscriptionId = stripeSubscriptionId;
  if (stripePriceId) user.subscription.stripePriceId = stripePriceId;

  await user.save();
  return user;
};
