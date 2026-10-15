import express from "express";
import {
  getSubscriptionStatus,
  createCheckoutSession,
  verifySession,
  sandboxCheckout,
  processCardPayment,
  cancelSubscription,
  stripeWebhook,
} from "../controller/subscription.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

// Webhook endpoint (must accept raw Buffer)
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// Authenticated subscription endpoints
router.get("/status", requireAuth, getSubscriptionStatus);
router.post("/create-checkout-session", requireAuth, createCheckoutSession);
router.post("/verify-session", requireAuth, verifySession);
router.post("/sandbox-checkout", requireAuth, sandboxCheckout);
router.post("/process-card-payment", requireAuth, processCardPayment);
router.post("/cancel", requireAuth, cancelSubscription);

export default router;
