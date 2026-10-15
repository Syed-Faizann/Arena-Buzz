"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  School,
  GraduationCap,
  Layers,
  Loader2,
  LogIn,
  UserPlus,
  Shield,
  LogOut,
  Copy,
  Check,
  Search,
  Flame,
  Zap,
  Calendar,
  Lock,
  FileText,
  X,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getOrganizationPublic,
  joinOrganizationByCode,
  leaveOrganization,
} from "../../services/api";
import {
  isContestExpired,
  hasUserSubmittedContest,
} from "../../services/contestUtils";

/**
 * Format time remaining or relative deadline
 */
function formatTimeRemaining(activeTill) {
  if (!activeTill) return "Active";
  if (typeof activeTill === "string") return activeTill;
  if (!activeTill.date) return "Active";

  try {
    const target = new Date(`${activeTill.date}T${activeTill.time || "23:59:59"}`);
    const now = new Date();
    const diff = target - now;

    if (isNaN(diff)) return activeTill.date;
    if (diff <= 0) return "Contest Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  } catch {
    return activeTill.date || "Active";
  }
}

export default function JoinOrganizationPage() {
  const params = useParams();
  const inviteCode = params?.inviteCode;
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const [joinedSuccess, setJoinedSuccess] = useState(false);

  // Tab & Search filters
  const [filterTab, setFilterTab] = useState("all"); // "all" | "ongoing" | "expired"
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchOrgDetails = async () => {
    if (!inviteCode) return;
    try {
      setLoading(true);
      setError("");
      const res = await getOrganizationPublic(inviteCode);
      if (res) {
        setOrgData(res);
        setJoinedSuccess(Boolean(res.organization?.isMember));
      }
    } catch (err) {
      setError(err.message || "Organization not found for this invite code");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgDetails();
  }, [inviteCode, isAuthenticated]);

  const handleCopyInviteCode = () => {
    if (!org?.inviteCode) return;
    navigator.clipboard.writeText(org.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleJoin = async () => {
    if (!isAuthenticated) {
      router.push(`/?invite=${inviteCode}`);
      return;
    }

    // Role-based restrictions
    if (user?.userType === "superadmin") {
      router.push("/dashboard/admin");
      return;
    }

    if (user?.userType === "host") {
      router.push("/dashboard/host");
      return;
    }

    try {
      setJoining(true);
      await joinOrganizationByCode(inviteCode);
      setJoinedSuccess(true);
      await fetchOrgDetails();
    } catch (err) {
      setError(err.message || "Failed to join organization");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!isAuthenticated || !inviteCode) return;
    try {
      setLeaving(true);
      setError("");
      await leaveOrganization(inviteCode);
      setJoinedSuccess(false);
      await fetchOrgDetails();
    } catch (err) {
      setError(err.message || "Failed to leave organization");
    } finally {
      setLeaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#010B28] flex flex-col items-center justify-center p-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#12BAB0]/20 border-t-[#12BAB0] animate-spin"></div>
          <Sparkles className="w-6 h-6 text-[#12BAB0] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-gray-300 text-sm font-semibold mt-4 tracking-wide">
          Loading organization details...
        </p>
      </div>
    );
  }

  if (error || !orgData) {
    return (
      <div className="min-h-screen bg-[#010B28] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4 shadow-xl">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
          Invalid Organization Invite
        </h1>
        <p className="text-gray-400 text-sm max-w-sm mb-6 leading-relaxed">
          {error || "The invite link you followed is invalid, expired, or does not exist."}
        </p>
        <Link href="/">
          <button className="bg-gradient-to-r from-[#12BAB0] to-[#0ea89b] hover:from-[#15cfc4] hover:to-[#12bab0] text-[#010B28] px-7 py-3 rounded-full text-sm font-extrabold shadow-lg shadow-[#12BAB0]/20 transition-all cursor-pointer">
            Return to Fantasy Buzz
          </button>
        </Link>
      </div>
    );
  }

  const org = orgData.organization;

  // Process all contests and distinguish Ongoing vs Expired
  const rawContests = orgData.contests || orgData.ongoingContests || [];
  const allContests = rawContests.map((c) => {
    const expired =
      c.isExpired !== undefined
        ? c.isExpired
        : isContestExpired(c.activeTill) || c.status === "archived";
    return {
      ...c,
      isExpired: Boolean(expired),
    };
  });

  const ongoingContests = allContests.filter((c) => !c.isExpired);
  const expiredContests = allContests.filter((c) => c.isExpired);

  // Filtered contests based on active tab and search query
  const displayedContests = allContests.filter((c) => {
    if (filterTab === "ongoing" && c.isExpired) return false;
    if (filterTab === "expired" && !c.isExpired) return false;
    if (searchQuery.trim()) {
      return c.name?.toLowerCase().includes(searchQuery.trim().toLowerCase());
    }
    return true;
  });

  const curUserId = user?._id || user?.id;

  return (
    <div className="min-h-screen bg-[#010B28] text-white relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-48 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <nav className="p-4 md:p-6 border-b border-white/10 backdrop-blur-md sticky top-0 z-40 bg-[#010B28]/85">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-2xl font-black text-white tracking-wider group-hover:text-gray-200 transition-colors">
                Fantasy
              </span>
              <span className="text-2xl font-black text-[#12BAB0] tracking-wider group-hover:scale-105 transition-transform">
                Buzz
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href={
                  user?.userType === "superadmin"
                    ? "/dashboard/admin"
                    : user?.userType === "host"
                    ? "/dashboard/host"
                    : "/dashboard"
                }
              >
                <button className="text-xs sm:text-sm font-bold text-gray-200 hover:text-white px-4 py-2 rounded-full border border-white/20 hover:border-[#12BAB0]/50 bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer shadow-sm">
                  {user?.userType === "superadmin" ? (
                    <>
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>Admin Console</span>
                    </>
                  ) : user?.userType === "host" ? (
                    <>
                      <Building2 className="w-4 h-4 text-[#12BAB0]" />
                      <span>Host Hub</span>
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4 text-[#12BAB0]" />
                      <span>My Dashboard</span>
                    </>
                  )}
                </button>
              </Link>
            ) : (
              <>
                <Link href={`/?invite=${inviteCode}`}>
                  <button className="text-xs sm:text-sm font-bold text-gray-200 hover:text-white px-4 py-2 rounded-full border border-white/20 hover:border-white/40 bg-white/5 transition-colors cursor-pointer">
                    Log In
                  </button>
                </Link>
                <Link href={`/?invite=${inviteCode}&mode=signup`}>
                  <button className="bg-gradient-to-r from-[#12BAB0] to-[#0ea89b] hover:from-[#15cfc4] hover:to-[#12bab0] text-[#010B28] text-xs sm:text-sm font-extrabold px-5 py-2 rounded-full transition-all shadow-md shadow-[#12BAB0]/20 cursor-pointer">
                    Sign Up
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 relative z-10">
        {/* Organization Showcase Hero Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0c1f44]/90 via-[#0a1835]/80 to-[#03091e]/95 rounded-3xl p-6 sm:p-8 md:p-10 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          {/* Subtle backdrop pattern */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#12BAB0]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            {/* Institute Avatar */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-[#0c1e3d] to-[#020b1f] border-2 border-[#12BAB0]/40 shadow-2xl flex items-center justify-center overflow-hidden relative">
                {org.avatar ? (
                  <img
                    src={org.avatar}
                    alt={org.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Building2 className="w-14 h-14 text-[#12BAB0]" />
                )}
              </div>
              {ongoingContests.length > 0 && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#010B28]"></span>
                </span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#12BAB0]/15 text-[#12BAB0] border border-[#12BAB0]/30 shadow-xs">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Official Organization
                </span>

                <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-gray-200 capitalize border border-white/10">
                  {org.type || "Institution"}
                </span>

                {org.inviteCode && (
                  <button
                    type="button"
                    onClick={handleCopyInviteCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono text-cyan-300 transition-all cursor-pointer shadow-xs group"
                    title="Click to copy invite code"
                  >
                    <span className="text-gray-400 group-hover:text-gray-300 font-sans">
                      Code:
                    </span>
                    <span className="font-bold tracking-wider">{org.inviteCode}</span>
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
                    )}
                    {copiedCode && (
                      <span className="text-[10px] text-emerald-400 font-sans font-bold">
                        Copied!
                      </span>
                    )}
                  </button>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {org.name}
              </h1>

              <p className="text-gray-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                {org.description ||
                  `Hosted by ${org.hostName}. Join to participate in all live & upcoming quizzes, tests, and competitions from this institution.`}
              </p>

              {/* Statistics Pill Grid */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2 text-xs">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/5 border border-white/10">
                  <Users className="w-4 h-4 text-[#12BAB0]" />
                  <span className="font-bold text-white">{org.totalMembers || 0}</span>
                  <span className="text-gray-400">Contestants</span>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span className="font-bold">{ongoingContests.length}</span>
                  <span>Ongoing Live</span>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold">{expiredContests.length}</span>
                  <span>Concluded</span>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/5 border border-white/10">
                  <Trophy className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-white">{allContests.length}</span>
                  <span className="text-gray-400">Total Contests</span>
                </div>
              </div>
            </div>

            {/* Action CTA Box */}
            <div className="shrink-0 flex flex-col items-center md:items-end gap-3 mt-4 md:mt-0">
              {user?.userType === "superadmin" ? (
                <Link href="/dashboard/admin">
                  <button className="bg-purple-600 hover:bg-purple-700 text-white px-7 py-3 rounded-2xl text-sm font-extrabold shadow-xl shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Admin Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              ) : user?.userType === "host" ? (
                <Link href="/dashboard/host">
                  <button className="bg-gradient-to-r from-[#12BAB0] to-[#0ea89b] hover:from-[#15cfc4] hover:to-[#12bab0] text-[#010B28] px-7 py-3 rounded-2xl text-sm font-extrabold shadow-xl shadow-[#12BAB0]/30 transition-all cursor-pointer flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>Go to Host Hub</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              ) : joinedSuccess ? (
                <div className="flex flex-col items-center md:items-end gap-2">
                  <div className="px-5 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>You are Enrolled!</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLeave}
                    disabled={leaving}
                    className="text-xs text-rose-300/80 hover:text-rose-200 hover:underline flex items-center gap-1.5 font-semibold transition-colors cursor-pointer py-1"
                    title="Leave this organization"
                  >
                    {leaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogOut className="w-3.5 h-3.5" />
                    )}
                    <span>{leaving ? "Leaving..." : "Leave Organization"}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="bg-gradient-to-r from-[#12BAB0] to-[#0ea89b] hover:from-[#15cfc4] hover:to-[#12bab0] text-[#010B28] px-8 py-3.5 rounded-2xl text-sm font-black shadow-xl shadow-[#12BAB0]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  {joining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-[#010B28]" />
                  )}
                  <span>{isAuthenticated ? "Join Organization" : "Log In & Join"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contests Header & Filter Section */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 tracking-tight">
                <Trophy className="w-7 h-7 text-[#12BAB0]" />
                Contests by {org.name}
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Participate in ongoing active challenges or browse past concluded contests.
              </p>
            </div>

            {/* Quick Status Tag */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                {ongoingContests.length} Ongoing
              </span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                {expiredContests.length} Expired
              </span>
            </div>
          </div>

          {/* Interactive Filters: Tabs + Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#061432]/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  filterTab === "all"
                    ? "bg-[#12BAB0] text-[#010B28] shadow-md shadow-[#12BAB0]/25 font-black"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>All Contests</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                    filterTab === "all"
                      ? "bg-black/20 text-[#010B28]"
                      : "bg-white/10 text-gray-300"
                  }`}
                >
                  {allContests.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab("ongoing")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  filterTab === "ongoing"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25 font-black"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span>Ongoing & Live</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                    filterTab === "ongoing"
                      ? "bg-black/20 text-white"
                      : "bg-white/10 text-gray-300"
                  }`}
                >
                  {ongoingContests.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab("expired")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  filterTab === "expired"
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/25 font-black"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Expired / Past</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                    filterTab === "expired"
                      ? "bg-black/20 text-white"
                      : "bg-white/10 text-gray-300"
                  }`}
                >
                  {expiredContests.length}
                </span>
              </button>
            </div>

            {/* Real-time Search Input */}
            <div className="relative min-w-[220px] sm:max-w-xs">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search contests by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#061432]/90 border border-white/10 rounded-2xl pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#12BAB0] focus:ring-1 focus:ring-[#12BAB0] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Contests Grid */}
          {displayedContests.length === 0 ? (
            <div className="py-16 bg-gradient-to-br from-white/[0.04] to-white/[0.01] rounded-3xl border border-white/10 text-center p-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                <Trophy className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {searchQuery
                  ? `No contests found matching "${searchQuery}"`
                  : filterTab === "ongoing"
                  ? "No Live Ongoing Contests"
                  : filterTab === "expired"
                  ? "No Expired Contests Found"
                  : "No Contests Available"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-[#12BAB0] hover:underline font-semibold"
                  >
                    Clear search filter to see all competitions
                  </button>
                ) : filterTab === "ongoing" ? (
                  `All recent contests from ${org.name} have concluded. Stay tuned for new quizzes coming soon!`
                ) : (
                  `Competitions published by ${org.name} will appear here.`
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {displayedContests.map((c) => {
                const isSubmitted = curUserId
                  ? hasUserSubmittedContest(c, curUserId)
                  : false;
                const timeRemaining = formatTimeRemaining(c.activeTill);

                if (!c.isExpired) {
                  // ============================================
                  // ONGOING / LIVE CONTEST CARD
                  // ============================================
                  return (
                    <div
                      key={c._id}
                      className="group relative overflow-hidden bg-gradient-to-br from-[#0c1f44]/80 via-[#071633]/70 to-[#020a1c]/90 hover:from-[#0e2552]/90 hover:to-[#041029]/95 border border-emerald-500/30 hover:border-emerald-400/60 rounded-3xl p-6 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.15)] flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Ongoing Badge & Question Count */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider shadow-xs">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                              </span>
                              Ongoing
                            </span>

                            {isSubmitted && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                                Submitted
                              </span>
                            )}
                          </div>

                          <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#12BAB0]" />
                            {c.questions?.length || 0} Questions
                          </span>
                        </div>

                        {/* Contest Name */}
                        <h3 className="font-black text-white text-xl group-hover:text-[#12BAB0] transition-colors leading-snug tracking-tight">
                          {c.name}
                        </h3>

                        {/* Timing / Deadline Pill */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300 mt-3 p-3 rounded-2xl bg-white/[0.04] border border-white/5">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#12BAB0]" />
                            <span>
                              Deadline:{" "}
                              <strong className="text-white">
                                {c.activeTill?.date || "No deadline"}{" "}
                                {c.activeTill?.time || ""}
                              </strong>
                            </span>
                          </div>

                          {timeRemaining && timeRemaining !== "Contest Expired" && (
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold ml-auto border border-emerald-500/30">
                              {timeRemaining}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          {c.submissions?.length || 0} Submissions
                        </span>

                        {isAuthenticated ? (
                          isSubmitted ? (
                            <Link href={`/dashboard/contest/${c._id}`}>
                              <button className="bg-cyan-600/80 hover:bg-cyan-500 text-white px-5 py-2 rounded-full text-xs font-extrabold shadow-lg shadow-cyan-600/20 transition-all cursor-pointer flex items-center gap-1.5">
                                <span>View Results</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          ) : (
                            <Link href={`/dashboard/contest/${c._id}`}>
                              <button className="bg-gradient-to-r from-[#12BAB0] to-[#0ea89b] hover:from-[#15cfc4] hover:to-[#12bab0] text-[#010B28] px-5 py-2 rounded-full text-xs font-black shadow-lg shadow-[#12BAB0]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5">
                                <span>Enter Contest</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          )
                        ) : (
                          <Link href={`/?invite=${inviteCode}`}>
                            <button className="bg-[#12BAB0]/20 hover:bg-[#12BAB0] text-[#12BAB0] hover:text-[#010B28] border border-[#12BAB0]/40 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5">
                              <LogIn className="w-3.5 h-3.5" />
                              <span>Log In to Compete</span>
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  // ============================================
                  // EXPIRED / CONCLUDED CONTEST CARD
                  // ============================================
                  return (
                    <div
                      key={c._id}
                      className="group relative overflow-hidden bg-gradient-to-br from-[#081226]/60 via-[#040a18]/70 to-[#02050e]/80 border border-white/10 hover:border-white/20 rounded-3xl p-6 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.2)] flex flex-col justify-between opacity-85 hover:opacity-100"
                    >
                      <div>
                        {/* Header: Expired Badge & Question Count */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/20 border border-slate-500/30 text-slate-300 text-[11px] font-black uppercase tracking-wider shadow-xs">
                              <Clock className="w-3 h-3 text-amber-400" />
                              Expired
                            </span>

                            {isSubmitted && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                                Completed
                              </span>
                            )}
                          </div>

                          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-gray-500" />
                            {c.questions?.length || 0} Questions
                          </span>
                        </div>

                        {/* Contest Name */}
                        <h3 className="font-bold text-gray-200 text-xl group-hover:text-white transition-colors leading-snug tracking-tight">
                          {c.name}
                        </h3>

                        {/* Timing / Closed Info */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            <span>
                              Ended:{" "}
                              <strong className="text-gray-300">
                                {c.activeTill?.date || "Past deadline"}{" "}
                                {c.activeTill?.time || ""}
                              </strong>
                            </span>
                          </div>

                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300/80 text-[10px] font-mono font-semibold ml-auto">
                            Closed
                          </span>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-gray-500" />
                          {c.submissions?.length || 0} Participants
                        </span>

                        {isAuthenticated ? (
                          isSubmitted ? (
                            <Link href={`/dashboard/contest/${c._id}`}>
                              <button className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5">
                                <span>View Your Score</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          ) : (
                            <Link href={`/dashboard/contest/${c._id}`}>
                              <button className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5">
                                <Lock className="w-3 h-3 text-gray-400" />
                                <span>Closed Overview</span>
                              </button>
                            </Link>
                          )
                        ) : (
                          <span className="text-xs text-gray-500 bg-white/5 border border-white/5 px-4 py-1.5 rounded-full inline-flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-gray-500" />
                            <span>Contest Concluded</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
