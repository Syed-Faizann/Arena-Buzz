"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Trophy,
  Copy,
  Check,
  Plus,
  Share2,
  ExternalLink,
  Search,
  Sparkles,
  Calendar,
  Clock,
  Mail,
  GraduationCap,
  School,
  Layers,
  Edit3,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Flame,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  X,
  Trash2,
  Save,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getHostDashboardData,
  createSubscriptionCheckout,
  verifyStripeSession,
  cancelSubscription,
  updateContest,
  deleteContest,
} from "../../services/api";
import DeadlinePicker from "../../components/DeadlinePicker";
import SubscriptionModal from "../../components/SubscriptionModal";

export default function HostDashboardPage() {
  const { user, loading: authLoading, updateProfile } = useAuth();
  const router = useRouter();

  // Strictly restricted to Host accounts only (Super Admin and Contestants are restricted)
  const isHost = user?.userType === "host";

  // Auto-redirect unauthorized users away from Host Portal immediately
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/");
      } else if (user.userType !== "host") {
        if (user.userType === "superadmin") {
          router.replace("/dashboard/admin");
        } else {
          router.replace("/dashboard");
        }
      }
    }
  }, [user, authLoading, router]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState("members"); // "members" | "contests" | "settings" | "billing"
  const [memberSearch, setMemberSearch] = useState("");

  // Subscription state
  const [subscribing, setSubscribing] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState("monthly");
  const [modalInitialStep, setModalInitialStep] = useState("plans");

  // Edit organization form
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgForm, setOrgForm] = useState({
    organizationName: "",
    organizationType: "college",
    organizationDescription: "",
  });
  const [customOrgType, setCustomOrgType] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [toast, setToast] = useState(null);

  // Edit Contest State (Name & Time)
  const [editingContest, setEditingContest] = useState(null);
  const [editContestForm, setEditContestForm] = useState({
    name: "",
    activeTill: { date: "", time: "" },
    startDate: "",
  });
  const [savingContest, setSavingContest] = useState(false);

  // Delete Contest State
  const [deletingContest, setDeletingContest] = useState(null);
  const [deletingContestLoading, setDeletingContestLoading] = useState(false);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const normalizeDateForInput = (dStr) => {
    if (!dStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
    const parts = String(dStr).split("/");
    if (parts.length === 3) {
      const year = parts[0].length === 2 ? `20${parts[0]}` : parts[0];
      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return dStr;
  };

  const handleOpenEditContest = (contest) => {
    setEditingContest(contest);
    setEditContestForm({
      name: contest.name || "",
      activeTill: {
        date: normalizeDateForInput(contest.activeTill?.date),
        time: contest.activeTill?.time || "",
      },
      startDate: contest.startDate
        ? new Date(contest.startDate).toISOString().split("T")[0]
        : "",
    });
  };

  const handleSaveEditContest = async (e) => {
    e.preventDefault();
    if (!editingContest) return;
    if (!editContestForm.name.trim()) {
      showToast("error", "Contest title/name cannot be empty.");
      return;
    }

    try {
      setSavingContest(true);
      const updates = {
        name: editContestForm.name.trim(),
        activeTill: editContestForm.activeTill,
      };
      if (editContestForm.startDate) {
        updates.startDate = new Date(editContestForm.startDate);
      }

      const res = await updateContest(editingContest._id, updates);
      const updated = res?.contest;

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          contests: (prev.contests || []).map((c) =>
            c._id === editingContest._id
              ? {
                  ...c,
                  ...(updated || updates),
                  name: editContestForm.name.trim(),
                  activeTill: editContestForm.activeTill,
                }
              : c
          ),
        };
      });

      showToast("success", "Contest name and time updated successfully!");
      setEditingContest(null);
    } catch (err) {
      console.error("Failed to update contest:", err);
      showToast("error", err.message || "Failed to update contest");
    } finally {
      setSavingContest(false);
    }
  };

  const handleConfirmDeleteContest = async () => {
    if (!deletingContest) return;
    try {
      setDeletingContestLoading(true);
      await deleteContest(deletingContest._id);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          contests: (prev.contests || []).filter((c) => c._id !== deletingContest._id),
          stats: {
            ...prev.stats,
            totalContests: Math.max(0, (prev.stats?.totalContests || 1) - 1),
            ongoingContests: Math.max(0, (prev.stats?.ongoingContests || 1) - 1),
          },
        };
      });
      showToast("success", `Contest "${deletingContest.name}" was deleted successfully.`);
      setDeletingContest(null);
    } catch (err) {
      console.error("Failed to delete contest:", err);
      showToast("error", err.message || "Failed to delete contest");
    } finally {
      setDeletingContestLoading(false);
    }
  };

  const loadHostData = async () => {
    try {
      setLoading(true);
      const res = await getHostDashboardData();
      if (res) {
        setData(res);
        const standardTypes = ["school", "college", "university", "institute", "company"];
        const loadedType = res.organization?.type || "college";
        const isStandard = standardTypes.includes(loadedType.toLowerCase());

        setOrgForm({
          organizationName: res.organization?.name || "",
          organizationType: isStandard ? loadedType.toLowerCase() : "other",
          organizationDescription: res.organization?.description || "",
        });
        if (!isStandard && loadedType) {
          setCustomOrgType(loadedType);
        }
      }
    } catch (err) {
      console.error("Failed to load host dashboard:", err);
      showToast("error", err.message || "Failed to load organization data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isHost) {
      loadHostData();
    }
  }, [authLoading, isHost]);

  // Handle Stripe redirect URL parameters
  const handleVerifyPayment = async (sessionId) => {
    try {
      setLoading(true);
      const res = await verifyStripeSession(sessionId);
      if (res && res.success) {
        showToast("success", res.message || "Payment verified! Plan is now active.");
        loadHostData();
        if (typeof window !== "undefined") {
          window.history.replaceState({}, document.title, window.location.pathname + "?tab=billing");
        }
      }
    } catch (err) {
      showToast("error", err.message || "Payment verification failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "billing") {
        setActiveTab("billing");
      }
      const payment = params.get("payment");
      const sessionId = params.get("session_id");
      if (payment === "success" && sessionId) {
        setActiveTab("billing");
        handleVerifyPayment(sessionId);
      }
    }
  }, []);

  const handleSubscribePlan = (planToBuy) => {
    setSelectedUpgradePlan(planToBuy || "monthly");
    setModalInitialStep("plans");
    setIsUpgradeModalOpen(true);
  };

  const handleOpenCancelSubscription = () => {
    setSelectedUpgradePlan(data?.subscription?.subscription?.plan || "monthly");
    setModalInitialStep("cancelConfirm");
    setIsUpgradeModalOpen(true);
  };


  // Invite link computation
  const inviteCode = data?.organization?.inviteCode || user?.inviteCode || "";
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${inviteCode}`
      : `/join/${inviteCode}`;

  const copyToClipboard = (text, isCode = false) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isCode) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
    showToast("success", isCode ? "Invite Code copied!" : "Organization invite link copied to clipboard!");
  };

  const handleSaveOrganization = async (e) => {
    e.preventDefault();
    if (!orgForm.organizationName.trim()) {
      showToast("error", "Organization name cannot be empty");
      return;
    }

    try {
      setSavingOrg(true);
      const resolvedOrgType =
        orgForm.organizationType === "other" && customOrgType.trim()
          ? customOrgType.trim()
          : orgForm.organizationType;

      await updateProfile({
        organizationName: orgForm.organizationName.trim(),
        organizationType: resolvedOrgType,
        organizationDescription: orgForm.organizationDescription.trim(),
      });
      showToast("success", "Organization details updated!");
      setEditingOrg(false);
      loadHostData();
    } catch (err) {
      showToast("error", err.message || "Failed to update organization");
    } finally {
      setSavingOrg(false);
    }
  };

  // Filter joined contestants
  const filteredMembers = (data?.members || []).filter((m) => {
    const q = memberSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  });

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#12BAB0]" />
        <p className="text-gray-500 font-medium text-sm">Loading host portal...</p>
      </div>
    );
  }

  if (!user || !isHost) {
    const isSuper = user?.userType === "superadmin";
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Host Portal Restricted</h2>
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          This portal is reserved strictly for <strong>Host Organizations</strong>.
          {isSuper
            ? " Super Admins cannot access the Host Portal and are restricted to the Admin Console."
            : " Contestants are not permitted in the Host Portal."}
        </p>
        <button
          onClick={() => router.push(isSuper ? "/dashboard/admin" : "/dashboard")}
          className="bg-[#010B28] hover:bg-[#12BAB0] text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors cursor-pointer"
        >
          {isSuper ? "Go to Super Admin Console" : "Return to Contests"}
        </button>
      </div>
    );
  }

  const hasConfiguredOrg = Boolean(data?.organization?.name || user?.organizationName);
  const orgName = data?.organization?.name || user?.organizationName || `${user?.firstName}'s Institute`;
  const orgType = data?.organization?.type || user?.organizationType || "Institute";

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
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

      {/* Prompt to configure institute if not yet customized */}
      {!hasConfiguredOrg && (
        <div className="bg-gradient-to-r from-teal-50 via-teal-100/40 to-emerald-50 border-2 border-[#12BAB0]/40 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#12BAB0] text-white flex items-center justify-center shrink-0 shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Add Details for Your Institute
              </h3>
              <p className="text-xs text-gray-600 mt-0.5 max-w-xl leading-relaxed">
                Add your school, college, university, or academy name and category so students can discover your contests and join your organization.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("settings")}
            className="px-5 py-2.5 bg-[#010B28] hover:bg-[#12BAB0] text-white text-xs font-bold rounded-full transition-colors shrink-0 cursor-pointer shadow-sm"
          >
            Configure Institute Now &rarr;
          </button>
        </div>
      )}

      {/* Hero Banner with Shareable Link */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#010B28] via-[#091E42] to-[#0A2E5C] rounded-3xl p-6 md:p-8 text-white border border-gray-800 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#12BAB0]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#12BAB0]/20 text-[#12BAB0] border border-[#12BAB0]/40">
                <Building2 className="w-3.5 h-3.5" /> Host Organization Hub
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-gray-200 border border-white/10 capitalize">
                {orgType}
              </span>
              {data?.subscription && (
                <button
                  type="button"
                  onClick={() => setActiveTab("billing")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    data.subscription.isExpired
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                      : data.subscription.isActive
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                      : "bg-teal-500/20 text-[#12BAB0] border border-[#12BAB0]/40 hover:bg-teal-500/30"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>
                    {data.subscription.isExpired
                      ? "Plan Expired · Renew"
                      : data.subscription.isActive
                      ? `Pro (${data.subscription.daysRemaining}d left)`
                      : `Free Trial: ${data.subscription.contestCount}/3 Used`}
                  </span>
                </button>
              )}
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              {orgName}
            </h1>
            <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-2xl">
              Share your dedicated organization link with students & contestants so they can join and participate in all your ongoing contests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link href="/dashboard/create">
              <button className="flex items-center gap-2 bg-[#12BAB0] hover:bg-[#0ea89b] text-white px-5 py-2.5 rounded-full text-xs md:text-sm font-bold shadow-lg shadow-[#12BAB0]/20 transition-all cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>Create New Contest</span>
              </button>
            </Link>

            <Link href={inviteCode ? `/join/${inviteCode}` : "#"} target="_blank">
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all border border-white/15 cursor-pointer">
                <ExternalLink className="w-4 h-4" />
                <span>View Public Page</span>
              </button>
            </Link>
          </div>
        </div>

        {/* 1-Click Shareable Link Box */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#12BAB0]/20 text-[#12BAB0] flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                Your Contestant Join Link
              </div>
              <div className="text-xs text-[#12BAB0] font-mono truncate max-w-sm sm:max-w-md md:max-w-lg mt-0.5">
                {inviteUrl}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono font-bold text-gray-200 flex items-center gap-2">
              <span>Code: {inviteCode}</span>
              <button
                onClick={() => copyToClipboard(inviteCode, true)}
                className="hover:text-[#12BAB0] transition-colors cursor-pointer"
                title="Copy Code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={() => copyToClipboard(inviteUrl, false)}
              className="flex items-center gap-2 bg-[#12BAB0] hover:bg-[#0ea89b] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Enrolled Contestants */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Enrolled Contestants
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#12BAB0] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-black text-gray-900">
              {data?.stats?.totalMembers ?? 0}
            </div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium">
              Joined via your invite link
            </div>
          </div>
        </div>

        {/* Total Contests */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Total Contests
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-black text-gray-900">
              {data?.stats?.totalContests ?? 0}
            </div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium">
              <span className="text-emerald-600 font-bold">{data?.stats?.ongoingContests ?? 0}</span> ongoing ·{" "}
              <span>{data?.stats?.archivedContests ?? 0}</span> archived
            </div>
          </div>
        </div>

        {/* Submissions Received */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Submissions
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-black text-gray-900">
              {data?.stats?.totalSubmissions ?? 0}
            </div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium">
              Student submissions recorded
            </div>
          </div>
        </div>

        {/* Organization Code */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Invite Code
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl md:text-2xl font-black font-mono text-gray-900">
              {inviteCode || "—"}
            </div>
            <div className="text-[11px] text-[#12BAB0] font-bold mt-1">
              Active & Shareable
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "members"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Enrolled Contestants</span>
          <span className="text-xs bg-teal-100 text-[#0d8780] px-2 py-0.5 rounded-full font-bold">
            {data?.members?.length ?? 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("contests")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "contests"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>My Contests</span>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full font-semibold text-gray-600">
            {data?.contests?.length ?? 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "settings"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Organization Profile & Settings</span>
        </button>

        <button
          onClick={() => setActiveTab("billing")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "billing"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Plan & Subscription</span>
          {data?.subscription?.isExpired ? (
            <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold uppercase">
              Expired
            </span>
          ) : data?.subscription?.isActive ? (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">
              Pro Active
            </span>
          ) : (
            <span className="text-[10px] bg-teal-100 text-[#0d8780] px-2 py-0.5 rounded-full font-bold uppercase">
              {data?.subscription?.trialRemaining ?? 3} Free Left
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: ENROLLED CONTESTANTS */}
      {/* ============================================================== */}
      {activeTab === "members" && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Enrolled Organization Contestants</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Students and participants who entered your invite code or clicked your join link.
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-800"
              />
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold">No contestants have joined yet.</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Share your invite link <strong className="text-gray-600 font-mono">{inviteUrl}</strong> with students so they can join your organization!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Contestant</th>
                    <th className="py-3 px-3">Joined Date</th>
                    <th className="py-3 px-3">Last Active</th>
                    <th className="py-3 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredMembers.map((m) => (
                    <tr key={m._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          {m.avatar ? (
                            <img
                              src={m.avatar}
                              alt={m.firstName}
                              className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#010B28] to-[#12BAB0] text-white flex items-center justify-center font-bold text-xs">
                              {`${m.firstName?.[0] || ""}${m.lastName?.[0] || ""}`.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-gray-900">{`${m.firstName} ${m.lastName}`}</div>
                            <div className="text-xs text-gray-500">{m.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-xs text-gray-600">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}
                      </td>

                      <td className="py-3 px-3 text-xs text-gray-500">
                        {m.lastLogin ? new Date(m.lastLogin).toLocaleDateString() : "Never"}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Enrolled
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: MY CONTESTS */}
      {/* ============================================================== */}
      {activeTab === "contests" && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Organization Contests</h2>
              <p className="text-xs text-gray-500">Contests created under {orgName}</p>
            </div>
            <Link href="/dashboard/create">
              <button className="flex items-center gap-1.5 bg-[#12BAB0] hover:bg-[#0ea89b] text-white px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer shadow-xs">
                <Plus className="w-3.5 h-3.5" />
                <span>Create Contest</span>
              </button>
            </Link>
          </div>

          {(data?.contests || []).length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold">No contests created yet.</p>
              <Link href="/dashboard/create" className="inline-block mt-3">
                <button className="bg-[#12BAB0] text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-[#0ea89b] transition-colors cursor-pointer">
                  Create First Contest
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.contests.map((c) => (
                <div
                  key={c._id}
                  className="rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          c.status === "ongoing"
                            ? "bg-teal-50 text-teal-700 border border-teal-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {c.status}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {c.questions?.length || 0} Questions
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-base">{c.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Active Till: {c.activeTill?.date || "No date"} {c.activeTill?.time || ""}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="font-semibold text-gray-600">
                      {c.submissions?.length || 0} Submissions
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditContest(c)}
                        className="inline-flex items-center gap-1 text-[#12BAB0] font-bold hover:underline cursor-pointer"
                        title="Edit Contest Name & Time"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <span className="text-gray-300">|</span>

                      <button
                        type="button"
                        onClick={() => setDeletingContest(c)}
                        className="inline-flex items-center gap-1 text-rose-600 font-bold hover:underline cursor-pointer"
                        title="Delete Contest"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>

                      <span className="text-gray-300">|</span>

                      <Link
                        href={`/dashboard/contest/${c._id}`}
                        className="text-gray-700 font-bold hover:text-[#12BAB0]"
                      >
                        View &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ORGANIZATION PROFILE SETTINGS */}
      {/* ============================================================== */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Organization Profile</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Customize your institution branding shown on the public contestant join page.
            </p>
          </div>

          <form onSubmit={handleSaveOrganization} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Organization / College / School Name*
              </label>
              <input
                type="text"
                required
                value={orgForm.organizationName}
                onChange={(e) => setOrgForm({ ...orgForm, organizationName: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-900 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Organization Category*
              </label>
              <select
                value={orgForm.organizationType}
                onChange={(e) => setOrgForm({ ...orgForm, organizationType: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-900 font-medium"
              >
                <option value="school">School</option>
                <option value="college">College</option>
                <option value="university">University</option>
                <option value="institute">Coaching / Training Institute / Academy</option>
                <option value="company">Corporate / Company</option>
                <option value="other">Other</option>
              </select>
            </div>

            {orgForm.organizationType === "other" && (
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Specify Custom Category*
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sports Academy, Non-Profit, Tech Club"
                  value={customOrgType}
                  onChange={(e) => setCustomOrgType(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-900 font-medium"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Organization Bio / Description
              </label>
              <textarea
                rows={3}
                placeholder="Briefly describe your institution or contest rules for joining contestants..."
                value={orgForm.organizationDescription}
                onChange={(e) =>
                  setOrgForm({ ...orgForm, organizationDescription: e.target.value })
                }
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Permanent Invite Code
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteCode}
                  className="px-4 py-2.5 text-sm bg-gray-100 border border-gray-200 rounded-xl font-mono text-gray-600 font-bold select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(inviteCode, true)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {copiedCode ? "Copied" : "Copy Code"}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingOrg}
                className="px-6 py-2.5 bg-[#12BAB0] hover:bg-[#0ea89b] text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {savingOrg && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: PLAN & SUBSCRIPTION BILLING */}
      {/* ============================================================== */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Current Status Header Card */}
          <div className="bg-gradient-to-br from-slate-900 via-[#0B1528] to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Current Host Plan
                  </span>
                  {data?.subscription?.isExpired ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wide">
                      Expired
                    </span>
                  ) : data?.subscription?.isActive ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Pro
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-[#12BAB0] border border-[#12BAB0]/40 uppercase tracking-wide">
                      Free Trial
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {data?.subscription?.subscription?.plan === "yearly"
                    ? "Host Pro Annual Plan ($179/yr)"
                    : data?.subscription?.subscription?.plan === "monthly"
                    ? "Host Pro Monthly Plan ($19/mo)"
                    : "Free Trial Plan (3 Free Contests)"}
                </h2>

                <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                  {data?.subscription?.isExpired
                    ? "Your subscription cycle has ended. You cannot create new contests until renewing your plan."
                    : data?.subscription?.isActive
                    ? `Unlimited contest hosting is enabled until ${
                        data?.subscription?.subscription?.expiresAt
                          ? new Date(data.subscription.subscription.expiresAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "end of billing cycle"
                      }.`
                    : "Every host receives 3 free trial contests. Once all 3 are published, an active subscription is required to continue hosting."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {data?.subscription?.isExpired ? (
                  <button
                    onClick={() => handleSubscribePlan(data?.subscription?.subscription?.plan || "monthly")}
                    disabled={subscribing}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    {subscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>Renew Plan Now</span>
                  </button>
                ) : data?.subscription?.isTrial ? (
                  <button
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Upgrade to Pro</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleSubscribePlan(data?.subscription?.subscription?.plan || "monthly")}
                      disabled={subscribing}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Renew / Extend Plan</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenCancelSubscription}
                      disabled={subscribing}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white font-semibold text-xs border border-rose-500/30 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel Subscription</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Trial Counter & Progress or Days Remaining */}
            <div className="relative z-10 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Contests Created
                </span>
                <div className="text-xl font-black text-white">
                  {data?.subscription?.contestCount ?? 0}
                  <span className="text-xs text-slate-400 font-normal ml-1">contests hosted</span>
                </div>
                {data?.subscription?.isTrial && (
                  <div className="mt-2 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#12BAB0] h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, ((data?.subscription?.contestCount || 0) / (data?.subscription?.freeLimit || 3)) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Contest Creation Access
                </span>
                <div className="text-xl font-black">
                  {data?.subscription?.canCreateContest ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5" /> Enabled
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-5 h-5" /> Blocked (Plan Required)
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {data?.subscription?.isTrial
                    ? `${data?.subscription?.trialRemaining} free remaining`
                    : data?.subscription?.isActive
                    ? "Unlimited contests active"
                    : "Renew plan to unblock"}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Plan Expiration
                </span>
                <div className="text-xl font-black text-white">
                  {data?.subscription?.isExpired ? (
                    <span className="text-rose-400">Expired</span>
                  ) : data?.subscription?.daysRemaining !== null ? (
                    <span className="text-emerald-400">
                      {data?.subscription?.daysRemaining} days left
                    </span>
                  ) : (
                    <span className="text-slate-300">Free Trial Limit</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {data?.subscription?.subscription?.expiresAt
                    ? new Date(data.subscription.subscription.expiresAt).toLocaleDateString()
                    : "Limit of 3 contests"}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Plans Selection Cards */}
          <div>
            <div className="text-center max-w-xl mx-auto mb-6">
              <h3 className="text-xl font-extrabold text-gray-900">
                Choose or Renew Your Subscription Plan
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Both plans grant unlimited contest creation, participant leaderboards, and institution hosting capabilities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Monthly Plan Card */}
              <div
                className={`bg-white rounded-3xl p-6 sm:p-7 border transition-all flex flex-col justify-between relative ${
                  data?.subscription?.subscription?.plan === "monthly"
                    ? "border-2 border-emerald-500 shadow-xl shadow-emerald-500/15 ring-4 ring-emerald-500/20"
                    : "border-gray-200 shadow-sm hover:shadow-lg"
                }`}
              >
                {/* Chosen Plan Indicator */}
                {data?.subscription?.subscription?.plan === "monthly" && (
                  <div
                    className={`absolute -top-3.5 left-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 ${
                      data.subscription.isExpired
                        ? "bg-rose-500 text-white"
                        : "bg-emerald-500 text-slate-950"
                    }`}
                  >
                    {data.subscription.isExpired ? (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        <span>Your Plan (Expired · Renew)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-slate-950" />
                        <span>✓ Your Chosen Plan (Active)</span>
                      </>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3 mt-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Monthly Plan
                    </span>
                    <span className="p-1.5 rounded-xl bg-teal-50 text-[#12BAB0]">
                      <Zap className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-black text-gray-900">$19</span>
                    <span className="text-xs text-gray-500 font-semibold">/ month</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-6">
                    Full unlimited access for 30 days. Perfect for monthly test series or college semester quizzes.
                  </p>

                  <ul className="space-y-3 text-xs text-gray-700 mb-6">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#12BAB0] shrink-0" />
                      <span>Unlimited contest creation for 30 days</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#12BAB0] shrink-0" />
                      <span>Unlimited contestant participants & results</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#12BAB0] shrink-0" />
                      <span>Instant leaderboard & score exports</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#12BAB0] shrink-0" />
                      <span>Easy renewal upon expiration</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleSubscribePlan("monthly")}
                  disabled={subscribing}
                  className="w-full py-3 px-6 rounded-2xl bg-gray-900 hover:bg-[#12BAB0] text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {subscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>
                    {data?.subscription?.subscription?.plan === "monthly" && data?.subscription?.isActive
                      ? "Renew Monthly ($19/mo)"
                      : "Select Monthly ($19/mo)"}
                  </span>
                </button>
              </div>

              {/* Annual Plan Card */}
              <div
                className={`bg-gradient-to-b from-slate-900 via-slate-900 to-[#0A1A2F] text-white rounded-3xl p-6 sm:p-7 border-2 shadow-xl flex flex-col justify-between relative overflow-hidden ${
                  data?.subscription?.subscription?.plan === "yearly"
                    ? "border-emerald-400 ring-4 ring-emerald-500/30 shadow-emerald-500/20"
                    : "border-emerald-500/80 shadow-emerald-500/10"
                }`}
              >
                {/* Chosen Plan Indicator */}
                {data?.subscription?.subscription?.plan === "yearly" && (
                  <div
                    className={`absolute top-4 left-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 ${
                      data.subscription.isExpired
                        ? "bg-rose-500 text-white"
                        : "bg-emerald-400 text-slate-950"
                    }`}
                  >
                    {data.subscription.isExpired ? (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        <span>Your Plan (Expired · Renew)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-slate-950" />
                        <span>✓ Your Chosen Plan (Active)</span>
                      </>
                    )}
                  </div>
                )}

                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                  Save 22% · Best Value
                </div>

                <div className={data?.subscription?.subscription?.plan === "yearly" ? "mt-5" : ""}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Annual Pro
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-black text-white">$179</span>
                    <span className="text-xs text-slate-400 font-semibold">/ year</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-6">
                    Full 365 days of continuous access ($14.92/mo effective). Host year-round competitions with zero hassle.
                  </p>

                  <ul className="space-y-3 text-xs text-slate-200 mb-6">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Full 365 days of unlimited contest hosting</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Unlimited student enrollments & submissions</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Priority host support & verified badge</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Cost savings of $49/year vs monthly</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleSubscribePlan("yearly")}
                  disabled={subscribing}
                  className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {subscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Flame className="w-4 h-4" />
                  )}
                  <span>
                    {data?.subscription?.subscription?.plan === "yearly" && data?.subscription?.isActive
                      ? "Renew Annual ($179/yr)"
                      : "Select Annual ($179/yr)"}
                  </span>
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Subscription Upgrade Modal */}
      <SubscriptionModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSuccess={() => {
          showToast("success", "Subscription updated successfully!");
          loadHostData();
          setIsUpgradeModalOpen(false);
        }}
        subStatus={data?.subscription}
        initialPlan={selectedUpgradePlan}
        initialStep={modalInitialStep}
      />
      {/* ============================================================== */}
      {/* MODAL: EDIT CONTEST NAME & TIME                                */}
      {/* ============================================================== */}
      {editingContest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-2xl bg-teal-50 text-[#12BAB0]">
                  <Edit3 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Edit Contest Details</h3>
                  <p className="text-xs text-gray-500">Update contest name, active dates & time</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingContest(null)}
                disabled={savingContest}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditContest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Contest Name / Title*
                </label>
                <input
                  type="text"
                  required
                  value={editContestForm.name}
                  onChange={(e) => setEditContestForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Weekly Tech Quiz, Midterm Challenge"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-sm text-gray-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Active Till (Deadline Date & Time)*
                </label>
                <DeadlinePicker
                  value={editContestForm.activeTill}
                  onChange={(val) => setEditContestForm((prev) => ({ ...prev, activeTill: val }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={editContestForm.startDate}
                  onChange={(e) => setEditContestForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-sm text-gray-900"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingContest(null)}
                  disabled={savingContest}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingContest}
                  className="px-5 py-2.5 rounded-xl bg-[#12BAB0] hover:bg-[#0ea89b] text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingContest ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRM DELETE CONTEST                                  */}
      {/* ============================================================== */}
      {deletingContest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-3 rounded-2xl bg-rose-100 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Entire Contest?</h3>
                <p className="text-xs text-rose-600 font-semibold">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-gray-900 font-bold">&ldquo;{deletingContest.name}&rdquo;</strong>?
              This will erase all questions, options, contestant answer records, and leaderboard submissions.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingContest(null)}
                disabled={deletingContestLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteContest}
                disabled={deletingContestLoading}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deletingContestLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Contest Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
