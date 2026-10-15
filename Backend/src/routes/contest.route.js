import express from "express";
import {
  createContest,
  getContests,
  getContestById,
  uploadContestImage,
  updateContest,
  deleteContest,
  updateContestQuestion,
  deleteContestQuestion,
  submitQuestionAnswer,
  submitWholeContest,
  getContestResults,
} from "../controller/contest.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { upload, handleUploadError } from "../middleware/upload.middleware.js";

const router = express.Router();

// Public / Authenticated read routes
router.get("/", getContests);
router.get("/:id", getContestById);
router.get("/:id/results", getContestResults);

// Protected mutation routes
router.post("/", requireAuth, createContest);
router.post(
  "/upload-image",
  requireAuth,
  upload.single("image"),
  handleUploadError,
  uploadContestImage
);
router.put("/:id", requireAuth, updateContest);
router.delete("/:id", requireAuth, deleteContest);

// Question mutation routes
router.put("/:id/questions/:questionId", requireAuth, updateContestQuestion);
router.delete("/:id/questions/:questionId", requireAuth, deleteContestQuestion);
router.post("/:id/questions/:questionId/answer", submitQuestionAnswer);

// Whole contest submission & scoring route (open to all contestants, saves userId if authenticated)
router.post("/:id/submit", submitWholeContest);

export default router;
