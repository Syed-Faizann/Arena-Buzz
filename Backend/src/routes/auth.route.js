import express from "express";
import {
  signup,
  login,
  getMe,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  uploadAvatar,
  updateProfile,
} from "../controller/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { upload, handleUploadError } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", getMe);
router.post("/logout", logout);

router.post("/avatar", requireAuth, upload.single("avatar"), handleUploadError, uploadAvatar);
router.put("/profile", requireAuth, updateProfile);

router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

export default router;

