"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Trophy,
  LifeBuoy,
  CheckCircle2,
  Clock,
  Trash2,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Building2,
  ChevronRight,
  Shield,
  Filter,
  Check,
  X,
  Loader2,
  Layers,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../../services/api";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "unread" | "contest" | "support"
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', text: '' }

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch notifications from backend
  const fetchNotifications = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getUserNotifications(activeTab);
      if (res) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount ?? 0);
        setTotalCount(res.totalCount ?? (res.notifications || []).length);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      showToast("error", err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchNotifications();
    }
  }, [authLoading, user, activeTab]);

  // Mark single as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      setActionLoadingId(id);
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      showToast("success", "Marked as read");
    } catch (err) {
      showToast("error", err.message || "Failed to mark as read");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      setRefreshing(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      showToast("success", "All notifications marked as read!");
    } catch (err) {
      showToast("error", err.message || "Failed to mark all as read");
    } finally {
      setRefreshing(false);
    }
  };

  // Delete single notification
  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      setActionLoadingId(id);
      await deleteNotification(id);
      const target = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (target && !target.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setTotalCount((c) => Math.max(0, c - 1));
      showToast("success", "Notification removed");
    } catch (err) {
      showToast("error", err.message || "Failed to delete notification");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    try {
      setClearing(true);
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      setTotalCount(0);
      setShowClearModal(false);
      showToast("success", "All notifications have been cleared");
    } catch (err) {
      showToast("error", err.message || "Failed to clear notifications");
    } finally {
      setClearing(false);
    }
  };

  // Compute breakdown counts
  const contestCount = useMemo(
    () => notifications.filter((n) => n.type === "new_contest").length,
    [notifications]
  );
  const supportCount = useMemo(
    () =>
      notifications.filter(
        (n) => n.type === "support_resolved" || n.type === "support_update"
      ).length,
    [notifications]
  );

  // Time formatter
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Just now";
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
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
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#12BAB0]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#12BAB0]/20 text-[#12BAB0] border border-[#12BAB0]/40">
                <Bell className="w-3.5 h-3.5" />
                In-App Notification Feed
              </span>
              {unreadCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  {unreadCount} Unread
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Check className="w-3 h-3" /> All Caught Up
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              Notification Center
            </h1>
            <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-xl">
              Get notified immediately when your organization posts new contests or when Super Admin
              resolves your feedback inquiries.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={refreshing}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark All Read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-full text-xs font-bold transition-all border border-white/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-gray-300" />
                <span>Clear All</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fetchNotifications(true)}
              disabled={refreshing}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 cursor-pointer disabled:opacity-50"
              title="Refresh notifications"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#12BAB0]" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
              Total Feed
            </span>
            <span className="text-2xl font-black text-gray-900">{totalCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
              Unread
            </span>
            <span className="text-2xl font-black text-amber-600">{unreadCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 block">
              Contest Posts
            </span>
            <span className="text-2xl font-black text-orange-600">{contestCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-[#12BAB0] flex items-center justify-center shrink-0">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 block">
              Resolutions
            </span>
            <span className="text-2xl font-black text-teal-700">{supportCount}</span>
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs md:text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "all"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>All Notifications</span>
          <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-full font-bold text-gray-600">
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("unread")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs md:text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "unread"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <Bell className="w-4 h-4 text-amber-500" />
          <span>Unread Only</span>
          {unreadCount > 0 ? (
            <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
              {unreadCount}
            </span>
          ) : (
            <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
              0
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("contest")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs md:text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "contest"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <Trophy className="w-4 h-4 text-orange-500" />
          <span>Contest Announcements</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("support")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs md:text-sm rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "support"
              ? "text-[#010B28] border-b-2 border-[#12BAB0] bg-white shadow-2xs"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
          }`}
        >
          <LifeBuoy className="w-4 h-4 text-[#12BAB0]" />
          <span>Support & Resolutions</span>
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#12BAB0]" />
          <p className="text-gray-500 text-xs font-semibold">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 text-[#12BAB0] flex items-center justify-center mx-auto mb-2">
            {activeTab === "contest" ? (
              <Trophy className="w-8 h-8 text-orange-500" />
            ) : activeTab === "support" ? (
              <LifeBuoy className="w-8 h-8 text-[#12BAB0]" />
            ) : (
              <Inbox className="w-8 h-8" />
            )}
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {activeTab === "unread"
              ? "No Unread Notifications"
              : activeTab === "contest"
              ? "No Contest Announcements Yet"
              : activeTab === "support"
              ? "No Support Updates Yet"
              : "You're All Caught Up!"}
          </h3>
          <p className="text-gray-500 text-xs max-w-md mx-auto">
            {activeTab === "unread"
              ? "You have acknowledged all your messages. Switch to 'All Notifications' to view past alerts."
              : activeTab === "contest"
              ? "When a host organization you belong to creates a new contest, you'll receive an instant alert here."
              : activeTab === "support"
              ? "When Super Admin reviews or resolves your feedback tickets, resolution details will appear right here."
              : "There are no notifications in your feed right now. As activity happens, updates will arrive automatically."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => {
            const isContest = item.type === "new_contest";
            const isSupportResolved = item.type === "support_resolved";
            const isSupportUpdate = item.type === "support_update";
            const isUnread = !item.read;

            return (
              <div
                key={item._id}
                className={`relative rounded-3xl p-5 border transition-all duration-200 group ${
                  isUnread
                    ? "bg-gradient-to-r from-teal-50/70 via-white to-white border-teal-200/90 shadow-sm"
                    : "bg-white hover:bg-gray-50/70 border-gray-100 shadow-2xs"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Left Icon Badge */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                      isContest
                        ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                        : isSupportResolved
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                        : isSupportUpdate
                        ? "bg-gradient-to-br from-teal-400 to-cyan-600 text-white"
                        : "bg-gradient-to-br from-purple-500 to-[#010B28] text-white"
                    }`}
                  >
                    {isContest ? (
                      <Trophy className="w-6 h-6" />
                    ) : isSupportResolved ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : isSupportUpdate ? (
                      <LifeBuoy className="w-6 h-6" />
                    ) : (
                      <Sparkles className="w-6 h-6" />
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Type Tag */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isContest
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : isSupportResolved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isSupportUpdate
                              ? "bg-teal-50 text-teal-700 border-teal-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {isContest && "🏆 Contest Announced"}
                          {isSupportResolved && "✅ Issue Resolved"}
                          {isSupportUpdate && "💬 Support Update"}
                          {!isContest && !isSupportResolved && !isSupportUpdate && "📢 Platform"}
                        </span>

                        {/* Sender info */}
                        {item.sender?.organizationName && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600">
                            <Building2 className="w-3 h-3 text-[#12BAB0]" />
                            {item.sender.organizationName}
                          </span>
                        )}

                        {/* Unread dot */}
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-[#12BAB0] ring-4 ring-teal-100 shrink-0"></span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`text-sm md:text-base leading-snug ${isUnread ? "font-black text-gray-950" : "font-bold text-gray-800"}`}>
                      {item.title}
                    </h3>

                    {/* Message Box */}
                    <p className="text-xs md:text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {item.message}
                    </p>

                    {/* Actions Row */}
                    <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                      {/* Destination CTA Button */}
                      {item.link ? (
                        <Link
                          href={item.link}
                          onClick={() => {
                            if (isUnread) handleMarkAsRead(item._id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#010B28] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <span>{isContest ? "Go to Contests" : "View Support Ticket"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <div></div>
                      )}

                      {/* Right Item Actions: Toggle read & Delete */}
                      <div className="flex items-center gap-1 text-gray-400">
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(item._id, e)}
                            disabled={actionLoadingId === item._id}
                            className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Mark read</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium px-2 py-1">
                            Read
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDelete(item._id, e)}
                          disabled={actionLoadingId === item._id}
                          className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Clear All Notifications?
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Are you sure you want to delete all {totalCount} notifications from your feed? This
              action cannot be undone.
            </p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearing}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {clearing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Clear All</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
