import bcrypt from "bcryptjs";
import User from "../models/user.js";
import { sendResetOtpEmail } from "../lib/email.js";
import { uploadToImageKit } from "../lib/imagekit.js";
import { generateUniqueInviteCode } from "../lib/inviteCode.js";

// @route   POST /api/auth/signup
export const signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      userType,
      organizationName,
      organizationType,
      organizationDescription,
      inviteCode,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUserType = userType || "contestant";
    let hostInviteCode = undefined;
    const joinedOrgs = [];

    if (newUserType === "host") {
      hostInviteCode = await generateUniqueInviteCode(
        organizationName || `${firstName} ${lastName}`
      );
    } else if (newUserType === "contestant" && inviteCode && inviteCode.trim()) {
      const hostOrg = await User.findOne({
        inviteCode: inviteCode.trim().toUpperCase(),
        userType: "host",
      });
      if (hostOrg) {
        joinedOrgs.push(hostOrg._id);
      }
    }

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      userType: newUserType,
      organizationName: newUserType === "host" ? (organizationName?.trim() || `${firstName.trim()}'s Institute`) : "",
      organizationType: newUserType === "host" ? (organizationType || "institute") : "",
      organizationDescription: newUserType === "host" ? (organizationDescription?.trim() || "") : "",
      inviteCode: hostInviteCode,
      joinedOrganizations: joinedOrgs,
      status: "active",
      avatar: "",
    });

    // Save user in session (stored in MongoDB)
    req.session.userId = user._id.toString();
    req.session.user = {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userType: user.userType,
      organizationName: user.organizationName || "",
      organizationType: user.organizationType || "",
      inviteCode: user.inviteCode || "",
      status: user.status || "active",
      avatar: user.avatar || "",
      subscription: user.subscription || { plan: "free", status: "trial" },
    };

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Failed to save session" });
      }

      return res.status(201).json({
        message: "Account created successfully",
        user: req.session.user,
      });
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        message: "Your account has been suspended. Please contact the administrator.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Record last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Save user in session (stored in MongoDB)
    req.session.userId = user._id.toString();
    req.session.user = {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userType: user.userType,
      organizationName: user.organizationName || "",
      organizationType: user.organizationType || "",
      inviteCode: user.inviteCode || "",
      status: user.status || "active",
      avatar: user.avatar || "",
      subscription: user.subscription || { plan: "free", status: "trial" },
    };

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Failed to save session" });
      }

      return res.status(200).json({
        message: "Logged in successfully",
        user: req.session.user,
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Not authenticated", user: null });
    }

    const user = await User.findById(req.session.userId)
      .select("-password")
      .populate("joinedOrganizations", "organizationName organizationType inviteCode avatar firstName lastName");

    if (!user) {
      req.session.destroy();
      return res.status(401).json({ message: "User not found", user: null });
    }

    // Auto-generate inviteCode for hosts that don't have one yet
    if (user.userType === "host" && !user.inviteCode) {
      user.inviteCode = await generateUniqueInviteCode(user.organizationName || `${user.firstName} ${user.lastName}`);
      await user.save();
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({ message: "Internal server error", user: null });
  }
};

// @route   POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the OTP and save with a 10-minute expiry
    const salt = await bcrypt.genSalt(10);
    user.resetPasswordOtp = await bcrypt.hash(otp, salt);
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.isOtpVerified = false;

    await user.save();

    // Send email using nodemailer
    await sendResetOtpEmail(normalizedEmail, otp);

    return res.status(200).json({
      message: "Verification code sent to your email",
      email: normalizedEmail,
      devOtp: process.env.NODE_ENV === "production" ? undefined : otp,
    });
  } catch (error) {
    console.error("forgotPassword error:", error);
    return res.status(500).json({ message: "Failed to send reset code" });
  }
};

// @route   POST /api/auth/verify-otp
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
    }

    if (!user.resetPasswordOtp) {
      return res.status(400).json({ message: "No reset request found for this email" });
    }

    const isMatch = await bcrypt.compare(otp.trim(), user.resetPasswordOtp);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Mark as verified
    user.isOtpVerified = true;
    await user.save();

    return res.status(200).json({ message: "Code verified successfully" });
  } catch (error) {
    console.error("verifyOtp error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// @route   POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isOtpVerified) {
      return res.status(400).json({ message: "Please verify your code first before resetting password" });
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: "Session expired. Please request a new code." });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear reset fields
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    user.isOtpVerified = false;

    await user.save();

    return res.status(200).json({ message: "Password reset successfully! You can now log in." });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({ message: "Failed to reset password" });
  }
};

// @route   POST /api/auth/avatar
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Upload to ImageKit (or fallback)
    const { url, fileId, provider } = await uploadToImageKit(
      req.file.buffer,
      req.file.originalname,
      "/fantasy_buzz/avatars",
      req.file.mimetype
    );

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      { avatar: url },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update session
    if (req.session.user) {
      req.session.user.avatar = url;
    }

    req.session.save((err) => {
      if (err) {
        console.error("Session update error:", err);
      }
      return res.status(200).json({
        message: "Profile picture updated successfully",
        avatar: url,
        user,
        provider,
      });
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    return res.status(500).json({ message: error.message || "Failed to upload avatar" });
  }
};

// @route   PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const {
      firstName,
      lastName,
      userType,
      organizationName,
      organizationType,
      organizationDescription,
    } = req.body;

    const updateFields = {};
    if (firstName && firstName.trim()) updateFields.firstName = firstName.trim();
    if (lastName && lastName.trim()) updateFields.lastName = lastName.trim();
    if (userType && ["contestant", "host"].includes(userType)) {
      if (req.session.user?.userType !== "superadmin") {
        updateFields.userType = userType;
      }
    }
    if (organizationName !== undefined) updateFields.organizationName = organizationName.trim();
    if (organizationType !== undefined) updateFields.organizationType = organizationType;
    if (organizationDescription !== undefined)
      updateFields.organizationDescription = organizationDescription.trim();

    const currentUser = await User.findById(req.session.userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      (currentUser.userType === "host" || updateFields.userType === "host") &&
      !currentUser.inviteCode
    ) {
      updateFields.inviteCode = await generateUniqueInviteCode(
        updateFields.organizationName ||
          currentUser.organizationName ||
          `${currentUser.firstName} ${currentUser.lastName}`
      );
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No valid profile fields provided" });
    }

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      updateFields,
      { new: true }
    ).select("-password");

    // Update session
    if (req.session.user) {
      if (user.firstName) req.session.user.firstName = user.firstName;
      if (user.lastName) req.session.user.lastName = user.lastName;
      if (user.userType) req.session.user.userType = user.userType;
      if (user.organizationName !== undefined)
        req.session.user.organizationName = user.organizationName;
      if (user.organizationType !== undefined)
        req.session.user.organizationType = user.organizationType;
      if (user.inviteCode) req.session.user.inviteCode = user.inviteCode;
    }

    req.session.save((err) => {
      if (err) {
        console.error("Session update error:", err);
      }
      return res.status(200).json({
        message: "Profile updated successfully",
        user,
      });
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

