"use client";
import React, { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { request } from "../../services/api";

const RequestSend = ({ setMode, resetEmail }) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendMsg, setResendMsg] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      await request("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: resetEmail,
          otp: otp.trim(),
        }),
      });

      setMode("resetPassword");
    } catch (err) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResendMsg("");
    setResending(true);
    try {
      await request("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: resetEmail }),
      });
      setResendMsg("A new 6-digit code has been sent!");
    } catch (err) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <h1 className="text-black text-3xl md:text-5xl font-bold mt-4 mb-2">
        Verify Code
      </h1>

      <p className="text-gray-600 text-sm md:text-base mb-4 mt-2">
        We sent a 6-digit code to{" "}
        <span className="font-semibold text-black">{resetEmail || "your email"}</span>.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs md:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resendMsg && (
        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 text-[#0ea89b] rounded-xl text-xs md:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{resendMsg}</span>
        </div>
      )}

      <form className="mt-4 flex flex-col" onSubmit={handleVerify}>
        <label className="text-gray-500 text-[12px] md:text-sm font-medium ml-1">
          Enter 6-Digit Code*
        </label>

        <input
          type="text"
          maxLength={6}
          placeholder="000000"
          value={otp}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            setOtp(val);
            if (error) setError("");
          }}
          required
          className="mt-1 tracking-[8px] text-center font-bold text-2xl border border-gray-300 rounded-full py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#12BAB0]"
        />

        <button
          type="submit"
          disabled={loading || otp.length < 6}
          className="mt-6 bg-black hover:bg-[#0ea89b] text-white text-base md:text-lg py-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-50 font-medium"
        >
          {loading ? "Verifying..." : "Verify Code"}
        </button>

        <div className="flex justify-between items-center mt-6 text-xs md:text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-[#12BAB0] font-semibold hover:underline cursor-pointer disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend Code"}
          </button>

          <button
            type="button"
            onClick={() => setMode("forget")}
            className="text-gray-500 hover:text-black hover:underline cursor-pointer"
          >
            Change Email
          </button>
        </div>
      </form>
    </>
  );
};

export default RequestSend;
