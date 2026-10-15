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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getOrganizationPublic,
  joinOrganizationByCode,
  leaveOrganization,
} from "../../services/api";

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

  const handleJoin = async () => {
    if (!isAuthenticated) {
      router.push(`/?invite=${inviteCode}`);
      return;
    }

    // Role-based restrictions: Super Admins go to Admin Console; Hosts go to Host Hub
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
      fetchOrgDetails();
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
        <Loader2 className="w-12 h-12 text-[#12BAB0] animate-spin mb-3" />
        <p className="text-gray-300 text-sm font-semibold">Loading organization details...</p>
      </div>
    );
  }

  if (error || !orgData) {
    return (
      <div className="min-h-screen bg-[#010B28] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite Link</h1>
        <p className="text-gray-400 text-sm max-w-sm mb-6">
          {error || "The invite link you followed is invalid or has expired."}
        </p>
        <Link href="/">
          <button className="bg-[#12BAB0] hover:bg-[#0ea89b] text-white px-6 py-2.5 rounded-full text-sm font-bold transition-colors cursor-pointer">
            Go to Fantasy Buzz
          </button>
        </Link>
      </div>
    );
  }

  const org = orgData.organization;
  const contests = orgData.ongoingContests || [];

  return (
    <div className="min-h-screen bg-[#010B28] text-white">
      {/* Top Navbar */}
      <nav className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-white tracking-wider">Fantasy</span>
            <span className="text-2xl font-black text-[#12BAB0]">Buzz</span>
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
              <button className="text-xs md:text-sm font-bold text-gray-200 hover:text-white px-4 py-2 rounded-full border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer">
                {user?.userType === "superadmin" ? (
                  <>
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>Admin Console</span>
                  </>
                ) : user?.userType === "host" ? (
                  <>
                    <Building2 className="w-3.5 h-3.5 text-[#12BAB0]" />
                    <span>Host Dashboard</span>
                  </>
                ) : (
                  <span>My Dashboard</span>
                )}
              </button>
            </Link>
          ) : (
            <>
              <Link href={`/?invite=${inviteCode}`}>
                <button className="text-xs md:text-sm font-bold text-gray-200 hover:text-white px-4 py-2 rounded-full border border-white/20 transition-colors">
                  Log In
                </button>
              </Link>
              <Link href={`/?invite=${inviteCode}&mode=signup`}>
                <button className="bg-[#12BAB0] hover:bg-[#0ea89b] text-white text-xs md:text-sm font-bold px-5 py-2 rounded-full transition-colors shadow-sm">
                  Sign Up
                </button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        {/* Organization Hero Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#08183A] to-[#0D2A54] rounded-3xl p-6 md:p-10 border border-white/15 shadow-2xl text-center md:text-left flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-gradient-to-br from-[#12BAB0] to-[#010B28] border-2 border-white/20 shadow-xl flex items-center justify-center shrink-0">
            {org.avatar ? (
              <img src={org.avatar} alt={org.name} className="w-full h-full rounded-3xl object-cover" />
            ) : (
              <Building2 className="w-12 h-12 text-white" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
              <span className="text-xs font-black uppercase px-3 py-1 rounded-full bg-[#12BAB0]/20 text-[#12BAB0] border border-[#12BAB0]/40">
                Official Organization
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 capitalize">
                {org.type}
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              {org.name}
            </h1>

            <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-xl">
              {org.description || `Hosted by ${org.hostName}. Join to participate in all live & upcoming quizzes and competitions from this institution.`}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5 font-semibold text-gray-300">
                <Users className="w-4 h-4 text-[#12BAB0]" />
                {org.totalMembers} Enrolled Contestants
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-gray-300">
                <Trophy className="w-4 h-4 text-amber-400" />
                {contests.length} Ongoing Contests
              </span>
            </div>
          </div>

          {/* Join / Action Pill */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            {user?.userType === "superadmin" ? (
              <Link href="/dashboard/admin">
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-7 py-3 rounded-full text-sm font-extrabold shadow-xl shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Go to Admin Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            ) : user?.userType === "host" ? (
              <Link href="/dashboard/host">
                <button className="bg-[#12BAB0] hover:bg-[#0ea89b] text-white px-7 py-3 rounded-full text-sm font-extrabold shadow-xl shadow-[#12BAB0]/30 transition-all cursor-pointer flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>Go to Host Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            ) : joinedSuccess ? (
              <div className="flex flex-col items-center gap-2">
                <div className="px-5 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/10">
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
                className="bg-[#12BAB0] hover:bg-[#0ea89b] text-white px-7 py-3 rounded-full text-sm font-extrabold shadow-xl shadow-[#12BAB0]/30 transition-all cursor-pointer flex items-center gap-2"
              >
                {joining && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isAuthenticated ? "Join Organization" : "Log In & Join"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Ongoing Contests Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-[#12BAB0]" />
                Ongoing Contests by {org.name}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Active competitions ready for your submission.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-500/20 text-[#12BAB0] border border-teal-500/30">
              {contests.length} Active
            </span>
          </div>

          {contests.length === 0 ? (
            <div className="py-12 bg-white/5 rounded-3xl border border-white/10 text-center">
              <Trophy className="w-12 h-12 mx-auto text-gray-500 mb-2" />
              <p className="text-sm font-semibold text-gray-300">No active ongoing contests right now.</p>
              <p className="text-xs text-gray-400 mt-1">
                Stay tuned! Once {org.name} launches a new contest, it will appear here immediately.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contests.map((c) => (
                <div
                  key={c._id}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-5 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Ongoing
                      </span>
                      <span className="text-xs text-gray-400">
                        {c.questions?.length || 0} Questions
                      </span>
                    </div>

                    <h3 className="font-extrabold text-white text-lg group-hover:text-[#12BAB0] transition-colors">
                      {c.name}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                      <Clock className="w-3.5 h-3.5 text-[#12BAB0]" />
                      <span>
                        Deadline: {c.activeTill?.date || "No deadline"} {c.activeTill?.time || ""}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">
                      {c.submissions?.length || 0} Submissions
                    </span>

                    {isAuthenticated ? (
                      <Link href={`/dashboard/contest/${c._id}`}>
                        <button className="bg-[#12BAB0] hover:bg-[#0ea89b] text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer">
                          Enter Contest
                        </button>
                      </Link>
                    ) : (
                      <Link href={`/?invite=${inviteCode}`}>
                        <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer">
                          Join to Enter
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
