"use client";
import Image from "next/image";
import LoginNav from "./components/LoginNav";
import { useState } from "react";
import { X } from "lucide-react";
import Forget from "./components/Credentials/Forget";
import RequestSend from "./components/Credentials/RequestSend";
import ResetPassword from "./components/Credentials/ResetPassword";
import LoginForm from "./components/Credentials/LoginForm";
import SignupForm from "./components/Credentials/SignupForm";

export default function Home() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [resetEmail, setResetEmail] = useState("");

  const renderComponent = () => {
    switch (mode) {
      case "forget":
        return <Forget setMode={setMode} setResetEmail={setResetEmail} />;

      case "requestSend":
        return <RequestSend setMode={setMode} resetEmail={resetEmail} />;

      case "resetPassword":
        return <ResetPassword setMode={setMode} resetEmail={resetEmail} />;

      case "signup":
        return <SignupForm setMode={setMode} />;

      default:
        return <LoginForm setMode={setMode} />;
    }
  };

  return (
    <div className="bg-[#010B28] h-screen w-screen overflow-hidden">
      <LoginNav setOpen={setOpen} />

      <div className="h-120 flex justify-center items-center text-center flex-col gap-10 px-4">
        <h1 className="tracking-wide text-4xl md:text-5xl text-white">
          Welcome to Admin Portal of
          <span className="block mt-3 font-extrabold text-4xl md:text-5xl text-white">
            Arena Buzz
          </span>
        </h1>
        <button
          onClick={() => setOpen(true)}
          className="border-[#12BAB0] tracking-wide border-2 bg-[#12BAB0] py-3 px-12 w-80 max-w-full rounded-full font-bold text-2xl cursor-pointer hover:bg-[#0ea89b] transition-colors text-white"
        >
          Login
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/70 z-50 p-4">
          <div className="bg-white w-full max-w-[600px] rounded-3xl p-8 md:p-10 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => {
                setOpen(false);
                setMode("login");
              }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition"
            >
              <X size={24} />
            </button>

            {renderComponent()}
          </div>
        </div>
      )}
    </div>
  );
}
