import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    // The Host who paid for the plan
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hostName: {
      type: String,
      default: "",
    },
    hostEmail: {
      type: String,
      default: "",
      index: true,
    },
    organizationName: {
      type: String,
      default: "",
    },
    // Recipient: Super Admin / Platform Account
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    recipientEmail: {
      type: String,
      default: "admin@fantsy.com",
    },
    // Plan details
    plan: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    planTitle: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true, // in USD ($19 or $179)
    },
    currency: {
      type: String,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["completed", "refunded", "failed"],
      default: "completed",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "stripe", "sandbox"],
      default: "card",
    },
    card: {
      brand: { type: String, default: "Visa" },
      last4: { type: String, default: "4242" },
      cardHolder: { type: String, default: "" },
      exp: { type: String, default: "" },
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    stripeSessionId: {
      type: String,
      default: "",
    },
    stripeCustomerId: {
      type: String,
      default: "",
    },
    stripeSubscriptionId: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "Host subscription payment credited to Super Admin account",
    },
  },
  { timestamps: true }
);

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
export default Payment;
