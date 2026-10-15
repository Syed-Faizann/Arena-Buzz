import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First name is required"],
  },
  lastName: {
    type: String,
    required: [true, "Last name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  userType: {
    type: String,
    enum: ["contestant", "host", "superadmin"],
    default: "contestant",
  },
  status: {
    type: String,
    enum: ["active", "blocked"],
    default: "active",
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  resetPasswordOtp: String,
  resetPasswordExpires: Date,
  isOtpVerified: {
    type: Boolean,
    default: false,
  },
  avatar: {
    type: String,
    default: "",
  },
  // Host Organization fields
  organizationName: {
    type: String,
    default: "",
    trim: true,
  },
  organizationType: {
    type: String,
    default: "college",
    trim: true,
  },
  organizationDescription: {
    type: String,
    default: "",
    trim: true,
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  // Contestant joined host organizations
  joinedOrganizations: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  // Host Subscription and Free Trial
  subscription: {
    plan: {
      type: String,
      enum: ["free", "monthly", "yearly"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["trial", "active", "expired", "cancelled"],
      default: "trial",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    stripeCustomerId: {
      type: String,
      default: "",
    },
    stripeSubscriptionId: {
      type: String,
      default: "",
    },
    stripePriceId: {
      type: String,
      default: "",
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
  },
  freeContestsLimit: {
    type: Number,
    default: 3,
  },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
