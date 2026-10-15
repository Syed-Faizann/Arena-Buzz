import Link from "next/link";
import { X } from "lucide-react";
import Image from "next/image";
import tech from "../assets/tech.png";
import { Fragment, useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usePathname } from "next/navigation";
import { getUserNotifications } from "../services/api";

export default function SidebarHeader({ isOpen, onClose }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isSuperAdmin = user?.userType === "superadmin";
  const isHost = user?.userType === "host";
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    getUserNotifications("unread")
      .then((res) => {
        if (isMounted && res && typeof res.unreadCount === "number") {
          setUnreadNotifs(res.unreadCount);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [user, pathname]);

  const navItems = [
    { label: "Contests", href: "/dashboard" },
    ...(user?.userType === "host"
      ? [
          { label: "Host Organization Hub", href: "/dashboard/host", badge: "Host" },
          {
            label: "Plan & Billing",
            href: "/dashboard/host?tab=billing",
            badge:
              user?.subscription?.plan === "yearly"
                ? "Annual Pro"
                : user?.subscription?.plan === "monthly"
                ? "Monthly Pro"
                : "Free Trial",
          },
        ]
      : []),
    ...(isSuperAdmin
      ? [{ label: "User Management (Admin)", href: "/dashboard/admin", badge: "Super Admin" }]
      : [{ label: "User Management", href: "#" }]),
    { label: "Marketing Campaigns", href: "#" },
    {
      label: isHost ? "Institute Leaderboard" : "Leaderboard",
      href: "/dashboard/leaderboard",
      badge: isHost ? "Institute" : undefined,
    },
    { label: "Analytics", href: "#" },
    {
      label: "Notifications",
      href: "/dashboard/notifications",
      count: unreadNotifs,
    },
    {
      label: "Feedback & Support",
      href: isSuperAdmin ? "/dashboard/admin?tab=support" : "/dashboard/support",
    },
  ];

  return (
    <>
      <aside
        className={`
        fixed lg:static top-0 left-0 z-50
        w-72 h-screen bg-[#010B28] border-r border-[#010B28] 
        flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        shadow-2xl lg:shadow-none
      `}
      >
        <div className="p-6 flex-1 flex flex-col relative h-full overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 lg:hidden text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <Link href={isSuperAdmin ? "/dashboard/admin" : "/dashboard"}>
            <div className="w-fit mt-5 flex-shrink-0">
              <h2 className="text-4xl font-extrabold text-white rotate-[-8deg] origin-left leading-none">
                Fantasy
              </h2>
              <h1 className="text-5xl font-extrabold text-white rotate-[3deg] origin-left leading-none -mt-4 ml-16">
                Buzz
              </h1>
              <div className="flex items-center gap-3 mt-1 ml-15">
                <div className="relative w-30 h-10">
                  <Image
                    src={tech}
                    alt="Tech Icon"
                    layout="fill"
                    objectFit="contain"
                  />
                </div>
              </div>
            </div>
          </Link>

          {/* Super Admin Quick Access Pill */}
          {isSuperAdmin && (
            <div className="mt-8 mb-2 p-3 bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-teal-900/40 border border-purple-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-xs">
                  👑
                </div>
                <div>
                  <div className="text-[11px] font-extrabold text-white uppercase tracking-wider">
                    Super Admin
                  </div>
                  <div className="text-[10px] text-gray-300">Master Access</div>
                </div>
              </div>
              <Link
                href="/dashboard/admin"
                className="text-[10px] bg-[#12BAB0] hover:bg-[#0ea89b] text-white px-2 py-1 rounded-lg font-bold transition-colors"
              >
                Panel
              </Link>
            </div>
          )}

          {/* Host Organization Quick Pill */}
          {user?.userType === "host" && (
            <div className={`p-3 bg-gradient-to-r from-teal-900/40 via-cyan-900/40 to-blue-900/40 border border-[#12BAB0]/30 rounded-2xl flex items-center justify-between ${isSuperAdmin ? "mb-2" : "mt-8 mb-2"}`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-teal-400/20 text-teal-300 flex items-center justify-center font-bold text-xs shrink-0">
                  🏛️
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold text-white uppercase tracking-wider truncate">
                    {user?.organizationName || "Host Organization"}
                  </div>
                  <div className="text-[10px] text-teal-300/90 truncate font-semibold">
                    {user?.subscription?.plan === "yearly"
                      ? "👑 Annual Pro Plan"
                      : user?.subscription?.plan === "monthly"
                      ? "⚡ Monthly Pro Plan"
                      : "🎁 Free Trial (3 Contests)"}
                  </div>
                </div>
              </div>
              <Link
                href="/dashboard/host"
                className="text-[10px] bg-[#12BAB0] hover:bg-[#0ea89b] text-white px-2.5 py-1 rounded-lg font-bold transition-colors shrink-0 ml-1"
              >
                Hub
              </Link>
            </div>
          )}

          <div className="border border-gray-700/80 rounded-full mt-4 flex-shrink-0"></div>

          <nav className="flex-1 overflow-y-auto mt-6">
            <div className="flex flex-col gap-1">
              {navItems.map((item, index) => {
                const searchStr = typeof window !== "undefined" ? window.location.search : "";
                const [baseHref, queryHref] = item.href.split("?");
                const isActive =
                  item.href !== "#" &&
                  (queryHref
                    ? pathname === baseHref && searchStr.includes(queryHref)
                    : pathname === baseHref && (!searchStr || !searchStr.includes("tab=")));
                return (
                  <Fragment key={item.label}>
                    <Link
                      href={item.href}
                      className={`block px-3 py-2.5 transition-colors duration-200 text-sm flex items-center justify-between ${
                        isActive
                          ? "text-[#12BAB0] font-bold"
                          : "text-[#9AA1B0] hover:text-[#12BAB0]"
                      }`}
                      onClick={onClose}
                    >
                      <span>{item.label}</span>
                      <div className="flex items-center gap-1.5">
                        {item.count !== undefined && item.count > 0 && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            {item.count} new
                          </span>
                        )}
                        {item.badge && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                    {item.label === "Analytics" && index < navItems.length - 1 && (
                      <div className="border border-gray-700/60 rounded-full my-3"></div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </nav>
        </div>
      </aside>

      <style jsx>{`
        nav::-webkit-scrollbar {
          width: 3px;
        }

        nav::-webkit-scrollbar-thumb {
          background: #12bab0;
          border-radius: 10px;
        }

        .minimal-scrollbar {
          padding-right: 0;
        }

        .scrollbar-right {
          scrollbar-width: thin;
          scrollbar-color: #12bab0 transparent;
          padding-right: 0;
          margin-right: -20px;
        }
      `}</style>
    </>
  );
}
