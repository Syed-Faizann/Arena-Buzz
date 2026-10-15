"use client";
import React, { useState } from "react";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

const SignupForm = ({ setMode }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "contestant",
    organizationName: "",
    organizationType: "college",
    inviteCode: "",
    agreeTerms: false,
  });

  const [customOrgType, setCustomOrgType] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { signup } = useAuth();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("First and Last name are required.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (formData.userType === "host" && !formData.organizationName.trim()) {
      setError("Please provide your Organization / Institute name.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!formData.agreeTerms) {
      setError("Please agree to the terms and privacy policy.");
      return;
    }

    setLoading(true);
    try {
      const resolvedOrgType =
        formData.userType === "host" && formData.organizationType === "other" && customOrgType.trim()
          ? customOrgType.trim()
          : formData.organizationType;

      await signup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        userType: formData.userType,
        organizationName: formData.organizationName,
        organizationType: resolvedOrgType,
        inviteCode: formData.inviteCode,
      });

      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="py-6 text-center flex flex-col items-center">
        <CheckCircle2 className="w-16 h-16 text-[#12BAB0] mb-4" />
        <h2 className="text-[#0A0A0A] text-2xl md:text-3xl font-bold mb-2">
          Account Created!
        </h2>
        <p className="text-gray-600 text-sm md:text-base mb-6 max-w-sm">
          Your account has been created successfully. You can now log in to access the platform.
        </p>
        <button
          type="button"
          onClick={() => (setMode ? setMode("login") : null)}
          className="bg-black hover:bg-[#0ea89b] text-white py-2.5 px-8 rounded-full font-medium transition-colors cursor-pointer"
        >
          Proceed to Login
        </button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-[#0A0A0A] text-3xl md:text-4xl font-bold mt-4 mb-1">
        Sign Up
      </h1>
      <p className="text-gray-500 text-xs md:text-sm mb-4">
        Join Fantasy Buzz to participate or host exciting contests.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs md:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="flex flex-col" onSubmit={handleSubmit}>
        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-gray-500 text-[12px] md:text-sm font-medium">
              First name*
            </label>
            <input
              name="firstName"
              type="text"
              required
              value={formData.firstName}
              onChange={handleChange}
              className="mt-1 w-full border border-gray-300 rounded-full px-4 py-2 text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#12BAB0]"
            />
          </div>
          <div>
            <label className="text-gray-500 text-[12px] md:text-sm font-medium">
              Last name*
            </label>
            <input
              name="lastName"
              type="text"
              required
              value={formData.lastName}
              onChange={handleChange}
              className="mt-1 w-full border border-gray-300 rounded-full px-4 py-2 text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#12BAB0]"
            />
          </div>
        </div>

        {/* Email */}
        <label className="text-gray-500 text-[12px] md:text-sm font-medium mt-3">
          Email address*
        </label>
        <input
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="mt-1 border border-gray-300 rounded-full px-4 py-2 text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#12BAB0]"
        />

        {/* Role Selection */}
        <label className="text-gray-500 text-[12px] md:text-sm font-medium mt-3 mb-1">
          I want to join as:
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFormData((p) => ({ ...p, userType: "contestant" }))}
            className={`py-2 px-4 rounded-full text-xs md:text-sm font-semibold border transition cursor-pointer ${
              formData.userType === "contestant"
                ? "bg-[#12BAB0] text-white border-[#12BAB0] shadow-sm"
                : "border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            Contestant
          </button>
          <button
            type="button"
            onClick={() => setFormData((p) => ({ ...p, userType: "host" }))}
            className={`py-2 px-4 rounded-full text-xs md:text-sm font-semibold border transition cursor-pointer ${
              formData.userType === "host"
                ? "bg-[#12BAB0] text-white border-[#12BAB0] shadow-sm"
                : "border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            Host Organization
          </button>
        </div>

        {/* Organization Fields for Hosts */}
        {formData.userType === "host" && (
          <div className="mt-3 p-4 bg-teal-50/60 border border-teal-200/80 rounded-2xl space-y-3 animate-in fade-in duration-200">
            <span className="text-xs font-bold text-[#010B28] block">
              Organization / Institute Details
            </span>
            <div>
              <label className="text-gray-600 text-[11px] font-semibold block mb-1">
                Organization / College / School Name*
              </label>
              <input
                name="organizationName"
                type="text"
                required
                placeholder="e.g. Oxford College, Apex School, Tech Institute"
                value={formData.organizationName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-[#0A0A0A] text-xs focus:outline-none focus:ring-2 focus:ring-[#12BAB0] bg-white"
              />
            </div>
            <div>
              <label className="text-gray-600 text-[11px] font-semibold block mb-1">
                Organization Category*
              </label>
              <select
                name="organizationType"
                value={formData.organizationType}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-[#0A0A0A] text-xs focus:outline-none focus:ring-2 focus:ring-[#12BAB0] bg-white font-medium"
              >
                <option value="school">School</option>
                <option value="college">College</option>
                <option value="university">University</option>
                <option value="institute">Coaching / Training Institute / Academy</option>
                <option value="company">Corporate / Company</option>
                <option value="other">Other</option>
              </select>
            </div>
            {formData.organizationType === "other" && (
              <div>
                <label className="text-gray-600 text-[11px] font-semibold block mb-1">
                  Specify Custom Category*
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sports Academy, Non-Profit, Tech Club"
                  value={customOrgType}
                  onChange={(e) => setCustomOrgType(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-[#0A0A0A] text-xs focus:outline-none focus:ring-2 focus:ring-[#12BAB0] bg-white"
                />
              </div>
            )}
            <p className="text-[10px] text-gray-500">
              A unique invite link will be generated automatically so contestants can join your organization.
            </p>
          </div>
        )}

        {/* Optional Invite Code for Contestants */}
        {formData.userType === "contestant" && (
          <div className="mt-3">
            <label className="text-gray-500 text-[12px] md:text-sm font-medium">
              Organization Invite Code (Optional)
            </label>
            <input
              name="inviteCode"
              type="text"
              placeholder="e.g. STANFORD-8A3F (Leave blank if none)"
              value={formData.inviteCode}
              onChange={handleChange}
              className="mt-1 w-full border border-gray-300 rounded-full px-4 py-2 text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#12BAB0] uppercase font-mono text-xs"
            />
          </div>
        )}

        {/* Password */}
        <label className="text-gray-500 text-[12px] md:text-sm font-medium mt-3">
          Password*
        </label>
        <div className="relative w-full mt-1">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            value={formData.password}
            onChange={handleChange}
            className="border border-gray-300 rounded-full px-4 py-2 w-full text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#12BAB0]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#12BAB0]"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Confirm Password */}
        <label className="text-gray-500 text-[12px] md:text-sm font-medium mt-3">
          Confirm Password*
        </label>
        <div className="relative w-full mt-1">
          <input
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className="border border-gray-300 rounded-full px-4 py-2 w-full text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#12BAB0]"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#12BAB0]"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Terms */}
        <div className="flex items-center gap-2 mt-4 text-[11px] md:text-xs text-gray-600">
          <input
            id="terms"
            name="agreeTerms"
            type="checkbox"
            checked={formData.agreeTerms}
            onChange={handleChange}
            className="rounded accent-[#12BAB0] cursor-pointer"
          />
          <label htmlFor="terms" className="cursor-pointer">
            I agree to the <span className="text-[#12BAB0] underline">Terms of Service</span> and{" "}
            <span className="text-[#12BAB0] underline">Privacy Policy</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 bg-black hover:bg-[#0ea89b] text-white py-2.5 font-semibold rounded-full w-full cursor-pointer transition-colors disabled:opacity-50 text-sm md:text-base"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        {/* Switch to Login */}
        <div className="mt-4 text-center text-xs md:text-sm text-gray-600">
          Already have an account?{" "}
          {setMode ? (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-[#12BAB0] font-semibold hover:underline cursor-pointer"
            >
              Login
            </button>
          ) : (
            <Link href="/" className="text-[#12BAB0] font-semibold hover:underline">
              Login
            </Link>
          )}
        </div>
      </form>
    </>
  );
};

export default SignupForm;
