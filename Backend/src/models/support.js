import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    userName: {
      type: String,
      default: "",
    },
    userEmail: {
      type: String,
      default: "",
    },
    userRole: {
      type: String,
      enum: ["contestant", "host", "superadmin"],
      default: "contestant",
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },
    category: {
      type: String,
      enum: [
        "bug",
        "contest_issue",
        "billing",
        "account",
        "feature_request",
        "other",
      ],
      default: "bug",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [3000, "Description cannot exceed 3000 characters"],
    },
    attachmentUrl: {
      type: String,
      default: "",
    },
    attachmentFileId: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "in_review", "resolved", "closed"],
      default: "pending",
    },
    adminResponse: {
      type: String,
      default: "",
      trim: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient search and filtering
supportTicketSchema.index({ status: 1, priority: 1, userRole: 1, createdAt: -1 });

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

export default SupportTicket;
