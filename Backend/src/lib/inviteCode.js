import crypto from "crypto";
import User from "../models/user.js";

/**
 * Generate a unique invite code for an organization host.
 * Example: STANFORD-8A3F or ORG-92B7X1
 */
export const generateUniqueInviteCode = async (orgName = "") => {
  let prefix = "ORG";
  if (orgName && orgName.trim()) {
    prefix = orgName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    if (!prefix) prefix = "ORG";
  }

  let isUnique = false;
  let code = "";
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    code = `${prefix}-${randomSuffix}`;
    const existing = await User.findOne({ inviteCode: code });
    if (!existing) {
      isUnique = true;
    }
  }

  // Fallback purely random if needed
  if (!isUnique) {
    code = `ORG-${Date.now().toString(36).toUpperCase()}`;
  }

  return code;
};
