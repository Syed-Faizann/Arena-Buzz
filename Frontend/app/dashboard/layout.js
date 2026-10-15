"use client";
import React from "react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import SidebarHeader from "../components/DashboardNav";
import AccountDropdown from "../components/Dashboard/AccountDropdown";
import { Menu } from "lucide-react";
import Link from "next/link";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [sidebarOpen]);

  // ✅ AUTO CLOSE SIDEBAR ON ROUTE CHANGE
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <SidebarHeader
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="relative flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-50 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 bg-[#010B28] rounded-lg hover:bg-gray-300 transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-400" />
            </button>

            <div className="lg:hidden"></div>

            <div className="flex items-center gap-4 ml-auto">
              <AccountDropdown />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
