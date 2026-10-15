"use client";
import React, { useState } from "react";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { request } from "../../services/api";

const restrictions = [
  "Be minimum 6 characters",
  "Include letters and numbers",
  "Cannot match your previous password",
];

const ResetPassword = ({ setMode, resetEmail }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await request("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: resetEmail,
          newPassword: password,
        }),
      });

      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="py-6 text-center flex flex-col items-center">
        <CheckCircle2 className="w-16 h-16 text-[#12BAB0] mb-4" />
        <h2 className="text-[#0A0A0A] text-2xl md:text-3xl font-bold mb-2">
          Password Reset!
        </h2>
        <p className="text-gray-600 text-sm md:text-base mb-6 max-w-sm">
          Your password has been changed successfully. You can now log in with your new password.
        </p>
        <button
          type="button"
          onClick={() => setMode("login")}
          className="bg-black hover:bg-[#0ea89b] text-white py-2.5 px-8 rounded-full font-medium transition-colors cursor-pointer"
        >
          Proceed to Login
        </button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-black text-3xl md:text-5xl font-bold mt-4 mb-2">
        Reset Your <br /> Password
      </h1>

      <p className="text-gray-600 text-sm md:text-base mb-4 mt-2">
        Set a new secure password for your account.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs md:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="mt-4 flex flex-col" onSubmit={handleSubmit}>
        <label className="text-gray-500 text-[12px] md:text-sm font-medium ml-1">
          New Password*
        </label>
        <div className="relative w-full mt-1">
          <input
            className="border border-gray-300 rounded-full px-4 py-2 w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#12BAB0]"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#12BAB0]"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <label className="text-gray-500 text-[12px] md:text-sm font-medium mt-4 ml-1">
          Confirm New Password*
        </label>
        <div className="relative w-full mt-1">
          <input
            className="border border-gray-300 rounded-full px-4 py-2 w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#12BAB0]"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (error) setError("");
            }}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#12BAB0]"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="mt-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
          <h2 className="text-black text-xs md:text-sm font-semibold">Your password must:</h2>
          <ul className="mt-1 space-y-1">
            {restrictions.map((item, index) => (
              <li key={index} className="text-gray-500 text-[11px] md:text-xs list-disc list-inside">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 bg-black hover:bg-[#0ea89b] text-white text-base md:text-lg py-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-50 font-medium"
        >
          {loading ? "Resetting Password..." : "Reset Password"}
        </button>

        <button
          type="button"
          onClick={() => setMode("login")}
          className="mt-4 text-xs md:text-sm text-gray-600 hover:text-black hover:underline cursor-pointer text-center"
        >
          Back to Login
        </button>
      </form>
    </>
  );
};

export default ResetPassword;
