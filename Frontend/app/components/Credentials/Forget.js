"use client";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { request } from "../../services/api";

const Forget = ({ setMode, setResetEmail }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await request("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });

      if (setResetEmail) {
        setResetEmail(email.trim());
      }
      setMode("requestSend");
    } catch (err) {
      setError(err.message || "Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-black text-3xl md:text-5xl font-bold mt-4 mb-2">
        Forgot Your <br /> Password
      </h1>

      <p className="text-gray-600 text-sm md:text-base mb-4 mt-3">
        Enter your email address and we&apos;ll send you a 6-digit verification code.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs md:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="mt-2 flex flex-col" onSubmit={handleSend}>
        <label className="text-gray-500 text-[12px] md:text-sm font-medium mt-2 ml-1">
          Email*
        </label>

        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
          required
          className="border border-gray-300 rounded-full px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#12BAB0]"
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-6 bg-black hover:bg-[#0ea89b] text-white text-base md:text-lg py-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-50 font-medium"
        >
          {loading ? "Sending Code..." : "Send Verification Code"}
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

export default Forget;
