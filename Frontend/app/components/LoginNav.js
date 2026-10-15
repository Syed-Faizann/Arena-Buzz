import React from "react";
import tech from "../assets/tech.png";
import Image from "next/image";

const LoginNav = ({ setOpen }) => {
  return (
    <nav className="px-6 py-6 sm:px-10 sm:py-8 lg:px-16 lg:py-10 flex justify-between items-center">
      <div className="w-fit mt-6 md:mt-0">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white rotate-[-8deg] origin-left leading-none">
          Fantasy
        </h2>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white rotate-[3deg] origin-left leading-none -mt-2 sm:-mt-3 lg:-mt-4 ml-6 sm:ml-10">
          Buzz
        </h1>

        <div className="flex items-center mt-1 ml-6 sm:ml-10">
          <div className="relative w-20 sm:w-24 lg:w-32 h-8 sm:h-9 lg:h-10">
            <Image src={tech} alt="Tech Icon" fill className="object-contain" />
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpen(true)}
        className="border-[#12BAB0] border-2 text-sm sm:text-base lg:text-lg py-2 sm:py-3 px-6 sm:px-8 lg:px-10 font-bold rounded-full cursor-pointer hover:bg-[#12BAB0] hover:text-white transition"
      >
        Login
      </button>
    </nav>
  );
};

export default LoginNav;
