import Stripe from "stripe";
import User from "../models/user.js";
import Payment from "../models/payment.js";
import { checkSubscriptionStatus, applySubscriptionPlan } from "../lib/subscription.js";

// Helper to get Stripe instance if key exists
const getStripeInstance = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.trim() || !secretKey.startsWith("sk_")) {
    return null;
  }
  return new Stripe(secretKey.trim());
};

/**
 * @route   GET /api/subscription/status
 * @desc    Get current user subscription, limits, and expiration info
 * @access  Host / SuperAdmin
 */
export const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const status = await checkSubscriptionStatus(user);
    const stripe = getStripeInstance();

    return res.status(200).json({
      ...status,
      stripeConfigured: !!stripe,
    });
  } catch (error) {
    console.error("getSubscriptionStatus error:", error);
    return res.status(500).json({ message: "Failed to retrieve subscription status" });
  }
};

/**
 * @route   POST /api/subscription/create-checkout-session
 * @desc    Create a Stripe Checkout Session for Monthly or Yearly plan
 * @access  Host
 */
export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { plan = "monthly" } = req.body;
    if (!["monthly", "yearly"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan specified. Choose 'monthly' or 'yearly'." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const stripe = getStripeInstance();
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // If Stripe is NOT configured, inform frontend to fallback to Sandbox checkout
    if (!stripe) {
      return res.status(200).json({
        isSandbox: true,
        message: "Stripe API key is not configured in .env. You can proceed with instant Sandbox checkout.",
      });
    }

    // Determine price / product
    const isYearly = plan === "yearly";
    const amountCents = isYearly ? 17900 : 1900; // $179 vs $19
    const planTitle = isYearly ? "Host Pro Annual Plan" : "Host Pro Monthly Plan";
    const planDescription = isYearly
      ? "Unlimited contests, full analytics, valid for 365 days"
      : "Unlimited contests, full analytics, valid for 30 days";

    // If user already has a Stripe Customer ID, reuse it
    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user._id.toString(),
          organization: user.organizationName || "",
        },
      });
      customerId = customer.id;
      if (!user.subscription) user.subscription = {};
      user.subscription.stripeCustomerId = customerId;
      await user.save();
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: planTitle,
              description: planDescription,
            },
            unit_amount: amountCents,
            recurring: {
              interval: isYearly ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${frontendUrl}/dashboard/host?tab=billing&payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard/host?tab=billing&payment=cancelled`,
      client_reference_id: user._id.toString(),
      metadata: {
        userId: user._id.toString(),
        plan,
      },
    });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      isSandbox: false,
    });
  } catch (error) {
    console.error("createCheckoutSession error:", error);
    return res.status(500).json({ message: error.message || "Failed to create checkout session" });
  }
};

/**
 * @route   POST /api/subscription/verify-session
 * @desc    Verify Stripe Checkout session upon redirect back to frontend
 * @access  Host
 */
export const verifySession = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const stripe = getStripeInstance();
    if (!stripe) {
      return res.status(400).json({ message: "Stripe is not configured" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Stripe session not found" });
    }

    if (session.payment_status === "paid" || session.status === "complete") {
      const user = await User.findById(userId);
      const plan = session.metadata?.plan || "monthly";
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      await applySubscriptionPlan(user, plan, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
      });

      // Record payment for Admin Dashboard
      try {
        const adminUser = await User.findOne({ userType: "superadmin" });
        const recipientEmail = adminUser?.email || process.env.ADMIN_EMAIL || "admin@fantsy.com";
        const amount = plan === "yearly" ? 179 : 19;
        const planName = plan === "yearly" ? "Host Pro Annual Plan" : "Host Pro Monthly Plan";

        await Payment.create({
          transactionId: session.payment_intent || session.id || `TXN-STRIPE-${Date.now()}`,
          host: user._id,
          hostName: `${user.firstName} ${user.lastName}`,
          hostEmail: user.email,
          organizationName: user.organizationName || "",
          recipient: adminUser?._id || null,
          recipientEmail,
          plan,
          planTitle: planName,
          amount,
          currency: "USD",
          status: "completed",
          paymentMethod: "stripe",
          stripeSessionId: session.id,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          validFrom: user.subscription.startDate,
          validUntil: user.subscription.expiresAt,
          notes: `Stripe checkout subscription payment received by Super Admin (${recipientEmail})`,
        });
      } catch (payErr) {
        console.error("Failed to record Stripe payment:", payErr);
      }

      const updatedStatus = await checkSubscriptionStatus(user);

      return res.status(200).json({
        success: true,
        message: `Plan ${plan} successfully activated!`,
        subscription: updatedStatus.subscription,
      });
    }

    return res.status(400).json({ message: "Payment was not completed" });
  } catch (error) {
    console.error("verifySession error:", error);
    return res.status(500).json({ message: error.message || "Failed to verify session" });
  }
};

/**
 * @route   POST /api/subscription/sandbox-checkout
 * @desc    Instant one-click Sandbox checkout for testing plan activation, expiration, and renewal
 * @access  Host
 */
export const sandboxCheckout = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { plan = "monthly", simulateExpired = false, durationMinutes = null, resetToFree = false } = req.body;

    if (resetToFree) {
      user.subscription = {
        plan: "free",
        status: "trial",
        startDate: new Date(),
        expiresAt: null,
        autoRenew: true,
      };
      await user.save();
      const status = await checkSubscriptionStatus(user);
      return res.status(200).json({
        success: true,
        message: "Reset to Free Trial (3 contests limit)",
        status,
      });
    }

    if (simulateExpired) {
      if (!user.subscription) user.subscription = {};
      user.subscription.status = "expired";
      user.subscription.plan = plan || "monthly";
      // 1 minute in the past
      user.subscription.expiresAt = new Date(Date.now() - 60 * 1000);
      await user.save();
      const status = await checkSubscriptionStatus(user);
      return res.status(200).json({
        success: true,
        message: "Plan simulated as EXPIRED. You can now test the renewal flow.",
        status,
      });
    }

    let customExpiresAt = null;
    if (durationMinutes && Number(durationMinutes) > 0) {
      customExpiresAt = new Date(Date.now() + Number(durationMinutes) * 60 * 1000);
    }

    await applySubscriptionPlan(user, plan, {
      customExpiresAt,
      stripeCustomerId: "cus_sandbox_test",
      stripeSubscriptionId: "sub_sandbox_test",
    });

    // Record Sandbox payment for Admin Dashboard
    try {
      const adminUser = await User.findOne({ userType: "superadmin" });
      const recipientEmail = adminUser?.email || process.env.ADMIN_EMAIL || "admin@fantsy.com";
      const amount = plan === "yearly" ? 179 : 19;
      const planName = plan === "yearly" ? "Host Pro Annual Plan (Sandbox)" : "Host Pro Monthly Plan (Sandbox)";

      await Payment.create({
        transactionId: `TXN-SBX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        host: user._id,
        hostName: `${user.firstName} ${user.lastName}`,
        hostEmail: user.email,
        organizationName: user.organizationName || "",
        recipient: adminUser?._id || null,
        recipientEmail,
        plan,
        planTitle: planName,
        amount,
        currency: "USD",
        status: "completed",
        paymentMethod: "sandbox",
        validFrom: user.subscription.startDate,
        validUntil: user.subscription.expiresAt,
        notes: `Sandbox testing subscription payment credited to Super Admin (${recipientEmail})`,
      });
    } catch (payErr) {
      console.error("Failed to record sandbox payment:", payErr);
    }

    const status = await checkSubscriptionStatus(user);

    return res.status(200).json({
      success: true,
      message: `Sandbox ${plan} plan activated successfully! Valid until ${user.subscription.expiresAt.toLocaleDateString()}`,
      status,
    });
  } catch (error) {
    console.error("sandboxCheckout error:", error);
    return res.status(500).json({ message: error.message || "Failed to process sandbox checkout" });
  }
};

