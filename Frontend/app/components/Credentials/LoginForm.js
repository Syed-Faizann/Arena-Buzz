"use client";
import { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

const LoginForm = ({ setMode }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await login({ email: email.trim(), password });
      if (res?.user?.userType === "superadmin") {
        router.push("/dashboard/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-[#0A0A0A] text-3xl md:text-4xl font-bold mt-4 mb-2">
        Login
      </h1>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs md:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="mt-4 flex flex-col" onSubmit={handleSubmit}>
        <label className="text-gray-500 text-[12px] md:text-sm font-medium mt-2">
          Username or email*
        </label>
        <input
          className="border border-gray-300 rounded-full px-4 py-2 text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#12BAB0]"
          type="text"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
        />

        <label className="text-gray-500 text-[12px] md:text-sm font-medium mt-5">
          Password*
        </label>
        <div className="relative w-full">
          <input
            className="border border-gray-300 rounded-full px-4 py-2 w-full text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#12BAB0]"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 text-[#12BAB0] -translate-y-1/2"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="flex justify-between items-center mt-6 text-[10px] md:text-sm">
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
            <input type="checkbox" className="accent-[#12BAB0]" />
            Remember me
          </label>

          <button
            type="button"
            onClick={() => setMode("forget")}
            className="text-[10px] md:text-base text-[#12BAB0] hover:underline"
          >
            Forgot My Password
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 bg-black hover:bg-[#0ea89b] text-white py-2.5 font-medium rounded-full w-full cursor-pointer transition-colors disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="mt-4 text-center text-xs md:text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => setMode("signup")}
            className="text-[#12BAB0] font-semibold hover:underline cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </form>
    </>
  );
};

export default LoginForm;
