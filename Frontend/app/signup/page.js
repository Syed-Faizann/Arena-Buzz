"use client";
import React from "react";
import LoginNav from "../components/LoginNav";
import SignupForm from "../components/Credentials/SignupForm";

export default function SignupPage() {
  return (
    <div className="bg-[#010B28] min-h-screen w-full flex flex-col">
      <LoginNav setOpen={() => {}} />

      <main className="flex-1 flex justify-center items-center p-4 sm:p-6 md:p-10">
        <div className="bg-white w-full max-w-[600px] rounded-3xl p-8 md:p-10 relative shadow-2xl">
          <SignupForm />
        </div>
      </main>
    </div>
  );
}