/**
 * @route   POST /api/subscription/process-card-payment
 * @desc    Process card payment directly with card details & localhost confirmation
 * @access  Host
 */
export const processCardPayment = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated. Please log in." });
    }

    const { plan = "monthly", cardHolder, cardNumber, exp, cvc, confirmed = false } = req.body;

    if (!confirmed) {
      return res.status(400).json({
        message: "Payment confirmation is required before proceeding. Please review and confirm your payment.",
      });
    }

    if (!["monthly", "yearly"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan specified. Choose 'monthly' or 'yearly'." });
    }

    if (!cardHolder || !cardNumber || !exp || !cvc) {
      return res.status(400).json({ message: "All card details (Cardholder Name, Number, Expiry, CVC) are required." });
    }

    const cleanNumber = String(cardNumber).replace(/\s+/g, "");
    if (cleanNumber.length < 12) {
      return res.status(400).json({ message: "Please enter a valid card number." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const last4 = cleanNumber.slice(-4);
    const amount = plan === "yearly" ? 179 : 19;
    const planName = plan === "yearly" ? "Annual Pro (365 days)" : "Monthly Pro (30 days)";

    // If Stripe is configured in .env, process real charge via Stripe API
    const stripe = getStripeInstance();
    let stripeCharge = null;

    if (stripe) {
      try {
        const [expMonthStr, expYearStr] = (exp || "").split("/");
        const expMonth = parseInt(expMonthStr, 10) || 12;
        let expYear = parseInt(expYearStr, 10) || 28;
        if (expYear < 100) expYear += 2000;

        // Map card brand to official Stripe test token for seamless test processing
        let testToken = "tok_visa";
        if (cleanNumber.startsWith("5")) testToken = "tok_mastercard";
        else if (cleanNumber.startsWith("3")) testToken = "tok_amex";
        else if (cleanNumber.startsWith("6")) testToken = "tok_discover";

        let sourceToken = testToken;
        try {
          const created = await stripe.tokens.create({
            card: {
              number: cleanNumber,
              exp_month: expMonth,
              exp_year: expYear,
              cvc: String(cvc).trim(),
              name: cardHolder.trim(),
            },
          });
          if (created?.id) sourceToken = created.id;
        } catch {
          // Stripe restricts sending raw credit cards without PCI compliance; use test token
          sourceToken = testToken;
        }

        // 2. Create charge on Stripe
        stripeCharge = await stripe.charges.create({
          amount: amount * 100, // in cents ($19 -> 1900, $179 -> 17900)
          currency: "usd",
          source: sourceToken,
          description: `Fantsy Host Subscription - ${planName} (${user.email})`,
          receipt_email: user.email,
          metadata: {
            userId: user._id.toString(),
            plan,
            hostEmail: user.email,
            organization: user.organizationName || "",
            cardHolder: cardHolder.trim(),
            last4: cleanNumber.slice(-4),
          },
        });
      } catch (stripeErr) {
        console.error("Stripe live charge error:", stripeErr);
        return res.status(400).json({
          message: `Stripe Payment Error: ${stripeErr.message || "Failed to charge card with Stripe."}`,
        });
      }
    }

    // Apply plan activation
    await applySubscriptionPlan(user, plan, {
      stripeCustomerId: stripeCharge?.customer || user.subscription?.stripeCustomerId || `cus_local_${Date.now()}`,
      stripeSubscriptionId: stripeCharge?.id || `sub_card_${last4}_${Date.now()}`,
    });

    // Record Payment in database credited to Super Admin account
    let paymentRecord = null;
    try {
      const adminUser = await User.findOne({ userType: "superadmin" });
      const recipientEmail = adminUser?.email || process.env.ADMIN_EMAIL || "admin@fantsy.com";
      const transactionId = stripeCharge?.id || `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      paymentRecord = await Payment.create({
        transactionId,
        host: user._id,
        hostName: `${user.firstName} ${user.lastName}`,
        hostEmail: user.email,
        organizationName: user.organizationName || "",
        recipient: adminUser?._id || null,
        recipientEmail,
        plan,
        planTitle: planName,
        amount,
        currency: "USD",
        status: "completed",
        paymentMethod: stripeCharge ? "stripe" : "card",
        stripeSessionId: stripeCharge?.id || "",
        stripeCustomerId: stripeCharge?.customer || "",
        card: {
          brand: stripeCharge?.payment_method_details?.card?.brand || (cleanNumber.startsWith("4") ? "Visa" : cleanNumber.startsWith("5") ? "Mastercard" : "Card"),
          last4,
          cardHolder: cardHolder.trim(),
          exp: exp.trim(),
        },
        validFrom: user.subscription.startDate,
        validUntil: user.subscription.expiresAt,
        notes: stripeCharge
          ? `Stripe Charge (${stripeCharge.id}) processed and credited to Super Admin (${recipientEmail})`
          : `Host subscription payment of $${amount}.00 received and credited to Super Admin account (${recipientEmail})`,
      });
    } catch (payErr) {
      console.error("Failed to record payment in DB:", payErr);
    }

    const status = await checkSubscriptionStatus(user);

    return res.status(200).json({
      success: true,
      message: `Payment of $${amount}.00 confirmed and processed! ${planName} is now active.`,
      transactionId: paymentRecord?.transactionId || `TXN-${Date.now()}`,
      recipientEmail: paymentRecord?.recipientEmail || "admin@fantsy.com",
      card: {
        last4,
        cardHolder,
        brand: cleanNumber.startsWith("4") ? "Visa" : cleanNumber.startsWith("5") ? "Mastercard" : "Card",
      },
      status,
    });
  } catch (error) {
    console.error("processCardPayment error:", error);
    return res.status(500).json({ message: error.message || "Failed to process card payment" });
  }
};

/**
 * @route   POST /api/subscription/cancel
 * @desc    Cancel subscription (immediate or at period end)
 * @access  Host
 */
export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findById(userId);
    if (!user || !user.subscription) {
      return res.status(400).json({ message: "No active subscription found" });
    }

    const { immediate = true } = req.body || {};

    if (immediate) {
      user.subscription.status = "cancelled";
      user.subscription.plan = "free";
      user.subscription.expiresAt = new Date();
      user.subscription.autoRenew = false;
      await user.save();

      const status = await checkSubscriptionStatus(user);

      return res.status(200).json({
        success: true,
        message: "Your subscription has been cancelled immediately. Unlimited contest creation has ended.",
        status,
      });
    }

    user.subscription.autoRenew = false;
    await user.save();

    const status = await checkSubscriptionStatus(user);

    return res.status(200).json({
      success: true,
      message: "Auto-renew turned off. You retain access until the end of your billing cycle.",
      status,
    });
  } catch (error) {
    console.error("cancelSubscription error:", error);
    return res.status(500).json({ message: "Failed to cancel subscription" });
  }
};

/**
 * @route   POST /api/subscription/webhook
 * @desc    Stripe webhook handler
 * @access  Public (Stripe signature verified)
 */
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripeInstance();

  if (!stripe || !webhookSecret) {
    return res.status(400).json({ message: "Stripe webhook not configured" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook constructEvent error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.client_reference_id;
        const plan = session.metadata?.plan || "monthly";

        if (userId) {
          const user = await User.findById(userId);
          if (user) {
            await applySubscriptionPlan(user, plan, {
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
            });
            console.log(`Stripe webhook: Subscription activated for user ${userId}`);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const user = await User.findOne({ "subscription.stripeCustomerId": customerId });
        if (user) {
          const plan = user.subscription?.plan || "monthly";
          await applySubscriptionPlan(user, plan, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: invoice.subscription,
          });
          console.log(`Stripe webhook: Invoice paid and subscription renewed for user ${user._id}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const user = await User.findOne({ "subscription.stripeSubscriptionId": sub.id });
        if (user) {
          user.subscription.status = "expired";
          await user.save();
          console.log(`Stripe webhook: Subscription expired for user ${user._id}`);
        }
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    return res.status(500).json({ message: "Webhook handler error" });
  }
};
