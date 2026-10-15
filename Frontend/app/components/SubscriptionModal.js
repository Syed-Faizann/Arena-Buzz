"use client";
import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  CreditCard,
  Loader2,
  AlertTriangle,
  Flame,
  ArrowRight,
  ArrowLeft,
  Clock,
  Lock,
  Calendar,
  User as UserIcon,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  createSubscriptionCheckout,
  processCardPayment,
  cancelSubscription,
} from "../services/api";

export default function SubscriptionModal({
  isOpen,
  onClose,
  onSuccess,
  subStatus = null,
  initialPlan = null,
  initialStep = "plans",
  title = "Unlock Unlimited Contests",
  description = "You've reached your free trial limit of 3 contests. Upgrade to keep hosting engaging contests.",
  successButtonText = null,
}) {
  // Navigation steps: "plans" | "card" | "confirm" | "success" | "cancelConfirm"
  const [step, setStep] = useState(initialStep || "plans");
  const [selectedPlan, setSelectedPlan] = useState(initialPlan || "monthly"); // "monthly" | "yearly"

  // Card Form State
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentResult, setPaymentResult] = useState(null);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep(initialStep || "plans");
      setError("");
      setPaymentResult(null);
      if (initialPlan && ["monthly", "yearly"].includes(initialPlan)) {
        setSelectedPlan(initialPlan);
      } else if (subStatus?.subscription?.plan && ["monthly", "yearly"].includes(subStatus.subscription.plan)) {
        setSelectedPlan(subStatus.subscription.plan);
      } else {
        setSelectedPlan("monthly");
      }
    }
  }, [isOpen, subStatus, initialPlan, initialStep]);

  if (!isOpen) return null;

  const isExpired = subStatus?.isExpired;
  const isActive = subStatus?.isActive;
  const currentPlan = subStatus?.subscription?.plan;

  // Format Card Number input with spaces every 4 digits
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    setCardNumber(formatted);
  };

  // Format Expiration Date (MM/YY)
  const handleExpChange = (e) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2, 4)}`;
    }
    setExp(raw);
  };

  // 1-Click Auto Fill Test Card for localhost testing
  const handleFillTestCard = () => {
    setCardHolder("Alex Morgan");
    setCardNumber("4242 4242 4242 4242");
    setExp("12/28");
    setCvc("123");
    setZip("90210");
    setError("");
  };

  // Step 2 -> Step 3: Validate card details before asking for confirmation
  const handleValidateCardAndProceed = (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!cardHolder.trim()) {
      setError("Please enter the cardholder's name.");
      return;
    }
    const cleanNum = cardNumber.replace(/\s+/g, "");
    if (cleanNum.length < 15) {
      setError("Please enter a valid 16-digit card number.");
      return;
    }
    if (!exp || exp.length < 5) {
      setError("Please enter a valid expiration date (MM/YY).");
      return;
    }
    if (!cvc || cvc.length < 3) {
      setError("Please enter a valid 3 or 4 digit CVC security code.");
      return;
    }

    // Advance to confirmation step ("ask first before proceed payment")
    setStep("confirm");
  };

  // Step 3 -> Step 4: User explicitly confirmed payment -> Process payment on localhost
  const handleConfirmAndProcessPayment = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await processCardPayment({
        plan: selectedPlan,
        cardHolder: cardHolder.trim(),
        cardNumber: cardNumber.replace(/\s+/g, ""),
        exp,
        cvc,
        zip,
        confirmed: true, // explicit confirmation acknowledged
      });

      if (res && res.success) {
        setPaymentResult(res);
        setStep("success");
      } else {
        setError(res?.message || "Payment processing failed. Please try again.");
      }
    } catch (err) {
      console.error("Localhost payment error:", err);
      setError(err.message || "Failed to process card payment on localhost.");
    } finally {
      setLoading(false);
    }
  };

  // Cancel Subscription flow
  const handleExecuteCancel = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await cancelSubscription({ immediate: true });
      if (res && res.success) {
        if (onSuccess) onSuccess(res);
        onClose();
      } else {
        setError(res?.message || "Failed to cancel subscription.");
      }
    } catch (err) {
      console.error("Cancel subscription error:", err);
      setError(err.message || "Failed to cancel subscription.");
    } finally {
      setLoading(false);
    }
  };


  // Optional: Stripe Checkout redirect if user wants real Stripe session
  const handleStripeRedirect = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await createSubscriptionCheckout(selectedPlan);
      if (res && res.url) {
        window.location.href = res.url;
        return;
      }
      if (res && res.isSandbox) {
        // Stripe keys absent in .env, switch to card form
        setStep("card");
      }
    } catch (err) {
      setError(err.message || "Failed to start Stripe redirect.");
    } finally {
      setLoading(false);
    }
  };

  const planPrice = selectedPlan === "yearly" ? 179 : 19;
  const planPeriod = selectedPlan === "yearly" ? "year" : "month";
  const planTitle = selectedPlan === "yearly" ? "Annual Pro Plan" : "Monthly Pro Plan";
  const planDays = selectedPlan === "yearly" ? "365 days" : "30 days";
  const last4 = cardNumber ? cardNumber.replace(/\s+/g, "").slice(-4) : "4242";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-white overflow-hidden max-h-[94vh] overflow-y-auto">
        {/* Glow backdrop decorative effect */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Error notification */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 1: SELECT PLAN VIEW                                            */}
        {/* ==================================================================== */}
        {step === "plans" && (
          <div>
            {/* Modal Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                {isExpired ? "Plan Renewal Required" : "Host Subscription Plans"}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {isExpired ? "Renew Your Host Subscription" : title}
              </h2>

              <p className="mt-2 text-sm text-slate-400 max-w-lg mx-auto">
                {isExpired
                  ? "Your previous subscription cycle has ended. Renew now to continue creating and hosting contests without interruption."
                  : description}
              </p>

              {/* Free Trial Banner */}
              {subStatus && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>
                    Free Trial Usage:{" "}
                    <strong className="text-white">
                      {subStatus.contestCount || 0} of {subStatus.freeLimit || 3}
                    </strong>{" "}
                    free contests created
                  </span>
                </div>
              )}

              {/* Active Subscription Alert with Cancel Option */}
              {isActive && (
                <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-300">
                  <div className="flex items-center gap-2 text-left">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      You currently have an active{" "}
                      <strong className="text-white capitalize">
                        {currentPlan || "Monthly"} Pro
                      </strong>{" "}
                      plan ({subStatus?.daysRemaining ?? "unlimited"} days remaining).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("cancelConfirm")}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white font-medium text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    Cancel Subscription
                  </button>
                </div>
              )}
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Monthly Plan */}
              <div
                onClick={() => setSelectedPlan("monthly")}
                className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  selectedPlan === "monthly"
                    ? "bg-gradient-to-b from-slate-800/90 to-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20"
                    : "bg-slate-800/40 border-slate-700/70 hover:border-slate-600 hover:bg-slate-800/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Monthly Plan
                    </span>
                    <span className="p-1 rounded-full bg-slate-700/50 text-slate-300">
                      <Zap className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-extrabold text-white">$19</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    30 days full validity with unlimited contest creation.
                  </p>

                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Unlimited contest creation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Live leaderboard & analytics</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Cancel or renew anytime</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Billing cycle</span>
                  <span className="font-medium text-white">Every 30 days</span>
                </div>
              </div>

              {/* Yearly Plan */}
              <div
                onClick={() => setSelectedPlan("yearly")}
                className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  selectedPlan === "yearly"
                    ? "bg-gradient-to-b from-slate-800/90 to-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20"
                    : "bg-slate-800/40 border-slate-700/70 hover:border-slate-600 hover:bg-slate-800/60"
                }`}
              >
                {/* Best Value Badge */}
                <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-[10px] font-bold tracking-wider uppercase text-slate-950 shadow-md">
                  Save 22%
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Annual Pro
                    </span>
                    <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                      <Flame className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-extrabold text-white">$179</span>
                    <span className="text-xs text-slate-400">/ year</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Full 365 days access ($14.92/mo effective).
                  </p>

                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Unlimited contests for 1 year</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Unlimited contestant participants</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Priority host support & badges</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Billing cycle</span>
                  <span className="font-medium text-emerald-400">Annual (365 days)</span>
                </div>
              </div>
            </div>

            {/* Proceed to Card Details Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setStep("card")}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  Proceed to Enter Card Details (${planPrice}/{planPeriod === "year" ? "yr" : "mo"})
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center text-[11px] text-slate-400 px-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Localhost Protected Checkout with Confirmation
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 2: ENTER CARD DETAILS FORM                                      */}
        {/* ==================================================================== */}
        {step === "card" && (
          <div>
            {/* Header with Back button */}
            <div className="flex items-center justify-between mb-6">
              <button
                type="button"
                onClick={() => setStep("plans")}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Plans</span>
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Lock className="w-3 h-3" />
                <span>Step 2 of 3: Card Details</span>
              </div>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white">Enter Payment Details</h3>
              <p className="text-xs text-slate-400 mt-1">
                You are purchasing the{" "}
                <strong className="text-emerald-400 font-semibold">{planTitle}</strong> (
                ${planPrice}/{planPeriod})
              </p>
            </div>

            {/* Test Card Auto-fill Pill */}
            <div className="mb-5 p-3 rounded-2xl bg-teal-950/40 border border-teal-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-teal-300">
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Localhost testing mode is active</span>
              </div>
              <button
                type="button"
                onClick={handleFillTestCard}
                className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors shrink-0 shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Auto-Fill Test Card</span>
              </button>
            </div>

            {/* Card Details Form */}
            <form onSubmit={handleValidateCardAndProceed} className="space-y-4">
              {/* Cardholder Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Cardholder Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white text-sm outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Card Number */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Card Number
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    maxLength={19}
                    className="w-full pl-10 pr-16 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white text-sm font-mono tracking-wider outline-none transition-all placeholder:text-slate-600"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    VISA / MC
                  </div>
                </div>
              </div>

              {/* Expiration Date & CVC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Expiration Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={exp}
                      onChange={handleExpChange}
                      maxLength={5}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white text-sm font-mono outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Security Code (CVC)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="123"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white text-sm font-mono outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Postal / Zip Code */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Postal / ZIP Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 90210"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white text-sm outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Submit to Confirmation Screen */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Review & Confirm Payment Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 3: ASK FIRST CONFIRMATION ("ask first before proceed payment")   */}
        {/* ==================================================================== */}
        {step === "confirm" && (
          <div className="animate-in fade-in duration-200">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-amber-500/10">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white">Confirm Your Payment</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Please review your subscription details before we proceed with charging your card on localhost.
              </p>
            </div>

            {/* Order Summary Receipt Box */}
            <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-5 mb-6 space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-slate-400">Chosen Plan</span>
                <span className="font-bold text-white">{planTitle}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-slate-400">Plan Validity</span>
                <span className="font-semibold text-emerald-400">
                  {planDays} unlimited contest creation
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-slate-400">Payment Card</span>
                <span className="font-mono text-slate-200 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  •••• •••• •••• {last4} ({cardHolder})
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-slate-400">Billing Environment</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[11px]">
                  Localhost Sandbox (Safe Mode)
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-white">Total Amount Due</span>
                <span className="text-2xl font-black text-emerald-400">
                  ${planPrice}.00{" "}
                  <span className="text-xs font-normal text-slate-400">USD</span>
                </span>
              </div>
            </div>

            {/* Explicit Confirmation Question Box */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-6 text-center">
              <p className="text-sm font-semibold text-amber-200">
                Are you sure you want to proceed with this payment of ${planPrice}.00 on localhost?
              </p>
              <p className="text-[11px] text-amber-300/80 mt-1">
                Upon confirmation, your {planTitle} will be activated instantly with unlimited contest creation.
              </p>
            </div>

            {/* Two Action Buttons: Confirm vs Go Back */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep("card")}
                disabled={loading}
                className="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Edit Card Details</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmAndProcessPayment}
                disabled={loading}
                className="py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Yes, Confirm & Pay ${planPrice}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 4: PAYMENT SUCCESS VIEW                                         */}
        {/* ==================================================================== */}
        {step === "success" && (
          <div className="text-center py-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/20">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <h3 className="text-2xl font-black text-white">Payment Confirmed!</h3>
            <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
              Your{" "}
              <strong className="text-emerald-400 font-bold">{planTitle}</strong> has been
              successfully processed and activated on localhost.
            </p>

            {/* Receipt Summary Card */}
            <div className="mt-6 bg-slate-900/80 border border-slate-700/80 rounded-2xl p-5 max-w-md mx-auto text-xs space-y-2.5 text-left">
              <div className="flex justify-between text-slate-400">
                <span>Amount Paid:</span>
                <span className="font-bold text-white">${planPrice}.00 USD</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Card Charged:</span>
                <span className="font-mono text-slate-300">•••• •••• •••• {last4}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Validity Duration:</span>
                <span className="text-emerald-400 font-semibold">{planDays}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Host Status:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Unlimited Contests Active
                </span>
              </div>
            </div>

            <div className="mt-7">
              <button
                type="button"
                onClick={() => {
                  if (onSuccess) onSuccess(paymentResult);
                  onClose();
                }}
                className="w-full max-w-md py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/25 transition-all cursor-pointer mx-auto block"
              >
                {successButtonText || "Done & Return to Dashboard"}
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 5: CANCEL SUBSCRIPTION CONFIRMATION MODAL                       */}
        {/* ==================================================================== */}
        {step === "cancelConfirm" && (
          <div className="animate-in fade-in duration-200">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-rose-500/10">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white">Cancel Your Subscription?</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                Are you sure you want to cancel your active{" "}
                <strong className="text-white capitalize">
                  {currentPlan || "Pro"}
                </strong>{" "}
                plan?
              </p>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 mb-6 text-xs text-rose-200 space-y-2">
              <p className="font-semibold text-rose-300">
                Please note what happens when you cancel:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                <li>Your subscription will end immediately.</li>
                <li>Unlimited contest creation will be disabled.</li>
                <li>You will return to the standard free trial limit (3 contests).</li>
                <li>You can renew or choose another plan at any time.</li>
              </ul>
            </div>

            {/* Cancel Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep("plans")}
                disabled={loading}
                className="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>No, Keep My Subscription</span>
              </button>

              <button
                type="button"
                onClick={handleExecuteCancel}
                disabled={loading}
                className="py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 stroke-[2.5]" />
                    <span>Yes, Cancel Subscription</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
