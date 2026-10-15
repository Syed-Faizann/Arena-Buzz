"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  Medal,
  Crown,
  Building2,
  Users,
  Search,
  Sparkles,
  Flame,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Shield,
  Layers,
  GraduationCap,
  Award,
  ChevronRight,
  Loader2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getLeaderboardData } from "../../services/api";

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();

  const isHost = user?.userType === "host";
  const isSuperAdmin = user?.userType === "superadmin";
  const isContestant = user?.userType === "contestant";

  // State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScope, setSelectedScope] = useState("global"); // "global" | "institute"
  const [selectedInstituteId, setSelectedInstituteId] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Leaderboard Data
  const loadLeaderboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {};
      if (isHost) {
        params.scope = "institute";
      } else if (selectedScope === "institute" && selectedInstituteId) {
        params.scope = "institute";
        params.instituteId = selectedInstituteId;
      } else {
        params.scope = "global";
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await getLeaderboardData(params);
      if (res) {
        setData(res);
        if (res.scope === "institute" && res.institute?._id) {
          setSelectedInstituteId(res.institute._id);
        }
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      showToast("error", err.message || "Failed to load leaderboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadLeaderboard();
    }
  }, [authLoading, user, selectedScope, selectedInstituteId]);

  // Handle Search on Submit or Debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadLeaderboard();
  };

  // Leaderboard list
  const list = data?.leaderboard || [];

  // Top 3 Podium
  const topThree = useMemo(() => {
    if (!list || list.length === 0) return [];
    return list.slice(0, 3);
  }, [list]);

  // Current user's standing
  const myStanding = data?.myStanding;

  // Joined institutes summary (for contestants)
  const myInstitutes = data?.myInstitutes || [];

  // Helper for rank badge
  const renderRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-amber-200">
          <Crown className="w-5 h-5 text-amber-950" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 text-gray-800 flex items-center justify-center font-black text-sm shadow-sm ring-2 ring-gray-100">
          <Medal className="w-4 h-4 text-gray-700" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-amber-200 flex items-center justify-center font-black text-sm shadow-sm ring-2 ring-amber-700/30">
          <Medal className="w-4 h-4 text-amber-200" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center font-black text-xs">
        #{rank}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 w-full">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold border ${
              toast.type === "success"
                ? "bg-emerald-900/90 text-white border-emerald-500/40 backdrop-blur-md"
                : "bg-red-900/90 text-white border-red-500/40 backdrop-blur-md"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#010B28] via-[#08183A] to-[#0A2540] rounded-3xl p-6 md:p-8 text-white border border-gray-800 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-[#12BAB0]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40">
                <Trophy className="w-3.5 h-3.5" />
                {isHost ? "Organization Internal Roster" : "Platform Leaderboard"}
              </span>
              {data?.scope === "institute" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#12BAB0]/20 text-[#12BAB0] border border-[#12BAB0]/30">
                  <Building2 className="w-3 h-3" />
                  {data?.institute?.name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Layers className="w-3 h-3" />
                  All Organizations & Institutes
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              {isHost
                ? `${data?.institute?.name || "Your Organization"} Leaderboard`
                : "Competitor Rankings & Standings"}
            </h1>
            <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-xl">
              {isHost
                ? "Track which contestants in your institute are leading the scores, completing quizzes, and achieving top accuracy."
                : "Compare total points across contestants from all participating institutes and monitor in which institute you are leading."}
            </p>
          </div>

          {/* Quick Refresh */}
          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              onClick={() => loadLeaderboard(true)}
              disabled={refreshing}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-full text-xs font-bold transition-all border border-white/10 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
              <span>{refreshing ? "Updating..." : "Sync Live Ranks"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CONTESTANT ONLY: "WHERE AM I LEADING?" INSTITUTE CARDS */}
      {/* ============================================================== */}
      {isContestant && myInstitutes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Crown className="w-4 h-4" />
              </div>
              <h2 className="text-sm md:text-base font-extrabold text-gray-900">
                Your Standings by Enrolled Institute
              </h2>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Joined <strong>{myInstitutes.length}</strong> {myInstitutes.length === 1 ? "organization" : "organizations"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myInstitutes.map((inst) => {
              const isSelected = selectedScope === "institute" && selectedInstituteId === inst.instituteId;

              return (
                <div
                  key={inst.instituteId}
                  onClick={() => {
                    setSelectedScope("institute");
                    setSelectedInstituteId(inst.instituteId);
                  }}
                  className={`rounded-3xl p-5 border transition-all cursor-pointer relative overflow-hidden group hover:shadow-md ${
                    inst.isLeading
                      ? "bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 border-amber-300 ring-2 ring-amber-400/30"
                      : isSelected
                      ? "bg-white border-[#12BAB0] ring-2 ring-[#12BAB0]/20 shadow-sm"
                      : "bg-white border-gray-100 shadow-2xs hover:border-gray-200"
                  }`}
                >
                  {/* Top Badge: Leading vs Ranked */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-[#12BAB0]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs md:text-sm text-gray-900 truncate">
                          {inst.instituteName}
                        </h4>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                          {inst.organizationType}
                        </span>
                      </div>
                    </div>

                    {inst.isLeading ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 flex items-center gap-1 shadow-2xs animate-pulse">
                        <Crown className="w-3 h-3" />
                        <span>You&apos;re #1!</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-gray-100 text-gray-700">
                        #{inst.myRank}
                      </span>
                    )}
                  </div>

                  {/* Standing Details */}
                  <div className="pt-2 border-t border-gray-100 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Your Institute Rank:</span>
                      <span className="font-black text-gray-900">
                        Rank #{inst.myRank} of {inst.totalContestants}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-gray-600">
                      <span>Your Score Points:</span>
                      <span className="font-extrabold text-[#12BAB0]">{inst.myPoints} pts</span>
                    </div>

                    {/* Leading context */}
                    {inst.isLeading ? (
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-900 text-[11px] font-bold flex items-center gap-1.5 mt-1 border border-amber-200/60">
                        <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Currently leading this institute! Keep participating to maintain #1.</span>
                      </div>
                    ) : inst.leadingContestant ? (
                      <div className="p-2 rounded-xl bg-gray-50 text-gray-600 text-[11px] font-medium flex items-center justify-between gap-1 mt-1 border border-gray-100">
                        <span className="truncate">
                          Leader: <strong>{inst.leadingContestant.name}</strong> ({inst.leadingContestant.points} pts)
                        </span>
                        <span className="text-amber-600 font-bold shrink-0">
                          +{inst.pointsToLead} pts needed
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Filter Action Hint */}
                  <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-[#12BAB0] font-bold group-hover:underline">
                    <span>{isSelected ? "Currently viewing this institute" : "View institute leaderboard"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* HOST OR INSTITUTE HIGHLIGHT: LEADING CONTESTANT IN THIS INSTITUTE */}
      {/* ============================================================== */}
      {(isHost || selectedScope === "institute") && data?.topPerformer && (
        <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-teal-500/10 border border-amber-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              <Crown className="w-7 h-7 text-amber-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950">
                  👑 Institute Leader
                </span>
                <span className="text-xs text-gray-500 font-semibold">
                  #1 Top Contender in {data?.institute?.name}
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mt-1">
                {data.topPerformer.user.firstName} {data.topPerformer.user.lastName}
              </h3>
              <p className="text-xs text-gray-500 font-mono">{data.topPerformer.user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-amber-200/80 pt-3 md:pt-0 md:pl-6 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                Total Points
              </span>
              <span className="text-2xl font-black text-amber-600">
                {data.topPerformer.totalPoints}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                Contests
              </span>
              <span className="text-2xl font-black text-gray-900">
                {data.topPerformer.contestsPlayed}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                Accuracy
              </span>
              <span className="text-2xl font-black text-[#12BAB0]">
                {data.topPerformer.averageAccuracy}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FILTER & SCOPE TOOLBAR */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Scope Selector Tabs & Organization Filter */}
          {!isHost ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedScope("global");
                  setSelectedInstituteId("");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  selectedScope === "global"
                    ? "bg-[#010B28] text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Global Leaderboard (All Orgs)</span>
              </button>

              {/* Contestant's Joined Institutes Buttons */}
              {myInstitutes.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {myInstitutes.map((inst) => {
                    const isSelected =
                      selectedScope === "institute" && selectedInstituteId === inst.instituteId;
                    return (
                      <button
                        key={inst.instituteId}
                        type="button"
                        onClick={() => {
                          setSelectedScope("institute");
                          setSelectedInstituteId(inst.instituteId);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                          isSelected
                            ? "bg-[#12BAB0] text-white shadow-2xs"
                            : "bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200"
                        }`}
                      >
                        <Building2 className="w-3 h-3" />
                        <span>{inst.instituteName}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                            isSelected ? "bg-white/20 text-white" : "bg-white text-teal-700"
                          }`}
                        >
                          {inst.myPoints} pts
                        </span>
                        {inst.isLeading && <Crown className="w-3 h-3 text-amber-300 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Filter by Any Organization Dropdown */}
              {(data?.availableInstitutes || []).length > 0 && (
                <select
                  value={selectedScope === "institute" ? selectedInstituteId : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedScope("institute");
                      setSelectedInstituteId(e.target.value);
                    } else {
                      setSelectedScope("global");
                      setSelectedInstituteId("");
                    }
                  }}
                  className="bg-white border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2 font-bold cursor-pointer hover:border-[#12BAB0] transition-colors shadow-2xs"
                >
                  <option value="">Filter by Any Organization...</option>
                  {(data?.availableInstitutes || []).map((inst) => (
                    <option key={inst._id} value={inst._id}>
                      {inst.name} {inst.leader ? `(Leader: ${inst.leader.name} - ${inst.leader.points} pts)` : "(No points yet)"}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">
                Showing Enrolled Contestants in:
              </span>
              <span className="px-3 py-1 rounded-xl bg-teal-50 text-teal-800 font-bold text-xs border border-teal-200 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#12BAB0]" />
                {data?.institute?.name}
              </span>
            </div>
          )}

          {/* Right: Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contestant or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#12BAB0] focus:ring-1 focus:ring-[#12BAB0] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setTimeout(() => loadLeaderboard(), 50);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        {/* Status / Active Scope Pill */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>
            Displaying <strong>{list.length}</strong> {list.length === 1 ? "participant" : "participants"}{" "}
            {selectedScope === "institute" ? "within selected institute" : "across all registered institutes"}
          </span>

          {myStanding && (
            <span className="font-bold text-gray-700 flex items-center gap-1">
              Your Rank: <span className="text-[#12BAB0]">#{myStanding.rank}</span> ({myStanding.totalPoints} pts)
            </span>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TOP 3 PODIUM CARDS (IF >= 3 PARTICIPANTS) */}
      {/* ============================================================== */}
      {topThree.length >= 2 && !searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* #2 Silver */}
          {topThree[1] && (
            <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs flex flex-col items-center text-center relative overflow-hidden order-2 md:order-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800 flex items-center justify-center font-black text-base shadow-xs mb-3 ring-4 ring-gray-100">
                2
              </div>
              <h4 className="font-extrabold text-sm text-gray-900 leading-snug">
                {topThree[1].user.firstName} {topThree[1].user.lastName}
              </h4>

              {/* Organization and Score breakdown */}
              {selectedScope === "institute" ? (
                <div className="flex items-center justify-center gap-1 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200/60">
                    <Building2 className="w-2.5 h-2.5 text-[#12BAB0]" />
                    <span>{data?.institute?.name}:</span>
                    <span className="font-black text-[#12BAB0]">{topThree[1].totalPoints} pts</span>
                  </span>
                </div>
              ) : topThree[1].user.organizations && topThree[1].user.organizations.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-1 mt-2 max-w-full">
                  {topThree[1].user.organizations.map((org, oIdx) => (
                    <span
                      key={oIdx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200/60"
                      title={`${org.orgName || org.name}: ${org.points ?? 0} pts`}
                    >
                      <Building2 className="w-2.5 h-2.5 text-[#12BAB0]" />
                      <span className="truncate max-w-[90px]">{org.orgName || org.name}:</span>
                      <span className="font-black text-[#12BAB0]">{org.points ?? 0} pts</span>
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 pt-3 border-t border-gray-100 w-full flex justify-around text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Points</span>
                  <span className="font-black text-gray-900">{topThree[1].totalPoints}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Quizzes</span>
                  <span className="font-extrabold text-gray-700">{topThree[1].contestsPlayed}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Accuracy</span>
                  <span className="font-extrabold text-[#12BAB0]">{topThree[1].averageAccuracy}%</span>
                </div>
              </div>
            </div>
          )}

          {/* #1 Gold Champion */}
          {topThree[0] && (
            <div className="bg-gradient-to-b from-amber-500/10 via-white to-white rounded-3xl p-6 border-2 border-amber-300 shadow-md flex flex-col items-center text-center relative overflow-hidden order-1 md:order-2 md:-mt-3">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none"></div>

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-xl shadow-md mb-3 ring-4 ring-amber-200">
                <Crown className="w-8 h-8 text-amber-950" />
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 mb-1">
                🏆 Rank #1 Leader
              </span>

              <h4 className="font-black text-base md:text-lg text-gray-900 leading-snug">
                {topThree[0].user.firstName} {topThree[0].user.lastName}
              </h4>

              {/* Organization and Score breakdown */}
              {selectedScope === "institute" ? (
                <div className="flex items-center justify-center gap-1 mt-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                    <Building2 className="w-3 h-3 text-[#12BAB0]" />
                    <span>{data?.institute?.name}:</span>
                    <span className="font-black text-[#12BAB0]">{topThree[0].totalPoints} pts</span>
                  </span>
                </div>
              ) : topThree[0].user.organizations && topThree[0].user.organizations.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-1 mt-2 max-w-full">
                  {topThree[0].user.organizations.map((org, oIdx) => (
                    <span
                      key={oIdx}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200"
                      title={`${org.orgName || org.name}: ${org.points ?? 0} pts`}
                    >
                      <Building2 className="w-3 h-3 text-[#12BAB0]" />
                      <span>{org.orgName || org.name}:</span>
                      <span className="font-black text-[#12BAB0]">{org.points ?? 0} pts</span>
                      {org.isLeading && <Crown className="w-2.5 h-2.5 text-amber-500 fill-amber-500 ml-0.5" />}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 pt-3 border-t border-amber-200/60 w-full flex justify-around text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Total Points</span>
                  <span className="font-black text-xl text-amber-600">{topThree[0].totalPoints}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Contests</span>
                  <span className="font-black text-xl text-gray-900">{topThree[0].contestsPlayed}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Accuracy</span>
                  <span className="font-black text-xl text-[#12BAB0]">{topThree[0].averageAccuracy}%</span>
                </div>
              </div>
            </div>
          )}

          {/* #3 Bronze */}
          {topThree[2] && (
            <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs flex flex-col items-center text-center relative overflow-hidden order-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-200 flex items-center justify-center font-black text-base shadow-xs mb-3 ring-4 ring-amber-700/20">
                3
              </div>
              <h4 className="font-extrabold text-sm text-gray-900 leading-snug">
                {topThree[2].user.firstName} {topThree[2].user.lastName}
              </h4>

              {/* Organization and Score breakdown */}
              {selectedScope === "institute" ? (
                <div className="flex items-center justify-center gap-1 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200/60">
                    <Building2 className="w-2.5 h-2.5 text-[#12BAB0]" />
                    <span>{data?.institute?.name}:</span>
                    <span className="font-black text-[#12BAB0]">{topThree[2].totalPoints} pts</span>
                  </span>
                </div>
              ) : topThree[2].user.organizations && topThree[2].user.organizations.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-1 mt-2 max-w-full">
                  {topThree[2].user.organizations.map((org, oIdx) => (
                    <span
                      key={oIdx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200/60"
                      title={`${org.orgName || org.name}: ${org.points ?? 0} pts`}
                    >
                      <Building2 className="w-2.5 h-2.5 text-[#12BAB0]" />
                      <span className="truncate max-w-[90px]">{org.orgName || org.name}:</span>
                      <span className="font-black text-[#12BAB0]">{org.points ?? 0} pts</span>
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 pt-3 border-t border-gray-100 w-full flex justify-around text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Points</span>
                  <span className="font-black text-gray-900">{topThree[2].totalPoints}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Quizzes</span>
                  <span className="font-extrabold text-gray-700">{topThree[2].contestsPlayed}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Accuracy</span>
                  <span className="font-extrabold text-[#12BAB0]">{topThree[2].averageAccuracy}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MAIN LEADERBOARD TABLE */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#12BAB0]" />
            <p className="text-xs font-semibold text-gray-500">Loading live rankings...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No Participants Found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {searchQuery
                ? `No contestants matching "${searchQuery}". Try clearing your search.`
                : isHost
                ? "No contest submissions recorded yet for your organization. Contestants will appear here once they complete your quizzes."
                : "No contest scores recorded yet on the platform. Jump into contests to earn the #1 spot!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-6 text-center w-20">Rank</th>
                  <th className="py-4 px-6">Contestant</th>
                  <th className="py-4 px-6">Organization Scores Breakdown</th>
                  <th className="py-4 px-6 text-center">Contests</th>
                  <th className="py-4 px-6 text-center">Accuracy</th>
                  <th className="py-4 px-6 text-right">
                    {data?.scope === "institute" ? "Institute Points" : "Total Points"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {list.map((item) => {
                  const isYou = item.isCurrentUser;
                  const isGold = item.rank === 1;

                  return (
                    <tr
                      key={item.user._id}
                      className={`transition-colors ${
                        isYou
                          ? "bg-teal-50/50 hover:bg-teal-50/80 font-semibold"
                          : isGold
                          ? "bg-amber-50/30 hover:bg-amber-50/60"
                          : "hover:bg-gray-50/80"
                      }`}
                    >
                      {/* Rank Column */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center">
                          {renderRankBadge(item.rank)}
                        </div>
                      </td>

                      {/* Contestant User Details */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#010B28] to-[#12BAB0] text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs shrink-0">
                            {item.user.avatar ? (
                              <img
                                src={item.user.avatar}
                                alt={item.user.firstName}
                                className="w-full h-full object-cover rounded-2xl"
                              />
                            ) : (
                              item.user.firstName?.charAt(0) || "C"
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-sm text-gray-900">
                                {item.user.firstName} {item.user.lastName}
                              </span>
                              {isYou && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#12BAB0] text-white">
                                  You
                                </span>
                              )}
                              {item.isLeading && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-amber-950 flex items-center gap-0.5 shadow-2xs">
                                  <Crown className="w-2.5 h-2.5" />
                                  <span>Leader</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 font-mono block mt-0.5">
                              {item.user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Organization Scores Breakdown Column */}
                      <td className="py-4 px-6">
                        {data?.scope === "institute" ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-900 font-bold border border-teal-200/70">
                            <Building2 className="w-3.5 h-3.5 text-[#12BAB0]" />
                            <span>{data.institute?.name}</span>
                            <span className="text-[10px] font-extrabold bg-[#12BAB0] text-white px-2 py-0.5 rounded-full shadow-2xs">
                              {item.points ?? item.totalPoints} pts in this org
                            </span>
                          </div>
                        ) : item.user.organizations && item.user.organizations.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {item.user.organizations.map((org, oIdx) => (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => {
                                  if (org.orgId) {
                                    setSelectedScope("institute");
                                    setSelectedInstituteId(org.orgId);
                                  }
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer hover:shadow-xs hover:scale-102 ${
                                  org.isLeading
                                    ? "bg-amber-50/90 text-amber-950 border-amber-300 ring-1 ring-amber-400/50 hover:bg-amber-100"
                                    : "bg-gray-50 hover:bg-gray-100/80 text-gray-700 border-gray-200"
                                }`}
                                title={
                                  org.isLeading
                                    ? `Rank #1 Leader in ${org.orgName || org.name} (${org.points ?? 0} pts) - Click to view org rankings`
                                    : `Rank #${org.rankInOrg} in ${org.orgName || org.name} (${org.points ?? 0} pts) • Leader: ${org.leaderName || "None"} (${org.leaderPoints || 0} pts) - Click to view org rankings`
                                }
                              >
                                <Building2 className="w-3 h-3 text-[#12BAB0]" />
                                <span className="font-semibold text-gray-800">
                                  {org.orgName || org.name}:
                                </span>
                                <span
                                  className={`font-black ${
                                    org.points > 0 ? "text-[#12BAB0]" : "text-gray-400"
                                  }`}
                                >
                                  {org.points ?? 0} pts
                                </span>
                                {org.isLeading && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-400 text-amber-950 text-[9px] font-black uppercase">
                                    <Crown className="w-2.5 h-2.5" />
                                    <span>#1</span>
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No institute joined</span>
                        )}
                      </td>

                      {/* Contests Completed */}
                      <td className="py-4 px-6 text-center font-bold text-gray-700">
                        {item.contestsPlayed}
                      </td>

                      {/* Accuracy */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-1 font-bold text-[#12BAB0]">
                          <span>{item.averageAccuracy}%</span>
                        </div>
                      </td>

                      {/* Total Points */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1 text-sm font-black text-amber-600">
                          <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{item.totalPoints} pts</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
