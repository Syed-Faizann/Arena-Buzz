"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  Radio,
  Trophy,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Key,
  Trash2,
  UserCheck,
  UserX,
  Clock,
  Database,
  X,
  Check,
  Loader2,
  ShieldAlert,
  Building2,
  GraduationCap,
  School,
  Copy,
  ExternalLink,
  Building,
  CreditCard,
  DollarSign,
  Receipt,
  FileText,
  Download,
  ArrowDownRight,
  Sparkles,
  LifeBuoy,
  MessageSquare,
  MessageSquareWarning,
  Eye,
  Send,
  Image as ImageIcon,
  Flame,
  HelpCircle,
  Tag,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getAdminStats,
  getAdminUsers,
  getAdminSessions,
  terminateAdminSession,
  updateAdminUserRole,
  updateAdminUserStatus,
  resetAdminUserPassword,
  deleteAdminUser,
  getAdminContests,
  deleteAdminContest,
  getAdminPayments,
  getAllSupportTicketsAdmin,
  updateSupportTicketAdmin,
  deleteSupportTicketAdmin,
} from "../../services/api";

export default function SuperAdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const isSuperAdmin = user?.userType === "superadmin";

  // Data states
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [contests, setContests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentMetrics, setPaymentMetrics] = useState({
    totalRevenue: 0,
    totalPayments: 0,
    activeSubscribers: 0,
    adminAccount: null,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState("users"); // "users" | "organizations" | "payments" | "sessions" | "contests" | "security"
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orgTypeFilter, setOrgTypeFilter] = useState("all");
  const [copiedCode, setCopiedCode] = useState(null);

  // Payments filter states
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentPlanFilter, setPaymentPlanFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Support & Feedback states
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportMetrics, setSupportMetrics] = useState({
    total: 0,
    pending: 0,
    inReview: 0,
    resolved: 0,
    closed: 0,
  });
  const [supportSearch, setSupportSearch] = useState("");
  const [supportStatusFilter, setSupportStatusFilter] = useState("all");
  const [supportPriorityFilter, setSupportPriorityFilter] = useState("all");
  const [supportRoleFilter, setSupportRoleFilter] = useState("all");
  const [supportCategoryFilter, setSupportCategoryFilter] = useState("all");
  const [editingTicketReplies, setEditingTicketReplies] = useState({});
  const [savingReplyId, setSavingReplyId] = useState(null);
  const [updatingTicketId, setUpdatingTicketId] = useState(null);
  const [selectedTicketImage, setSelectedTicketImage] = useState(null);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [deletingTicket, setDeletingTicket] = useState(false);

  // Notifications
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', text: '' }

  // Modal States: Suspend / Reactivate Confirmation
  const [statusModalUser, setStatusModalUser] = useState(null); // { user, nextStatus: 'active' | 'blocked' }
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Delete confirmation modal
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'user' | 'contest', item }
  const [deletingItem, setDeletingItem] = useState(false);

  // Admin Change Own Password
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [changingAdminPassword, setChangingAdminPassword] = useState(false);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const joinUrl = `${origin}/join/${code}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedCode(code);
    showToast("success", `Invite link for ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Load dashboard data
  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingData(true);

    try {
      const [statsRes, usersRes, sessionsRes, contestsRes, paymentsRes, supportRes] = await Promise.all([
        getAdminStats().catch(() => null),
        getAdminUsers().catch(() => ({ users: [] })),
        getAdminSessions().catch(() => ({ sessions: [] })),
        getAdminContests().catch(() => ({ contests: [] })),
        getAdminPayments().catch(() => null),
        getAllSupportTicketsAdmin().catch(() => null),
      ]);

      if (statsRes?.stats) setStats(statsRes.stats);
      if (usersRes?.users) setUsers(usersRes.users);
      if (sessionsRes?.sessions) setSessions(sessionsRes.sessions);
      if (contestsRes?.contests) setContests(contestsRes.contests);
      if (paymentsRes?.payments) {
        setPayments(paymentsRes.payments);
        setPaymentMetrics({
          totalRevenue: paymentsRes.totalRevenue ?? 0,
          totalPayments: paymentsRes.totalPayments ?? 0,
          activeSubscribers: paymentsRes.activeSubscribers ?? 0,
          adminAccount: paymentsRes.adminAccount || null,
        });
      }
      if (supportRes?.tickets) {
        setSupportTickets(supportRes.tickets);
        if (supportRes.metrics) {
          setSupportMetrics(supportRes.metrics);
        } else {
          setSupportMetrics({
            total: supportRes.tickets.length,
            pending: supportRes.tickets.filter((t) => t.status === "pending").length,
            inReview: supportRes.tickets.filter((t) => t.status === "in_review").length,
            resolved: supportRes.tickets.filter((t) => t.status === "resolved").length,
            closed: supportRes.tickets.filter((t) => t.status === "closed").length,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
      showToast("error", err.message || "Failed to load dashboard data");
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      loadDashboardData();
    }
  }, [authLoading, isSuperAdmin]);

  // Read URL tab query parameter on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam &&
        [
          "users",
          "organizations",
          "payments",
          "sessions",
          "contests",
          "security",
          "support",
        ].includes(tabParam)
      ) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // All registered host organizations
  const hostOrganizations = useMemo(() => {
    return users.filter((u) => u.userType === "host");
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.organizationName?.toLowerCase().includes(q) ||
        u.inviteCode?.toLowerCase().includes(q);

      const matchesRole = roleFilter === "all" || u.userType === roleFilter;
      const matchesStatus = statusFilter === "all" || (u.status || "active") === statusFilter;
      const standardTypes = ["school", "college", "university", "institute", "company"];
      const userOrgType = (u.organizationType || "college").toLowerCase();
      const matchesOrgType =
        orgTypeFilter === "all" ||
        (u.userType === "host" &&
          (orgTypeFilter === "other"
            ? !standardTypes.includes(userOrgType) || userOrgType === "other"
            : userOrgType === orgTypeFilter.toLowerCase()));

      return matchesSearch && matchesRole && matchesStatus && matchesOrgType;
    });
  }, [users, searchQuery, roleFilter, statusFilter, orgTypeFilter]);

  // Filtered payments memo
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = paymentSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.transactionId?.toLowerCase().includes(q) ||
        p.hostName?.toLowerCase().includes(q) ||
        p.hostEmail?.toLowerCase().includes(q) ||
        p.organizationName?.toLowerCase().includes(q) ||
        p.card?.last4?.includes(q);

      const matchPlan = paymentPlanFilter === "all" || p.plan === paymentPlanFilter;
      const matchStatus = paymentStatusFilter === "all" || p.status === paymentStatusFilter;

      return matchSearch && matchPlan && matchStatus;
    });
  }, [payments, paymentSearch, paymentPlanFilter, paymentStatusFilter]);

  // Role update handler
  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateAdminUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, userType: newRole } : u))
      );
      showToast("success", `Role updated to ${newRole}`);
      loadDashboardData(true);
    } catch (err) {
      showToast("error", err.message || "Failed to update role");
    }
  };

  // Suspend / Reactivate handler
  const handleConfirmStatusChange = async () => {
    if (!statusModalUser) return;
    const { user: targetUser, nextStatus } = statusModalUser;

    try {
      setUpdatingStatus(true);
      await updateAdminUserStatus(targetUser._id, nextStatus);

      setUsers((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, status: nextStatus } : u))
      );

      showToast(
        "success",
        nextStatus === "blocked"
          ? `User ${targetUser.email} has been suspended and active sessions purged.`
          : `User ${targetUser.email} has been reactivated successfully!`
      );

      setStatusModalUser(null);
      loadDashboardData(true);
    } catch (err) {
      showToast("error", err.message || "Failed to update account status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Session termination handler
  const handleTerminateSession = async (sessionId) => {
    try {
      await terminateAdminSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      showToast("success", "Active user session terminated");
      loadDashboardData(true);
    } catch (err) {
      showToast("error", err.message || "Failed to terminate session");
    }
  };

  // Delete handler
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setDeletingItem(true);
      if (itemToDelete.type === "user") {
        await deleteAdminUser(itemToDelete.item._id);
        setUsers((prev) => prev.filter((u) => u._id !== itemToDelete.item._id));
        showToast("success", `User ${itemToDelete.item.email} deleted`);
      } else if (itemToDelete.type === "contest") {
        await deleteAdminContest(itemToDelete.item._id);
        setContests((prev) => prev.filter((c) => c._id !== itemToDelete.item._id));
        showToast("success", `Contest '${itemToDelete.item.name}' deleted`);
      }
      setItemToDelete(null);
      loadDashboardData(true);
    } catch (err) {
      showToast("error", err.message || "Failed to delete item");
    } finally {
      setDeletingItem(false);
    }
  };

  // Admin self password change
  const handleAdminChangeSelfPassword = async (e) => {
    e.preventDefault();
    if (!adminNewPassword || adminNewPassword.length < 6) {
      showToast("error", "New password must be at least 6 characters long");
      return;
    }

    try {
      setChangingAdminPassword(true);
      await resetAdminUserPassword(user._id || user.id, adminNewPassword);
      showToast("success", "Your Super Admin password was updated in the database!");
      setAdminNewPassword("");
    } catch (err) {
      showToast("error", err.message || "Failed to update password");
    } finally {
      setChangingAdminPassword(false);
    }
  };

  // Filtered support tickets memo
  const filteredSupportTickets = useMemo(() => {
    return supportTickets.filter((t) => {
      const q = supportSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.subject?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.userName?.toLowerCase().includes(q) ||
        t.userEmail?.toLowerCase().includes(q);

      const matchesStatus = supportStatusFilter === "all" || t.status === supportStatusFilter;
      const matchesPriority = supportPriorityFilter === "all" || t.priority === supportPriorityFilter;
      const matchesRole = supportRoleFilter === "all" || t.userRole === supportRoleFilter;
      const matchesCategory = supportCategoryFilter === "all" || t.category === supportCategoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesRole && matchesCategory;
    });
  }, [
    supportTickets,
    supportSearch,
    supportStatusFilter,
    supportPriorityFilter,
    supportRoleFilter,
    supportCategoryFilter,
  ]);

  // Quick status update for support ticket
  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    try {
      setUpdatingTicketId(ticketId);
      const res = await updateSupportTicketAdmin(ticketId, { status: newStatus });
      const updatedTicket =
        res.ticket || {
          ...supportTickets.find((t) => t._id === ticketId),
          status: newStatus,
        };
      setSupportTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? updatedTicket : t))
      );
      setSupportMetrics((prev) => {
        const oldTicket = supportTickets.find((t) => t._id === ticketId);
        const oldStatus = oldTicket?.status || "pending";
        if (oldStatus === newStatus) return prev;
        const keyMap = {
          pending: "pending",
          in_review: "inReview",
          resolved: "resolved",
          closed: "closed",
        };
        const oldKey = keyMap[oldStatus];
        const newKey = keyMap[newStatus];
        return {
          ...prev,
          ...(oldKey ? { [oldKey]: Math.max(0, (prev[oldKey] || 1) - 1) } : {}),
          ...(newKey ? { [newKey]: (prev[newKey] || 0) + 1 } : {}),
        };
      });
      showToast("success", `Ticket marked as ${newStatus.replace("_", " ")}`);
    } catch (err) {
      showToast("error", err.message || "Failed to update ticket status");
    } finally {
      setUpdatingTicketId(null);
    }
  };

  // Save admin response to support ticket
  const handleSaveTicketReply = async (ticketId, autoResolve = false) => {
    const currentTicket = supportTickets.find((t) => t._id === ticketId);
    const replyText =
      editingTicketReplies[ticketId] !== undefined
        ? editingTicketReplies[ticketId]
        : currentTicket?.adminResponse || "";

    if (!replyText || !replyText.trim()) {
      showToast("error", "Please write a resolution message before submitting");
      return;
    }

    try {
      setSavingReplyId(ticketId);
      const payload = {
        adminResponse: replyText.trim(),
        ...(autoResolve ? { status: "resolved" } : {}),
      };
      const res = await updateSupportTicketAdmin(ticketId, payload);
      const updatedTicket =
        res.ticket || {
          ...currentTicket,
          adminResponse: replyText.trim(),
          respondedAt: new Date().toISOString(),
          ...(autoResolve ? { status: "resolved" } : {}),
        };
      setSupportTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? updatedTicket : t))
      );
      if (autoResolve) {
        setSupportMetrics((prev) => {
          const oldStatus = currentTicket?.status || "pending";
          if (oldStatus === "resolved") return prev;
          const keyMap = {
            pending: "pending",
            in_review: "inReview",
            resolved: "resolved",
            closed: "closed",
          };
          const oldKey = keyMap[oldStatus];
          return {
            ...prev,
            ...(oldKey ? { [oldKey]: Math.max(0, (prev[oldKey] || 1) - 1) } : {}),
            resolved: (prev.resolved || 0) + 1,
          };
        });
      }
      showToast(
        "success",
        autoResolve
          ? "Resolution response posted and marked as Resolved!"
          : "Official response posted to ticket!"
      );
    } catch (err) {
      showToast("error", err.message || "Failed to save response");
    } finally {
      setSavingReplyId(null);
    }
  };

  // Confirm delete ticket
  const handleConfirmDeleteTicket = async () => {
    if (!ticketToDelete) return;
    try {
      setDeletingTicket(true);
      await deleteSupportTicketAdmin(ticketToDelete._id);
      setSupportTickets((prev) => prev.filter((t) => t._id !== ticketToDelete._id));
      setSupportMetrics((prev) => {
        const keyMap = {
          pending: "pending",
          in_review: "inReview",
          resolved: "resolved",
          closed: "closed",
        };
        const statKey = keyMap[ticketToDelete.status] || "pending";
        return {
          ...prev,
          total: Math.max(0, prev.total - 1),
          [statKey]: Math.max(0, (prev[statKey] || 1) - 1),
        };
      });
      showToast("success", "Support ticket deleted permanently");
      setTicketToDelete(null);
    } catch (err) {
      showToast("error", err.message || "Failed to delete ticket");
    } finally {
      setDeletingTicket(false);
    }
  };

  // Auth Guard
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#12BAB0]" />
        <p className="text-gray-500 font-medium text-sm">Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl p-8 border border-red-100 shadow-xl text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Restricted Access</h2>
        <p className="text-gray-600 text-sm mb-6">
          This dashboard requires <strong>Super Admin</strong> credentials. Your current account (
          {user?.email || "Guest"}) does not have administrative privileges.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-[#010B28] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-black transition-colors cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
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
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#010B28] via-[#08183A] to-[#0A2540] rounded-3xl p-6 md:p-8 text-white border border-gray-800 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#12BAB0]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                👑 Super Admin Console
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Database Active
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              Master Admin Control Center
            </h1>
            <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-2xl">
              Inspect all registered accounts, monitor active logins in real time, suspend or reactivate
              users, and maintain full supervisory control.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all backdrop-blur-md border border-white/10 cursor-pointer disabled:opacity-50"
              title="Refresh live data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#12BAB0]" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Sync Live"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Platform Revenue Card */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Platform Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-black text-emerald-600">
              ${stats?.totalRevenue ?? paymentMetrics.totalRevenue ?? 0}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-500 font-medium truncate" title="Sent directly to Super Admin account">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>Credited to Admin Account</span>
            </div>
          </div>
        </div>
        {/* Total Users */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Total Users
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-black text-gray-900">
              {stats?.totalUsers ?? users.length}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 font-medium">
              <span className="text-emerald-600 font-bold">{stats?.totalContestants ?? 0}</span> contestants ·{" "}
              <span className="text-purple-600 font-bold">{stats?.totalHosts ?? 0}</span> hosts
            </div>
          </div>
        </div>

        {/* Host Organizations */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Host Orgs
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#12BAB0] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-black text-[#12BAB0]">
              {stats?.totalOrganizations ?? hostOrganizations.length}
            </div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium truncate" title="Colleges, schools, institutes registered">
              Colleges · Schools · Institutes
            </div>
          </div>
        </div>

        {/* Currently Logged In (Active Sessions) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Active Logins
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center relative">
              <Radio className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-black text-emerald-600 flex items-center gap-2">
              {stats?.activeSessionsCount ?? sessions.length}
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Live
              </span>
            </div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium">
              Active sessions in MongoDB
            </div>
          </div>
        </div>

        {/* Total Contests */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Contests
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-black text-gray-900">
              {stats?.totalContests ?? contests.length}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 font-medium">
              <span className="text-teal-600 font-bold">{stats?.ongoingContests ?? 0}</span> ongoing
            </div>
          </div>
        </div>

        {/* Suspended Accounts */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Suspended
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-black text-red-600">
              {stats?.blockedUsers ?? users.filter((u) => u.status === "blocked").length}
            </div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium">
              Blocked accounts
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "users"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management</span>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full font-semibold text-gray-600">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("organizations")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "organizations"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <Building2 className="w-4 h-4 text-[#12BAB0]" />
          <span>Host Organizations</span>
          <span className="text-xs bg-teal-100 px-2 py-0.5 rounded-full font-bold text-teal-800">
            {hostOrganizations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "payments"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-500" />
          <span>Payments & Revenue</span>
          <span className="text-xs bg-emerald-100 px-2 py-0.5 rounded-full font-bold text-emerald-700">
            ${stats?.totalRevenue ?? paymentMetrics.totalRevenue ?? 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("sessions")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "sessions"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>Active Logins & Sessions</span>
          <span className="text-xs bg-emerald-100 px-2 py-0.5 rounded-full font-bold text-emerald-700">
            {sessions.length}
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
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>All Contests</span>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full font-semibold text-gray-600">
            {contests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "security"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <Lock className="w-4 h-4 text-purple-500" />
          <span>Admin Credentials & .env Sync</span>
        </button>

        <button
          onClick={() => setActiveTab("support")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "support"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <LifeBuoy className="w-4 h-4 text-[#12BAB0]" />
          <span>Feedback & Support</span>
          {supportMetrics.pending > 0 ? (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold animate-pulse">
              {supportMetrics.pending} pending
            </span>
          ) : (
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full font-semibold text-gray-600">
              {supportTickets.length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: ALL USERS MANAGEMENT */}
      {/* ============================================================== */}
      {activeTab === "users" && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, organization, or invite code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Role:
              </span>
              {["all", "contestant", "host", "superadmin"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors cursor-pointer ${
                    roleFilter === r
                      ? "bg-[#010B28] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {r}
                </button>
              ))}

              <span className="text-xs font-bold text-gray-400 ml-2">Type:</span>
              <select
                value={orgTypeFilter}
                onChange={(e) => setOrgTypeFilter(e.target.value)}
                className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="college">College</option>
                <option value="school">School</option>
                <option value="institute">Institute</option>
                <option value="university">University</option>
                <option value="company">Company</option>
                <option value="other">Other</option>
              </select>

              <span className="text-xs font-bold text-gray-400 ml-2">Status:</span>
              {["all", "active", "blocked"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors cursor-pointer ${
                    statusFilter === s
                      ? s === "blocked" ? "bg-red-600 text-white" : "bg-[#12BAB0] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s === "blocked" ? "Suspended" : s}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          {loadingData ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#12BAB0]" />
              <p className="text-xs">Loading user directory...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold">No users matched your filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">User Profile</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Organization / Affiliation</th>
                    <th className="py-3 px-3">Current Status</th>
                    <th className="py-3 px-3">Last Login</th>
                    <th className="py-3 px-3">Joined Date</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((u) => {
                    const isSelf = u._id === (user._id || user.id);
                    const isUserBlocked = u.status === "blocked";

                    return (
                      <tr key={u._id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Profile */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            {u.avatar ? (
                              <img
                                src={u.avatar}
                                alt={u.firstName}
                                className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#010B28] to-[#12BAB0] text-white flex items-center justify-center font-bold text-xs">
                                {`${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                <span>{`${u.firstName} ${u.lastName}`}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-purple-100 text-purple-700 font-extrabold px-1.5 py-0.2 rounded">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 font-medium">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role Selector */}
                        <td className="py-3 px-3">
                          <select
                            value={u.userType}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            disabled={isSelf}
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border focus:outline-none cursor-pointer transition-colors ${
                              u.userType === "superadmin"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : u.userType === "host"
                                ? "bg-teal-50 text-teal-700 border-teal-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                          >
                            <option value="contestant">Contestant</option>
                            <option value="host">Host</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                        </td>

                        {/* Organization / Affiliation */}
                        <td className="py-3 px-3">
                          {u.userType === "host" ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-900 text-xs">
                                  {u.organizationName || "Unnamed Organization"}
                                </span>
                                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200">
                                  {u.organizationType || "college"}
                                </span>
                              </div>
                              {u.inviteCode ? (
                                <div className="flex items-center gap-1 text-[11px]">
                                  <span className="font-mono font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                                    {u.inviteCode}
                                  </span>
                                  <button
                                    onClick={() => handleCopyCode(u.inviteCode)}
                                    className="p-1 text-gray-400 hover:text-[#12BAB0] rounded hover:bg-gray-100 transition-colors cursor-pointer"
                                    title="Copy contestant invite link"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  <a
                                    href={`/join/${u.inviteCode}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                                    title="Open public join page"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-400 italic">No code generated</span>
                              )}
                            </div>
                          ) : u.userType === "contestant" ? (
                            <div>
                              {u.joinedOrganizations && u.joinedOrganizations.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {u.joinedOrganizations.map((org, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200"
                                      title={org?.organizationType ? `Type: ${org.organizationType}` : undefined}
                                    >
                                      <School className="w-3 h-3 text-blue-500 shrink-0" />
                                      <span>{org?.organizationName || "Host Org"}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Independent Contestant</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              System Super Admin
                            </span>
                          )}
                        </td>

                        {/* Current Status Badge */}
                        <td className="py-3 px-3">
                          {isUserBlocked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                              <UserX className="w-3.5 h-3.5 text-red-600" />
                              Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Active
                            </span>
                          )}
                        </td>

                        {/* Last Login */}
                        <td className="py-3 px-3 text-xs text-gray-500">
                          {u.lastLogin ? (
                            <span title={new Date(u.lastLogin).toLocaleString()}>
                              {new Date(u.lastLogin).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">No login recorded</span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="py-3 px-3 text-xs text-gray-500">
                          {u.createdAt ? (
                            new Date(u.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Explicit Suspend / Reactivate Action Button */}
                            {!isSelf ? (
                              isUserBlocked ? (
                                <button
                                  onClick={() =>
                                    setStatusModalUser({ user: u, nextStatus: "active" })
                                  }
                                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                  title="Reactivate this user account"
                                >
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Reactivate</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    setStatusModalUser({ user: u, nextStatus: "blocked" })
                                  }
                                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                  title="Suspend this user account"
                                >
                                  <UserX className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Suspend</span>
                                </button>
                              )
                            ) : (
                              <span className="text-xs text-gray-400 italic px-2">Master</span>
                            )}

                            {/* Delete User Button */}
                            <button
                              onClick={() => setItemToDelete({ type: "user", item: u })}
                              disabled={isSelf}
                              className={`p-1.5 rounded-xl transition-colors ${
                                isSelf
                                  ? "text-gray-300 cursor-not-allowed"
                                  : "text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              }`}
                              title={isSelf ? "Cannot delete yourself" : "Delete User"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      )}

      {/* ============================================================== */}
      {/* TAB: HOST ORGANIZATIONS DIRECTORY */}
      {/* ============================================================== */}
      {activeTab === "organizations" && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#12BAB0]" />
                Host Organizations Directory
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Supervise all colleges, schools, institutes, and hosts registered with custom invite links.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                {hostOrganizations.length} Host Organizations
              </span>
            </div>
          </div>

          {hostOrganizations.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-base font-bold text-gray-700">No Host Organizations Registered Yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                When hosts register as a college, school, or institute, their sharable invite link and enrolled student counts will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {hostOrganizations.map((host) => {
                const enrolledCount = users.filter((u) =>
                  u.joinedOrganizations?.some(
                    (org) => (org?._id || org) === host._id
                  )
                ).length;

                const hostedContestsCount = contests.filter(
                  (c) => (c.host?._id || c.host) === host._id
                ).length;

                const origin = typeof window !== "undefined" ? window.location.origin : "";
                const joinUrl = host.inviteCode ? `${origin}/join/${host.inviteCode}` : "";

                return (
                  <div
                    key={host._id}
                    className="rounded-2xl border border-gray-100 p-5 bg-gradient-to-b from-gray-50/50 to-white hover:shadow-lg transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Org Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-[#12BAB0] flex items-center justify-center font-bold">
                            {host.organizationType === "school" ? (
                              <School className="w-5 h-5 text-amber-600" />
                            ) : host.organizationType === "college" || host.organizationType === "university" ? (
                              <GraduationCap className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <Building2 className="w-5 h-5 text-[#12BAB0]" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#12BAB0] transition-colors line-clamp-1">
                              {host.organizationName || "Unnamed Organization"}
                            </h3>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                              {host.organizationType || "college"}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            host.status === "blocked"
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {host.status === "blocked" ? "Suspended" : "Active"}
                        </span>
                      </div>

                      {/* Lead Host Admin */}
                      <div className="bg-gray-50 rounded-xl p-3 my-3 text-xs space-y-1 border border-gray-100">
                        <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                          Host Administrator
                        </div>
                        <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                          <span>{host.firstName} {host.lastName}</span>
                        </div>
                        <div className="text-gray-500 text-[11px] truncate">{host.email}</div>
                      </div>

                      {/* Invite Link & Code */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Invite Code</span>
                          {host.inviteCode && (
                            <span className="font-mono text-gray-600">{host.inviteCode}</span>
                          )}
                        </div>

                        {host.inviteCode ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              readOnly
                              value={joinUrl}
                              className="w-full text-[11px] bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 font-mono select-all focus:outline-none"
                            />
                            <button
                              onClick={() => handleCopyCode(host.inviteCode)}
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-[#12BAB0] hover:text-white text-gray-600 transition-colors cursor-pointer shrink-0"
                              title="Copy invite URL"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`/join/${host.inviteCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-600 transition-colors cursor-pointer shrink-0"
                              title="Open public join page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No invite code assigned</p>
                        )}
                      </div>
                    </div>

                    {/* Stats footer */}
                    <div className="grid grid-cols-2 gap-2 pt-4 mt-4 border-t border-gray-100 text-center">
                      <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="text-base font-black text-gray-900">{enrolledCount}</div>
                        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                          Enrolled Contestants
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="text-base font-black text-gray-900">{hostedContestsCount}</div>
                        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                          Contests Hosted
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB: PAYMENTS & PLATFORM REVENUE */}
      {/* ============================================================== */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          {/* Revenue Hero Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-[#0B1728] to-slate-900 rounded-3xl p-6 md:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Platform Revenue Ledger
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    Beneficiary: Super Admin Account
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl md:text-5xl font-black text-white">
                    ${stats?.totalRevenue ?? paymentMetrics.totalRevenue ?? 0}.00
                  </span>
                  <span className="text-xs md:text-sm text-slate-400 font-semibold uppercase">
                    USD Total Revenue
                  </span>
                </div>

                <p className="text-xs md:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  Every host subscription payment is routed to and credited in the Super Admin account (
                  <strong className="text-white font-mono">
                    {paymentMetrics.adminAccount?.email || "admin@fantsy.com"}
                  </strong>
                  ). Below is the permanent audit trail of all transactions.
                </p>
              </div>

              {/* Sub metrics */}
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="text-xl md:text-2xl font-black text-emerald-400">
                    {paymentMetrics.activeSubscribers || stats?.activeSubscriptions || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Active Pro Hosts
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="text-xl md:text-2xl font-black text-white">
                    {payments.length}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Transactions
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payments Filter & Data Table */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by host, email, Txn ID, or card last 4..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-800"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </div>

                <select
                  value={paymentPlanFilter}
                  onChange={(e) => setPaymentPlanFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-700 font-medium cursor-pointer"
                >
                  <option value="all">All Plans</option>
                  <option value="monthly">Monthly Pro ($19)</option>
                  <option value="yearly">Annual Pro ($179)</option>
                </select>

                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-gray-700 font-medium cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed / Paid</option>
                  <option value="refunded">Refunded</option>
                  <option value="failed">Failed</option>
                </select>

                {(paymentSearch || paymentPlanFilter !== "all" || paymentStatusFilter !== "all") && (
                  <button
                    onClick={() => {
                      setPaymentSearch("");
                      setPaymentPlanFilter("all");
                      setPaymentStatusFilter("all");
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1 cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-400" />
                <h4 className="text-sm font-bold text-gray-700">No payment records match criteria</h4>
                <p className="text-xs text-gray-400 mt-1">
                  Try adjusting your search terms or filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Host / Payer</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Credited To (Beneficiary)</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Date & Validity</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayments.map((p) => {
                      const isYearly = p.plan === "yearly";
                      return (
                        <tr key={p._id || p.transactionId} className="hover:bg-gray-50/60 transition-colors">
                          {/* Transaction ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-800 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[#12BAB0]">{p.transactionId}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(p.transactionId);
                                  showToast("success", `Copied Txn ID: ${p.transactionId}`);
                                }}
                                className="text-gray-400 hover:text-gray-700 cursor-pointer"
                                title="Copy Transaction ID"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Host Details */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-teal-50 text-[#12BAB0] border border-teal-200 font-bold flex items-center justify-center shrink-0 uppercase text-xs">
                                {p.hostName ? p.hostName.charAt(0) : "H"}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">{p.hostName || "Host"}</div>
                                <div className="text-[11px] text-gray-500 font-mono">{p.hostEmail}</div>
                                {p.organizationName && (
                                  <div className="text-[10px] text-teal-700 font-medium">
                                    🏢 {p.organizationName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Plan */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isYearly ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Sparkles className="w-3 h-3 text-amber-600" /> Annual Pro (365d)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-[#12BAB0] border border-teal-200">
                                <CreditCard className="w-3 h-3 text-[#12BAB0]" /> Monthly Pro (30d)
                              </span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="text-sm font-black text-emerald-600">
                              +${p.amount}.00 <span className="text-[10px] text-gray-400 font-normal">USD</span>
                            </div>
                          </td>

                          {/* Beneficiary */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-gray-700">
                              <span className="p-1 rounded-md bg-purple-50 text-purple-600">👑</span>
                              <div>
                                <div className="font-bold text-[11px] text-gray-900">Super Admin Account</div>
                                <div className="font-mono text-[10px] text-gray-500">
                                  {p.recipientEmail || "admin@fantsy.com"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Payment Method / Card */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-mono text-xs text-gray-700 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 font-bold text-[10px] text-gray-600">
                                {p.card?.brand || "Card"}
                              </span>
                              <span>•••• {p.card?.last4 || "4242"}</span>
                            </div>
                          </td>

                          {/* Date & Validity */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="text-gray-900 font-medium">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "Today"}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              Valid till:{" "}
                              {p.validUntil ? new Date(p.validUntil).toLocaleDateString() : "Active"}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(p)}
                              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-[#12BAB0] text-gray-700 hover:text-white font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>View Receipt</span>
                            </button>
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
      )}

      {/* ============================================================== */}
      {/* TAB 2: ACTIVE LOGINS & SESSIONS */}
      {/* ============================================================== */}
      {activeTab === "sessions" && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
                Live User Sessions in MongoDB
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time active login sessions currently maintained in the database sessions collection.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {sessions.length} Users Active Online
              </span>
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Radio className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold">No active sessions detected.</p>
              <p className="text-xs text-gray-400 mt-1">
                When users log in, their active MongoDB sessions will show up here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((sess) => {
                const u = sess.user;
                const isCurrent = sess.isCurrentSession;

                return (
                  <div
                    key={sess.sessionId}
                    className={`rounded-2xl p-4 border transition-all ${
                      isCurrent
                        ? "bg-purple-50/40 border-purple-200 ring-2 ring-purple-500/20 shadow-sm"
                        : "bg-gray-50/70 border-gray-200/80 hover:bg-white hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {u?.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.firstName || "User"}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/40 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#010B28] to-[#12BAB0] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {`${u?.firstName?.[0] || ""}${u?.lastName?.[0] || ""}`.toUpperCase() || "FB"}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="font-bold text-sm text-gray-900 truncate flex items-center gap-1.5">
                            <span>
                              {u?.firstName ? `${u.firstName} ${u.lastName}` : "Session User"}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] bg-purple-600 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{u?.email}</div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          u?.userType === "superadmin"
                            ? "bg-purple-100 text-purple-700"
                            : u?.userType === "host"
                            ? "bg-teal-100 text-teal-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {u?.userType || "User"}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-200/60 space-y-1.5 text-xs text-gray-500">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="w-3 h-3 text-[#12BAB0]" /> Expires In:
                        </span>
                        <span className="font-semibold text-gray-700">
                          {sess.expires ? new Date(sess.expires).toLocaleDateString() : "Active"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 font-mono">Session ID:</span>
                        <span className="font-mono text-[11px] text-gray-500 truncate max-w-[150px]">
                          {sess.sessionId}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      {isCurrent ? (
                        <div className="text-center text-xs font-semibold text-purple-600 py-1.5 bg-purple-100/50 rounded-xl">
                          Current Active Admin Session
                        </div>
                      ) : (
                        <button
                          onClick={() => handleTerminateSession(sess.sessionId)}
                          className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Terminate Active Session</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ALL PLATFORM CONTESTS */}
      {/* ============================================================== */}
      {activeTab === "contests" && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">All Platform Contests</h2>
              <p className="text-xs text-gray-500">
                Inspect and supervise contests created by hosts across the entire platform.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {contests.length} Contests Total
            </span>
          </div>

          {contests.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold">No contests created yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Contest Name</th>
                    <th className="py-3 px-3">Created By (Host)</th>
                    <th className="py-3 px-3">Questions</th>
                    <th className="py-3 px-3">Submissions</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contests.map((c) => (
                    <tr key={c._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">{c.name}</div>
                        <div className="text-[11px] text-gray-400">
                          Active Till: {c.activeTill?.date || "No deadline"} {c.activeTill?.time || ""}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {c.host ? (
                          <div className="flex items-center gap-2">
                            {c.host.avatar ? (
                              <img
                                src={c.host.avatar}
                                alt="Host"
                                className="w-7 h-7 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                H
                              </div>
                            )}
                            <div>
                              <div className="text-xs text-gray-900 font-semibold flex items-center gap-1.5">
                                <span>{c.host.firstName} {c.host.lastName}</span>
                              </div>
                              {c.host.organizationName && (
                                <div className="text-[10px] text-[#12BAB0] font-bold flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  <span>{c.host.organizationName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">System</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-xs font-semibold text-gray-700">
                        {c.totalQuestions} Questions
                      </td>

                      <td className="py-3 px-3 text-xs font-semibold text-gray-700">
                        {c.totalSubmissions} Submissions
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            c.status === "ongoing"
                              ? "bg-teal-50 text-teal-700 border border-teal-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setItemToDelete({ type: "contest", item: c })}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete contest"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
      {/* TAB 4: ADMIN SECURITY & CREDENTIALS SYNC */}
      {/* ============================================================== */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Super Admin Change Own Password */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Change Your Super Admin Password</h3>
                <p className="text-xs text-gray-500">
                  Update your own Super Admin credentials directly in the MongoDB database.
                </p>
              </div>
            </div>

            <form onSubmit={handleAdminChangeSelfPassword} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  New Super Admin Password
                </label>
                <input
                  type="password"
                  placeholder="Enter new strong password (min 6 chars)"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={changingAdminPassword}
                className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {changingAdminPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Update Password in Database</span>
              </button>
            </form>
          </div>

          {/* Policy & Explanation Card */}
          <div className="bg-gradient-to-br from-[#010B28] to-[#0A2540] rounded-3xl p-6 text-white border border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-[#12BAB0] flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Security & Password Policy</h3>
                <p className="text-xs text-gray-300">Privacy and account safety standards</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-300 leading-relaxed pt-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="font-bold text-white block mb-1">
                  1. Other Users&apos; Passwords Protected
                </span>
                Super Admin cannot reset or view other users&apos; passwords. Users maintain full password privacy and must use the automated Forgot Password / Email OTP flow.
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="font-bold text-white block mb-1">
                  2. Suspend & Reactivate Controls
                </span>
                Super Admin can suspend any user account at will (which automatically terminates all their active sessions), and reactivate them at any time with full access restored.
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="font-bold text-white block mb-1">
                  3. Startup Seeding & Database Persistence
                </span>
                Initial credentials seed from <code className="text-[#12BAB0]">ADMIN_EMAIL</code> and <code className="text-[#12BAB0]">ADMIN_PASSWORD</code> in <code className="text-[#12BAB0]">.env</code>. Once created, changes made in the database or here are never overwritten on server restart.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 7: FEEDBACK & SUPPORT TICKETS */}
      {/* ============================================================== */}
      {activeTab === "support" && (
        <div className="space-y-6">
          {/* Support KPI Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  Total Tickets
                </span>
                <span className="text-2xl font-black text-gray-900">
                  {supportMetrics.total}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm flex items-center gap-3.5 relative overflow-hidden">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
                    Pending
                  </span>
                  {supportMetrics.pending > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  )}
                </div>
                <span className="text-2xl font-black text-amber-600">
                  {supportMetrics.pending}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                  In Progress
                </span>
                <span className="text-2xl font-black text-blue-600">
                  {supportMetrics.inReview}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Resolved
                </span>
                <span className="text-2xl font-black text-emerald-600">
                  {supportMetrics.resolved}
                </span>
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search subject, problem, host or user name/email..."
                  value={supportSearch}
                  onChange={(e) => setSupportSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#12BAB0] focus:ring-1 focus:ring-[#12BAB0] transition-colors"
                />
                {supportSearch && (
                  <button
                    onClick={() => setSupportSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Status Filter */}
                <select
                  value={supportStatusFilter}
                  onChange={(e) => setSupportStatusFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#12BAB0] font-semibold cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_review">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={supportPriorityFilter}
                  onChange={(e) => setSupportPriorityFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#12BAB0] font-semibold cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">🔥 Urgent</option>
                  <option value="high">⚠️ High</option>
                  <option value="medium">⏱️ Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Role Filter */}
                <select
                  value={supportRoleFilter}
                  onChange={(e) => setSupportRoleFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#12BAB0] font-semibold cursor-pointer"
                >
                  <option value="all">All Roles (Hosts & Contestants)</option>
                  <option value="host">👑 Host Organizers</option>
                  <option value="contestant">🎮 Contestants</option>
                </select>

                {/* Category Filter */}
                <select
                  value={supportCategoryFilter}
                  onChange={(e) => setSupportCategoryFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#12BAB0] font-semibold cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="bug">🐛 Bug Report</option>
                  <option value="feature">💡 Feature Request</option>
                  <option value="contest">🏆 Contest Issue</option>
                  <option value="account">🔐 Account / Login</option>
                  <option value="billing">💳 Billing & Payment</option>
                  <option value="other">💬 Other</option>
                </select>

                {/* Reset Filters */}
                {(supportSearch ||
                  supportStatusFilter !== "all" ||
                  supportPriorityFilter !== "all" ||
                  supportRoleFilter !== "all" ||
                  supportCategoryFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSupportSearch("");
                      setSupportStatusFilter("all");
                      setSupportPriorityFilter("all");
                      setSupportRoleFilter("all");
                      setSupportCategoryFilter("all");
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-bold px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Summary */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span>
                Showing <strong>{filteredSupportTickets.length}</strong> of{" "}
                <strong>{supportTickets.length}</strong> inquiries
              </span>
              <button
                onClick={() => loadDashboardData(true)}
                disabled={refreshing}
                className="text-[#12BAB0] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                <span>Refresh Tickets</span>
              </button>
            </div>
          </div>

          {/* Tickets List */}
          {filteredSupportTickets.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 text-[#12BAB0] flex items-center justify-center mx-auto mb-4">
                <LifeBuoy className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                No Support Tickets Found
              </h3>
              <p className="text-gray-500 text-xs max-w-md mx-auto">
                No user inquiries or reports match your selected filters. Switch filters or clear
                your search query to see other tickets.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSupportTickets.map((ticket) => {
                const priorityStyles = {
                  urgent: "bg-red-50 text-red-700 border-red-200 border-l-4 border-l-red-500",
                  high: "bg-orange-50 text-orange-700 border-orange-200 border-l-4 border-l-orange-500",
                  medium: "bg-amber-50 text-amber-700 border-amber-200 border-l-4 border-l-amber-500",
                  low: "bg-slate-50 text-slate-700 border-slate-200 border-l-4 border-l-slate-400",
                };

                const statusBadges = {
                  pending: {
                    label: "Pending Review",
                    className: "bg-amber-50 text-amber-700 border-amber-200",
                    dot: "bg-amber-500 animate-pulse",
                  },
                  in_review: {
                    label: "In Progress",
                    className: "bg-blue-50 text-blue-700 border-blue-200",
                    dot: "bg-blue-500",
                  },
                  resolved: {
                    label: "Resolved",
                    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    dot: "bg-emerald-500",
                  },
                  closed: {
                    label: "Closed",
                    className: "bg-gray-100 text-gray-600 border-gray-200",
                    dot: "bg-gray-400",
                  },
                };

                const currentStatusBadge =
                  statusBadges[ticket.status] || statusBadges.pending;

                const replyDraft =
                  editingTicketReplies[ticket._id] !== undefined
                    ? editingTicketReplies[ticket._id]
                    : ticket.adminResponse || "";

                return (
                  <div
                    key={ticket._id}
                    className={`bg-white rounded-3xl p-6 border shadow-xs transition-all hover:shadow-md ${
                      priorityStyles[ticket.priority] || priorityStyles.medium
                    }`}
                  >
                    {/* Ticket Header & Submitter Info */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                      {/* Left: User Identity */}
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#010B28] to-[#12BAB0] text-white flex items-center justify-center font-black text-sm uppercase shadow-xs shrink-0">
                          {ticket.userName?.charAt(0) || ticket.userEmail?.charAt(0) || "U"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 text-sm">
                              {ticket.userName || "Anonymous User"}
                            </span>
                            {ticket.userRole === "host" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wide">
                                👑 Host Organizer
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                                🎮 Contestant
                              </span>
                            )}

                            {(ticket.user?.organizationName ||
                              ticket.user?.organizationType) && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                                <Building2 className="w-3 h-3 text-[#12BAB0]" />
                                {ticket.user.organizationName || ticket.user.organizationType}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">
                            {ticket.userEmail}
                          </div>
                        </div>
                      </div>

                      {/* Right: Metadata Pills & Delete */}
                      <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
                        {/* Category Badge */}
                        <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200 capitalize">
                          {ticket.category === "bug" && "🐛 Bug"}
                          {ticket.category === "feature" && "💡 Feature"}
                          {ticket.category === "contest" && "🏆 Contest"}
                          {ticket.category === "account" && "🔐 Account"}
                          {ticket.category === "billing" && "💳 Billing"}
                          {ticket.category === "other" && "💬 Other"}
                          {!["bug", "feature", "contest", "account", "billing", "other"].includes(
                            ticket.category
                          ) && ticket.category}
                        </span>

                        {/* Priority Badge */}
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                          {ticket.priority === "urgent" && (
                            <>
                              <Flame className="w-3 h-3 text-red-600" />
                              <span className="text-red-700">Urgent</span>
                            </>
                          )}
                          {ticket.priority === "high" && (
                            <>
                              <AlertTriangle className="w-3 h-3 text-orange-600" />
                              <span className="text-orange-700">High</span>
                            </>
                          )}
                          {ticket.priority === "medium" && (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span className="text-amber-700">Medium</span>
                            </>
                          )}
                          {ticket.priority === "low" && (
                            <span className="text-slate-600">Low</span>
                          )}
                        </span>

                        {/* Status Pill */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${currentStatusBadge.className}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${currentStatusBadge.dot}`}
                          ></span>
                          <span>{currentStatusBadge.label}</span>
                        </span>

                        {/* Created timestamp */}
                        <span className="text-[11px] text-gray-400 font-medium pl-1">
                          {ticket.createdAt
                            ? new Date(ticket.createdAt).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Just now"}
                        </span>

                        {/* Delete Ticket Button */}
                        <button
                          type="button"
                          onClick={() => setTicketToDelete(ticket)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1 cursor-pointer"
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Ticket Subject & Description */}
                    <div className="py-4 space-y-3">
                      <h4 className="text-base font-extrabold text-gray-900 leading-snug">
                        {ticket.subject}
                      </h4>
                      <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 text-xs md:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {ticket.description}
                      </div>

                      {/* Image Attachment Preview */}
                      {ticket.attachmentUrl && (
                        <div className="pt-2">
                          <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-2">
                            <ImageIcon className="w-4 h-4 text-[#12BAB0]" />
                            <span>Attached Screenshot / Evidence:</span>
                          </span>

                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => setSelectedTicketImage(ticket.attachmentUrl)}
                              className="relative group w-36 h-24 rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-900 cursor-pointer shadow-xs hover:border-[#12BAB0] transition-all"
                            >
                              <img
                                src={ticket.attachmentUrl}
                                alt="Attachment"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-bold">
                                <Eye className="w-4 h-4" />
                                <span>Preview</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => setSelectedTicketImage(ticket.attachmentUrl)}
                                className="text-xs text-[#12BAB0] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Enlarge in Lightbox</span>
                              </button>
                              <a
                                href={ticket.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Open full original URL</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Official Admin Response Banner (if already responded) */}
                    {ticket.adminResponse && (
                      <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-200 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Official Admin Resolution & Reply:</span>
                          </span>
                          {ticket.respondedAt && (
                            <span className="text-[11px] text-emerald-700 font-medium">
                              Responded{" "}
                              {new Date(ticket.respondedAt).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-emerald-950 whitespace-pre-wrap leading-relaxed">
                          {ticket.adminResponse}
                        </p>
                      </div>
                    )}

                    {/* Admin Action Bar: Status Toggle & Reply Box */}
                    <div className="pt-4 border-t border-gray-100 space-y-3 bg-gray-50/50 -mx-6 -mb-6 p-6 rounded-b-3xl">
                      {/* Status Selector Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-700">Update Status:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                              { key: "pending", label: "Pending" },
                              { key: "in_review", label: "In Progress" },
                              { key: "resolved", label: "Resolved" },
                              { key: "closed", label: "Closed" },
                            ].map((st) => (
                              <button
                                key={st.key}
                                type="button"
                                disabled={updatingTicketId === ticket._id}
                                onClick={() => handleUpdateTicketStatus(ticket._id, st.key)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  ticket.status === st.key
                                    ? "bg-[#010B28] text-white shadow-2xs"
                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                                }`}
                              >
                                {updatingTicketId === ticket._id && ticket.status === st.key ? (
                                  <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                                ) : null}
                                <span>{st.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Admin Resolution Input Box */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-700">
                          {ticket.adminResponse
                            ? "Edit / Update Official Resolution Message:"
                            : "Write Official Resolution for the User:"}
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Type resolution instructions, explanations, or troubleshooting steps for this user..."
                          value={replyDraft}
                          onChange={(e) =>
                            setEditingTicketReplies((prev) => ({
                              ...prev,
                              [ticket._id]: e.target.value,
                            }))
                          }
                          className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-xs md:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#12BAB0] focus:ring-1 focus:ring-[#12BAB0] transition-colors resize-y"
                        />

                        {/* Submit Action Buttons */}
                        <div className="flex items-center justify-end gap-2.5 pt-1">
                          <button
                            type="button"
                            disabled={savingReplyId === ticket._id}
                            onClick={() => handleSaveTicketReply(ticket._id, false)}
                            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {savingReplyId === ticket._id && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            )}
                            <Send className="w-3 h-3 text-gray-600" />
                            <span>Save Response</span>
                          </button>

                          <button
                            type="button"
                            disabled={savingReplyId === ticket._id}
                            onClick={() => handleSaveTicketReply(ticket._id, true)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                          >
                            {savingReplyId === ticket._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Post Resolution & Mark as Resolved</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SUSPEND / REACTIVATE USER */}
      {/* ============================================================== */}
      {statusModalUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 text-center">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                statusModalUser.nextStatus === "blocked"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {statusModalUser.nextStatus === "blocked" ? (
                <ShieldAlert className="w-7 h-7" />
              ) : (
                <UserCheck className="w-7 h-7" />
              )}
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {statusModalUser.nextStatus === "blocked"
                ? "Suspend User Account?"
                : "Reactivate User Account?"}
            </h3>

            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              {statusModalUser.nextStatus === "blocked" ? (
                <>
                  Are you sure you want to suspend{" "}
                  <strong className="text-gray-900">{statusModalUser.user.email}</strong>?
                  <br />
                  <span className="text-red-500 font-semibold mt-1 block">
                    The user will be immediately logged out and unable to log in until reactivated.
                  </span>
                </>
              ) : (
                <>
                  Are you sure you want to reactivate{" "}
                  <strong className="text-gray-900">{statusModalUser.user.email}</strong>?
                  <br />
                  <span className="text-emerald-600 font-semibold mt-1 block">
                    The user will regain full access to their account and will be able to log in immediately.
                  </span>
                </>
              )}
            </p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setStatusModalUser(null)}
                disabled={updatingStatus}
                className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={updatingStatus}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5 ${
                  statusModalUser.nextStatus === "blocked"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {updatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {statusModalUser.nextStatus === "blocked"
                    ? "Confirm Suspension"
                    : "Confirm Reactivation"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ============================================================== */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Delete {itemToDelete.type === "user" ? "User Account" : "Contest"}?
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              {itemToDelete.type === "user" ? (
                <>
                  Are you sure you want to permanently delete{" "}
                  <strong>{itemToDelete.item.email}</strong>? All associated sessions will be purged.
                </>
              ) : (
                <>
                  Are you sure you want to delete contest{" "}
                  <strong>{itemToDelete.item.name}</strong>?
                </>
              )}
            </p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingItem}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingItem && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Receipt / Invoice Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Payment Invoice & Receipt</h3>
                  <p className="text-[11px] text-gray-500 font-mono">
                    {selectedReceipt.transactionId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="py-5 space-y-4 text-xs">
              {/* Paid Badge & Amount */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Payment Status: Completed
                  </span>
                  <div className="text-2xl font-black text-emerald-600 mt-0.5">
                    ${selectedReceipt.amount}.00 USD
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PAID</span>
                </div>
              </div>

              {/* Beneficiary Card (Admin) */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-950">
                <div className="flex items-center gap-1.5 font-bold text-[11px] mb-1">
                  <span>👑 Credited Super Admin Account:</span>
                </div>
                <div className="font-semibold text-xs text-purple-900">
                  {selectedReceipt.recipientEmail || "admin@fantsy.com"}
                </div>
                <p className="text-[10px] text-purple-700 mt-0.5">
                  Subscription revenue transferred directly to the master platform administrator.
                </p>
              </div>

              {/* Details List */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2.5">
                <div className="flex justify-between text-gray-600">
                  <span>Payer (Host):</span>
                  <span className="font-bold text-gray-900">{selectedReceipt.hostName || "Host"}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Host Email:</span>
                  <span className="font-mono text-gray-800">{selectedReceipt.hostEmail}</span>
                </div>
                {selectedReceipt.organizationName && (
                  <div className="flex justify-between text-gray-600">
                    <span>Host Organization:</span>
                    <span className="font-semibold text-gray-900">{selectedReceipt.organizationName}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Subscription Plan:</span>
                  <span className="font-bold text-teal-800 uppercase tracking-wide">
                    {selectedReceipt.plan === "yearly" ? "Annual Pro (365 Days)" : "Monthly Pro (30 Days)"}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Payment Card:</span>
                  <span className="font-mono text-gray-800">
                    {selectedReceipt.card?.brand || "Card"} ending in {selectedReceipt.card?.last4 || "4242"}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Transaction Date:</span>
                  <span className="text-gray-800 font-medium">
                    {selectedReceipt.createdAt ? new Date(selectedReceipt.createdAt).toLocaleString() : "Today"}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Plan Active Until:</span>
                  <span className="text-emerald-700 font-bold">
                    {selectedReceipt.validUntil ? new Date(selectedReceipt.validUntil).toLocaleDateString() : "Active"}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-5 py-2.5 rounded-xl bg-[#010B28] hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SUPPORT TICKET IMAGE LIGHTBOX */}
      {/* ============================================================== */}
      {selectedTicketImage && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedTicketImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="text-xs font-bold tracking-wide flex items-center gap-1.5 text-gray-200">
                <ImageIcon className="w-4 h-4 text-[#12BAB0]" />
                <span>Attached Screenshot Preview</span>
              </span>

              <div className="flex items-center gap-2">
                <a
                  href={selectedTicketImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Size</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedTicketImage(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Container */}
            <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black max-h-[80vh] flex items-center justify-center">
              <img
                src={selectedTicketImage}
                alt="Support Ticket Attachment"
                className="max-h-[80vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DELETE SUPPORT TICKET CONFIRMATION */}
      {/* ============================================================== */}
      {ticketToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Delete Support Ticket?
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Are you sure you want to delete inquiry{" "}
              <strong className="text-gray-900">&quot;{ticketToDelete.subject}&quot;</strong> submitted
              by <strong>{ticketToDelete.userEmail}</strong>? This action cannot be undone.
            </p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setTicketToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTicket}
                disabled={deletingTicket}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingTicket && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
