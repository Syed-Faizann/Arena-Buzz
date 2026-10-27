"use client";
import React, { useState, useEffect } from "react";
import banner from "../../assets/banner.jpg";
import Image from "next/image";
import OnoingQuestions from "../OnoingQuestions";
import { getContests, updateContest, deleteContest } from "../../services/api";
import {
  ChevronDown,
  Plus,
  Loader2,
  Edit3,
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
  X,
  CheckCircle2,
  Save,
  AlertCircle,
  Eye,
} from "lucide-react";
import DeadlinePicker from "../DeadlinePicker";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { isContestExpired, hasUserSubmittedContest } from "../../services/contestUtils";

function formatContestDateRange(startDate, activeTill) {
  const formatPart = (d) => {
    if (!d) return "";
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return "";
    const yy = String(dateObj.getFullYear()).slice(-2);
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    return `${yy}/${mm}/${dd}`;
  };

  const start = formatPart(startDate) || "23/06/01";
  const end = activeTill?.date
    ? formatPart(activeTill.date) || activeTill.date
    : "23/07/01";

  return `${start} - ${end}`;
}

const Ongoing = ({
  contests: propContests,
  allContestsCount = 0,
  onRefresh,
  onSwitchToArchived,
  onOpenJoinModal,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;
  const isHost = user?.userType === "host";

  const [contests, setContests] = useState(propContests || []);
  const [loading, setLoading] = useState(!propContests);
  const [expandedContestId, setExpandedContestId] = useState(null);
  const [hostFilter, setHostFilter] = useState("all"); // "all" | "mine"

  // Edit Contest State (Name & Time)
  const [editingContest, setEditingContest] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    activeTill: { date: "", time: "" },
    startDate: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Whole Contest State
  const [deletingContest, setDeletingContest] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
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
    setEditForm({
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
    if (!editForm.name.trim()) {
      showToast("error", "Contest title/name cannot be empty.");
      return;
    }

    try {
      setIsSavingEdit(true);
      const updates = {
        name: editForm.name.trim(),
        activeTill: editForm.activeTill,
      };
      if (editForm.startDate) {
        updates.startDate = new Date(editForm.startDate);
      }

      const res = await updateContest(editingContest._id, updates);
      const updated = res?.contest;

      setContests((prev) =>
        prev.map((c) =>
          c._id === editingContest._id
            ? {
                ...c,
                ...(updated || updates),
                activeTill: editForm.activeTill,
                name: editForm.name.trim(),
              }
            : c
        )
      );

      showToast("success", "Contest name and time updated successfully!");
      setEditingContest(null);
      onRefresh?.();
    } catch (err) {
      console.error("Failed to update contest:", err);
      showToast("error", err.message || "Failed to update contest details");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDeleteContest = async () => {
    if (!deletingContest) return;
    try {
      setIsDeleting(true);
      await deleteContest(deletingContest._id);
      setContests((prev) => prev.filter((c) => c._id !== deletingContest._id));
      if (expandedContestId === deletingContest._id) {
        setExpandedContestId(null);
      }
      showToast("success", `Contest "${deletingContest.name}" was deleted successfully.`);
      setDeletingContest(null);
      onRefresh?.();
    } catch (err) {
      console.error("Failed to delete contest:", err);
      showToast("error", err.message || "Failed to delete contest");
    } finally {
      setIsDeleting(false);
    }
  };

  const isContestPostedByMe = (c) => {
    if (!c || !currentUserId) return false;
    const contestHostId = (c.host?._id || c.host)?.toString();
    const currentUserIdStr = currentUserId.toString();
    return Boolean(
      contestHostId && currentUserIdStr && contestHostId === currentUserIdStr
    );
  };

  const myPostedContests = contests.filter((c) => isContestPostedByMe(c));
  const myPostedCount = myPostedContests.length;

  const displayContests = contests.filter((c) => {
    if (isHost && hostFilter === "mine") {
      return isContestPostedByMe(c);
    }
    return true;
  });

  const fetchContests = async () => {
    try {
      setLoading(true);
      const data = await getContests();
      if (data && Array.isArray(data.contests)) {
        const ongoingList = data.contests.filter((c) => {
          if (c.status === "archived") return false;
          if (isContestExpired(c.activeTill)) return false;
          if (!isHost && hasUserSubmittedContest(c, currentUserId)) return false;
          return true;
        });

        setContests(ongoingList);
      }
    } catch (err) {
      console.error("Error fetching ongoing contests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propContests) {
      setContests(propContests);
      setLoading(false);
    } else {
      fetchContests();
    }
  }, [propContests, currentUserId]);

  const handleToggleContest = (id) => {
    setExpandedContestId((prev) => (prev === id ? null : id));
  };

  const handleQuestionsUpdated = (contestId, updatedQuestions) => {
    setContests((prev) =>
      prev.map((c) =>
        c._id === contestId ? { ...c, questions: updatedQuestions } : c
      )
    );
    onRefresh?.();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[#12BAB0]">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <p className="text-sm text-gray-500 font-medium">Loading contests...</p>
      </div>
    );
  }

  // If no ongoing contests available
  if (contests.length === 0) {
    if (allContestsCount > 0) {
      return (
        <div className="bg-[#F0F0F3] rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-6 border border-gray-200 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-teal-100 text-[#12BAB0] flex items-center justify-center mx-auto mb-4">
            🎉
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            You&apos;re All Caught Up!
          </h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            You have already completed the active contests from your enrolled institutes! Check the Archived tab to review your scores, detailed answers, and community rankings.
          </p>
          {onSwitchToArchived && (
            <button
              onClick={onSwitchToArchived}
              className="px-6 py-2.5 bg-[#010B28] hover:bg-[#12BAB0] text-white rounded-full text-sm font-bold transition-colors cursor-pointer shadow-sm"
            >
              View Completed in Archived 🏆
            </button>
          )}
        </div>
      );
    }

    if (isHost) {
      return (
        <div className="bg-[#F0F0F3] rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-6 border border-gray-200 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-teal-100 text-[#12BAB0] flex items-center justify-center mx-auto mb-4">
            🏆
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            No Contests Posted by You Yet
          </h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            You haven&apos;t published any contests for your organization yet. Create your first contest so your enrolled students can participate.
          </p>
          <Link href="/dashboard/create">
            <button className="px-6 py-2.5 bg-[#12BAB0] hover:bg-[#0ea89b] text-white rounded-full text-sm font-bold transition-colors cursor-pointer shadow-sm inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create New Contest
            </button>
          </Link>
        </div>
      );
    }

    // Default contestant view: No contests from joined institutes
    return (
      <div className="bg-[#F0F0F3] rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-6 border border-gray-200 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-teal-100 text-[#12BAB0] flex items-center justify-center mx-auto mb-4">
          🏛️
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          No Contests Available from Your Institutes
        </h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto mb-6 leading-relaxed">
          Contests on this platform are hosted privately by institutes, colleges, and schools. Only enrolled contestants can see and attempt contests. Join your institute using the invite code from your host to unlock contests.
        </p>
        {onOpenJoinModal && (
          <button
            onClick={onOpenJoinModal}
            className="px-6 py-2.5 bg-[#010B28] hover:bg-[#12BAB0] text-white rounded-full text-sm font-bold transition-colors cursor-pointer shadow-sm inline-flex items-center gap-2"
          >
            Join Institute via Invite Code 🔑
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Host filter options: All Ongoing vs Posted by Me */}
      {isHost && contests.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white/90 p-2.5 px-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
              Host View:
            </span>

            <button
              onClick={() => setHostFilter("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                hostFilter === "all"
                  ? "bg-[#010B28] text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black"
              }`}
            >
              All Ongoing
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  hostFilter === "all"
                    ? "bg-white/20 text-white"
                    : "bg-white text-gray-700 border border-gray-200"
                }`}
              >
                {contests.length}
              </span>
            </button>

            <button
              onClick={() => setHostFilter("mine")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                hostFilter === "mine"
                  ? "bg-[#12BAB0] text-white shadow-xs"
                  : "bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100"
              }`}
            >
              <span>👑</span>
              Posted by Me
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  hostFilter === "mine"
                    ? "bg-white/20 text-white"
                    : "bg-white text-teal-800 border border-teal-300"
                }`}
              >
                {myPostedCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            {hostFilter === "mine" ? (
              <span className="inline-flex items-center gap-1 text-teal-700 font-semibold bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                👑 Showing only contests you posted for quick editing
              </span>
            ) : (
              <span>Showing all ongoing contests ({contests.length})</span>
            )}
          </div>
        </div>
      )}

      {/* When filtering by 'Posted by Me' and host has no posted ongoing contests */}
      {displayContests.length === 0 ? (
        <div className="bg-[#F0F0F3] rounded-3xl p-8 sm:p-10 text-center max-w-xl mx-auto my-6 border border-gray-200 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-[#12BAB0] flex items-center justify-center mx-auto mb-3 text-2xl">
            👑
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1.5">
            No Contests Posted by You Yet
          </h3>
          <p className="text-gray-500 text-xs sm:text-sm max-w-md mx-auto mb-5">
            You have not posted any active ongoing contests yet. Create one now to manage questions and host quizzes!
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setHostFilter("all")}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              View All Ongoing ({contests.length})
            </button>
            <Link
              href="/dashboard/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#12BAB0] hover:bg-[#0fa89f] text-white rounded-full text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Create New Contest
            </Link>
          </div>
        </div>
      ) : (
        displayContests.map((contest) => {
          const isExpanded = expandedContestId === contest._id;
          const dateRangeText = formatContestDateRange(
            contest.startDate || contest.createdAt,
            contest.activeTill
          );
          const contestHostId = (contest?.host?._id || contest?.host)?.toString();
          const currentUserIdStr = currentUserId?.toString();

          // ONLY the host who created this contest (or superadmin) can edit questions!
          const isCreatorHost = Boolean(
            contestHostId &&
            currentUserIdStr &&
            contestHostId === currentUserIdStr
          );
          const isSuperAdmin = user?.userType === "superadmin";
          const canEditQuiz = isCreatorHost || isSuperAdmin;

          return (
            <div key={contest._id} className="mb-6">
              {/* Contest Bar: Hosts click to expand and edit quiz; Contestants click to Take Test */}
              <div
                onClick={() => {
                  if (canEditQuiz) {
                    handleToggleContest(contest._id);
                  } else {
                    router.push(`/dashboard/contest/${contest._id}`);
                  }
                }}
                className={`bg-[#F0F0F3] rounded-2xl shadow-sm flex flex-col md:flex-row justify-between overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer border ${
                  isExpanded && canEditQuiz
                    ? "border-[#12BAB0]/50 ring-1 ring-[#12BAB0]/30"
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                <div className="p-4 md:p-6 flex-1 flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                    <div className="flex flex-col w-full sm:w-auto">
                      <h2 className="text-base items-center md:text-lg flex flex-wrap gap-1 sm:gap-2 text-[#282828]">
                        <span className="text-lg sm:text-xl md:text-2xl font-bold whitespace-nowrap">
                          {contest.name}
                        </span>
                        <span className="text-[11px] sm:text-base md:text-xl text-[#4C4D4E]">
                          | {dateRangeText}
                        </span>
                        {(contest.organizationName || contest.host?.organizationName) && (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-teal-50 text-teal-800 font-bold px-2.5 py-0.5 rounded-full border border-teal-200 ml-1">
                            🏛️ {contest.organizationName || contest.host?.organizationName}
                            {(contest.organizationType || contest.host?.organizationType) && (
                              <span className="text-[10px] uppercase font-extrabold text-[#12BAB0]">
                                ({contest.organizationType || contest.host?.organizationType})
                              </span>
                            )}
                          </span>
                        )}
                        {isCreatorHost ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-teal-100 text-teal-800 font-bold px-2.5 py-0.5 rounded-full border border-teal-300 ml-1">
                            👑 Posted by You
                          </span>
                        ) : isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full border border-purple-300 ml-1">
                            🛡️ Super Admin Controls
                          </span>
                        ) : null}
                      </h2>
                    </div>
                    <div className="hidden sm:block flex-1"></div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm sm:text-base md:text-xl text-[#4C4D4E] whitespace-nowrap">
                        {contest.activeTill?.time
                          ? `Till ${contest.activeTill.time}`
                          : "Second timer"}
                      </span>

                      {/* Hosts get the dropdown Chevron */}
                      {canEditQuiz && (
                        <ChevronDown
                          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                            isExpanded ? "rotate-180 text-[#12BAB0]" : ""
                          }`}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 gap-2 flex-wrap">
                    <p className="text-[#222222] md:text-base text-[13px]">
                      {contest.questions?.length || 0} Questions{" "}
                      {isCreatorHost
                        ? isExpanded
                          ? "• Editing questions below"
                          : "• Host Creator Mode (Attempt Disabled)"
                        : canEditQuiz
                        ? "• Admin Oversight Mode"
                        : "• Click to take test"}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      {canEditQuiz && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditContest(contest);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer bg-white text-gray-800 border border-gray-300 hover:bg-gray-100 hover:border-gray-400"
                            title="Edit Contest Name and Active Time"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#12BAB0]" />
                            <span>Edit Contest</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingContest(contest);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                            title="Delete this entire contest"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleContest(contest._id);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                              isExpanded
                                ? "bg-gray-800 text-white hover:bg-black"
                                : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-100"
                            }`}
                          >
                            {isExpanded ? "Close Questions ✕" : "Questions 📋"}
                          </button>
                        </>
                      )}

                      {isCreatorHost ? (
                        <Link
                          href={`/dashboard/contest/${contest._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-900 text-slate-100 text-xs font-bold transition-all shadow-xs flex-shrink-0"
                          title="Host Creator Preview Mode - Attempt is disabled"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#12BAB0]" />
                          <span>Preview Quiz 👁️</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/dashboard/contest/${contest._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#12BAB0] hover:bg-[#0fa89f] text-white text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer flex-shrink-0"
                        >
                          Take Test 🚀
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contest Banner Thumbnail */}
                <div className="relative w-full md:w-[233px] h-[140px] sm:h-[160px] md:min-h-[160px] bg-gray-200 flex-shrink-0">
                  {contest.image ? (
                    <img
                      src={contest.image}
                      alt={contest.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={banner}
                      alt={contest.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, 233px"
                      priority={false}
                    />
                  )}
                </div>
              </div>

              {/* Questions of this contest shown to host for editing */}
              {isExpanded && canEditQuiz && (
                <div className="mt-4 pl-0 sm:pl-2">
                  {/* Host Quick Control Bar inside expanded questions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 mb-3 bg-white rounded-2xl border border-gray-200 text-xs shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">Contest: {contest.name}</span>
                      <span className="text-gray-500">
                        · Till {contest.activeTill?.time || "No time"} ({contest.activeTill?.date || "No date"})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenEditContest(contest)}
                        className="inline-flex items-center gap-1 text-[#12BAB0] font-bold hover:underline cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Name & Time
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => setDeletingContest(contest)}
                        className="inline-flex items-center gap-1 text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Whole Contest
                      </button>
                    </div>
                  </div>

                  <OnoingQuestions
                    contestId={contest._id}
                    questions={contest.questions || []}
                    canEdit={true}
                    onQuestionsChange={(updatedQuestions) =>
                      handleQuestionsUpdated(contest._id, updatedQuestions)
                    }
                  />
                </div>
              )}
            </div>
          );
        })
      )}

      {/* ============================================================== */}
      {/* MODAL 1: EDIT CONTEST NAME & TIME                              */}
      {/* ============================================================== */}
      {editingContest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 text-gray-900">
            {/* Header */}
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
                disabled={isSavingEdit}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditContest} className="space-y-4">
              {/* Contest Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Contest Name / Title*
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Weekly Tech Quiz, Midterm Challenge"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] focus:border-transparent text-sm text-gray-900 font-medium"
                />
              </div>

              {/* Contest Active Till (Date & Time) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Active Till (Deadline Date & Time)*
                </label>
                <DeadlinePicker
                  value={editForm.activeTill}
                  onChange={(val) => setEditForm((prev) => ({ ...prev, activeTill: val }))}
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Start Date (Optional)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-sm text-gray-900"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingContest(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl bg-[#12BAB0] hover:bg-[#0ea89b] text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? (
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
      {/* MODAL 2: CONFIRM DELETE WHOLE CONTEST                          */}
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

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2 mb-6">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                All {deletingContest.questions?.length || 0} questions inside this contest will be permanently removed.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingContest(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteContest}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
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

      {/* ============================================================== */}
      {/* FLOATING TOAST NOTIFICATION                                    */}
      {/* ============================================================== */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold animate-in slide-in-from-bottom duration-200 ${
            toast.type === "success"
              ? "bg-slate-900 text-emerald-400 border-emerald-500/30"
              : "bg-slate-900 text-rose-400 border-rose-500/30"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Ongoing;
