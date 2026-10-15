"use client";
import React, { useState, useEffect } from "react";
import {
  Plus,
  Building2,
  School,
  GraduationCap,
  Link2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  CreditCard,
  Sparkles,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import Archived from "../components/Dashboard/Archived";
import Ongoing from "../components/Dashboard/Ongoing";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import {
  getContests,
  getMyOrganizations,
  joinOrganizationByCode,
  leaveOrganization,
  getSubscriptionStatus,
} from "../services/api";
import SubscriptionModal from "../components/SubscriptionModal";
import {
  isContestExpired,
  hasUserSubmittedContest,
} from "../services/contestUtils";

const Page = () => {
  const [activeTab, setActiveTab] = useState("Ongoing");
  const { user } = useAuth();
  const router = useRouter();
  const isHost = user?.userType === "host";
  const currentUserId = user?._id || user?.id;

  // Super Admin should be routed to their dedicated Admin Console, not the contestant dashboard
  useEffect(() => {
    if (user && user.userType === "superadmin") {
      router.replace("/dashboard/admin");
    }
  }, [user, router]);

  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Host subscription state
  const [subStatus, setSubStatus] = useState(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState("plans");

  // Contestant organization data
  const [orgData, setOrgData] = useState({ organizations: [], contests: [] });
  const [loadingOrgData, setLoadingOrgData] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinFeedback, setJoinFeedback] = useState(null);

  // Leave organization state
  const [orgToLeave, setOrgToLeave] = useState(null);
  const [leavingOrg, setLeavingOrg] = useState(false);


  const fetchContests = async () => {
    try {
      setLoading(true);
      const data = await getContests();
      if (data && Array.isArray(data.contests)) {
        setContests(data.contests);
      }
    } catch (err) {
      console.error("Failed to fetch contests in dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyOrgs = async () => {
    if (!currentUserId || isHost) return;
    try {
      setLoadingOrgData(true);
      const res = await getMyOrganizations();
      if (res) {
        setOrgData({
          organizations: res.organizations || [],
          contests: res.contests || [],
        });
      }
    } catch (err) {
      console.error("Failed to fetch contestant organizations:", err);
    } finally {
      setLoadingOrgData(false);
    }
  };

  const fetchSubStatus = async () => {
    if (!isHost) return;
    try {
      const res = await getSubscriptionStatus();
      if (res) setSubStatus(res);
    } catch (err) {
      console.error("Failed to fetch subscription status:", err);
    }
  };

  useEffect(() => {
    fetchContests();
    fetchMyOrgs();
    if (isHost) {
      fetchSubStatus();
    }
  }, [currentUserId, isHost]);


  const handleJoinOrganization = async (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;

    try {
      setJoining(true);
      setJoinFeedback(null);
      const res = await joinOrganizationByCode(inviteCodeInput.trim().toUpperCase());
      setJoinFeedback({
        type: "success",
        text: res.message || "Successfully joined organization!",
      });
      setInviteCodeInput("");
      await fetchMyOrgs();
      await fetchContests();
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinFeedback(null);
      }, 1800);
    } catch (err) {
      setJoinFeedback({
        type: "error",
        text: err.message || "Failed to join organization. Please check the code.",
      });
    } finally {
      setJoining(false);
    }
  };

  const handleConfirmLeaveOrg = async () => {
    if (!orgToLeave) return;
    try {
      setLeavingOrg(true);
      await leaveOrganization(orgToLeave._id);
      await fetchMyOrgs();
      await fetchContests();
      setOrgToLeave(null);
    } catch (err) {
      console.error("Failed to leave organization:", err);
      alert(err.message || "Failed to leave organization");
    } finally {
      setLeavingOrg(false);
    }
  };

  // Compute ongoing vs archived contests
  const ongoingContests = contests.filter((c) => {
    if (c.status === "archived") return false;
    if (isContestExpired(c.activeTill)) return false;

    // If contestant already completed this contest, move it out of ongoing!
    if (!isHost && hasUserSubmittedContest(c, currentUserId)) {
      return false;
    }

    return true;
  });

  // Filter ongoing contests from joined organizations
  const joinedOrgIds = new Set(
    (orgData.organizations || []).map((o) => (o?._id || o).toString())
  );
  const myOrgOngoingContests = ongoingContests.filter((c) => {
    const hostId = (c.host?._id || c.host)?.toString();
    return Boolean(hostId && joinedOrgIds.has(hostId));
  });

  const archivedContests = contests.filter((c) => {
    const userSubmitted = hasUserSubmittedContest(c, currentUserId);
    const expired = isContestExpired(c.activeTill);
    const isArchivedStatus = c.status === "archived";
    return userSubmitted || expired || isArchivedStatus;
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-black">
            Contests
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Participate in live competitions, challenge your skills, and represent your institute.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isHost && (
            <button
              onClick={() => setShowJoinModal(true)}
              className="bg-[#010B28] hover:bg-black transition-colors cursor-pointer text-white px-4 py-2.5 rounded-full text-xs md:text-sm font-semibold flex items-center gap-2 shadow-xs"
            >
              <Link2 className="w-4 h-4 text-[#12BAB0]" />
              Join via Invite Code
            </button>
          )}

          {isHost && (
            <Link href="/dashboard/create">
              <button className="bg-[#12BAB0] transition-colors cursor-pointer text-white px-4 py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2 w-full sm:w-auto hover:bg-opacity-90 shadow-xs">
                <Plus className="w-4 h-4" />
                Create New Contest
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Host Selected Plan Status Card */}
      {isHost && subStatus && (
        <div className="mt-5 p-5 md:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1528] to-slate-900 text-white border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Your Current Host Plan
                </span>
                {subStatus.isExpired ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wide flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Expired
                  </span>
                ) : subStatus.isActive ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wide flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active Plan
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-[#12BAB0] border border-[#12BAB0]/40 uppercase tracking-wide">
                    Free Trial (3 Contests Limit)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <h2 className="text-xl md:text-2xl font-black text-white">
                  {subStatus.subscription?.plan === "yearly"
                    ? "Host Pro Annual Plan ($179/yr)"
                    : subStatus.subscription?.plan === "monthly"
                    ? "Host Pro Monthly Plan ($19/mo)"
                    : "Free Trial Plan (3 Free Contests)"}
                </h2>
              </div>

              <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-xl">
                {subStatus.isExpired
                  ? "Your previous subscription plan expired. Renew your plan to create and launch contests."
                  : subStatus.isActive
                  ? `Unlimited contest creation enabled until ${
                      subStatus.subscription?.expiresAt
                        ? new Date(subStatus.subscription.expiresAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "end of billing cycle"
                    } (${subStatus.daysRemaining} days remaining).`
                  : `You have created ${subStatus.contestCount || 0} of ${subStatus.freeLimit || 3} free trial contests (${subStatus.trialRemaining} remaining).`}
              </p>

              {subStatus.isTrial && (
                <div className="mt-3 w-full max-w-md">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Free Trial Usage</span>
                    <span className="font-semibold text-white">
                      {subStatus.contestCount || 0} / {subStatus.freeLimit || 3} used
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#12BAB0] h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, ((subStatus.contestCount || 0) / (subStatus.freeLimit || 3)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setModalInitialStep("plans");
                  setShowSubModal(true);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all cursor-pointer ${
                  subStatus.isExpired
                    ? "bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 hover:from-amber-400 hover:to-rose-400 shadow-amber-500/20"
                    : subStatus.isActive
                    ? "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/20"
                }`}
              >
                {subStatus.isExpired ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Renew Plan Now</span>
                  </>
                ) : subStatus.isActive ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Change / Extend Plan</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Upgrade to Pro</span>
                  </>
                )}
              </button>

              {subStatus.isActive && (
                <button
                  type="button"
                  onClick={() => {
                    setModalInitialStep("cancelConfirm");
                    setShowSubModal(true);
                  }}
                  className="px-3.5 py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Plan</span>
                </button>
              )}

              <Link href="/dashboard/host?tab=billing">
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Manage Billing &rarr;
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}


      {/* Contestant Enrolled Organizations Strip */}
      {!isHost && orgData.organizations.length > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-teal-50/70 via-blue-50/50 to-indigo-50/60 border border-teal-100 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-[#12BAB0]" />
              My Organizations:
            </span>
            {orgData.organizations.map((org) => (
              <span
                key={org._id}
                className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-bold bg-white text-gray-800 border border-teal-200/80 shadow-2xs group hover:border-teal-300 transition-all"
              >
                {org.organizationType === "school" ? (
                  <School className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>{org.organizationName || "Institute"}</span>
                <span className="text-[10px] uppercase text-[#12BAB0] font-black">
                  {org.organizationType}
                </span>
                <button
                  type="button"
                  onClick={() => setOrgToLeave(org)}
                  title={`Leave ${org.organizationName || "Institute"}`}
                  className="p-0.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          <button
            onClick={() => setShowJoinModal(true)}
            className="text-xs font-bold text-[#12BAB0] hover:text-[#0ea89b] transition-colors flex items-center gap-1 cursor-pointer"
          >
            + Join another
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-4 border-b border-gray-200/60 pb-1 overflow-x-auto scrollbar-none">
        <button
          className={`relative px-4 py-2 cursor-pointer font-bold text-sm md:text-base transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "Ongoing"
              ? "text-black"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("Ongoing")}
        >
          All Ongoing
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "Ongoing"
                ? "bg-[#010B28] text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {ongoingContests.length}
          </span>
          {activeTab === "Ongoing" && (
            <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-black"></div>
          )}
        </button>

        {!isHost && orgData.organizations.length > 0 && (
          <button
            className={`relative px-4 py-2 cursor-pointer font-bold text-sm md:text-base transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "MyInstitute"
                ? "text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("MyInstitute")}
          >
            <Building2 className="w-4 h-4 text-[#12BAB0]" />
            My Institute Contests
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "MyInstitute"
                  ? "bg-[#12BAB0] text-white"
                  : "bg-teal-50 text-teal-800 border border-teal-200"
              }`}
            >
              {myOrgOngoingContests.length}
            </span>
            {activeTab === "MyInstitute" && (
              <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-[#12BAB0]"></div>
            )}
          </button>
        )}

        <button
          className={`relative px-4 py-2 cursor-pointer font-bold text-sm md:text-base transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "Archived"
              ? "text-black"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("Archived")}
        >
          Archived
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "Archived"
                ? "bg-[#010B28] text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {archivedContests.length}
          </span>
          {activeTab === "Archived" && (
            <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-black"></div>
          )}
        </button>
      </div>

      <div className="mt-6">
        {activeTab === "Ongoing" && (
          <Ongoing
            contests={ongoingContests}
            allContestsCount={contests.length}
            onRefresh={fetchContests}
            onSwitchToArchived={() => setActiveTab("Archived")}
            onOpenJoinModal={() => setShowJoinModal(true)}
          />
        )}
        {activeTab === "MyInstitute" && (
          <Ongoing
            contests={myOrgOngoingContests}
            allContestsCount={contests.length}
            onRefresh={fetchContests}
            onSwitchToArchived={() => setActiveTab("Archived")}
            onOpenJoinModal={() => setShowJoinModal(true)}
          />
        )}
        {activeTab === "Archived" && (
          <Archived
            contests={archivedContests}
            onRefresh={fetchContests}
          />
        )}
      </div>

      {/* Modal: Join Organization via Invite Code */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#12BAB0] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Join Organization</h3>
                  <p className="text-[11px] text-gray-400">Enter your host&apos;s invite code</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinFeedback(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinOrganization} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Invite Code (e.g. STANFORD-XXXX or ORG-XXXX)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter organization invite code"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 text-sm font-mono font-bold uppercase bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-800 tracking-wider"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Ask your college, school, or institute host for their invite link or code.
                </p>
              </div>

              {joinFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    joinFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {joinFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{joinFeedback.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinFeedback(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining || !inviteCodeInput.trim()}
                  className="px-5 py-2 text-xs font-bold bg-[#12BAB0] hover:bg-[#0ea89b] text-white rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {joining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Join Organization</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Leave Organization */}
      {orgToLeave && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-gray-900 text-lg mb-1.5">
              Leave {orgToLeave.organizationName || "Institute"}?
            </h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to leave this organization? You will no longer receive exclusive contests or updates from this institution.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={leavingOrg}
                onClick={() => setOrgToLeave(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={leavingOrg}
                onClick={handleConfirmLeaveOrg}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {leavingOrg && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{leavingOrg ? "Leaving..." : "Leave Institute"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal for Host */}
      <SubscriptionModal
        isOpen={showSubModal}
        onClose={() => setShowSubModal(false)}
        onSuccess={() => {
          fetchSubStatus();
          setShowSubModal(false);
        }}
        subStatus={subStatus}
        initialStep={modalInitialStep}
      />
    </>
  );
};

export default Page;