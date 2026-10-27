"use client";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  BarChart3,
  Users,
  Award,
  Sparkles,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Check,
  ExternalLink,
  Timer,
  Lock,
  KeyRound,
  Building2,
  ShieldAlert,
} from "lucide-react";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
import Link from "next/link";
import { getContestById, submitWholeContest, getContestResults, joinOrganizationByCode } from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";
import { isContestExpired } from "../../../services/contestUtils";
import banner from "../../../assets/banner.jpg";
import Image from "next/image";

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

    return `${days}d : ${hours}h : ${mins}m left`;
  } catch {
    return activeTill.date || "Active";
  }
}

export default function ContestPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restrictedInfo, setRestrictedInfo] = useState(null);
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockFeedback, setUnlockFeedback] = useState(null);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionId]: selectedOption }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResults, setSubmissionResults] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Fetch contest details & prior submission (if any)
  async function loadContestData() {
    try {
      setLoading(true);
      setRestrictedInfo(null);

      let contestData = null;
      try {
        contestData = await getContestById(id);
      } catch (err) {
        if (
          err.status === 403 ||
          err.data?.restricted ||
          (err.message && err.message.toLowerCase().includes("access denied"))
        ) {
          setRestrictedInfo({
            message:
              err.data?.message ||
              err.message ||
              "Access denied. This contest is exclusively for contestants who joined this institute.",
            instituteName: err.data?.instituteName || "",
            inviteCode: err.data?.inviteCode || "",
          });
          setLoading(false);
          return;
        }
        console.error("Contest fetch error:", err);
      }

      const resultsData = await getContestResults(id).catch(() => null);

      if (contestData && contestData.contest) {
        setContest(contestData.contest);
      }

      // If the contestant already completed this contest earlier, display their results directly!
      if (resultsData && resultsData.userSubmission) {
        setSubmissionResults({
          score: resultsData.userSubmission.score,
          totalQuestions: resultsData.userSubmission.totalQuestions,
          percentage: resultsData.userSubmission.percentage,
          averageScore: resultsData.averageScore,
          totalContestants: resultsData.contest?.totalContestants || 1,
          breakdown: resultsData.userSubmission.breakdown,
        });
      } else if (contestData && contestData.contest) {
        const curUserId = user?._id || user?.id;
        const existingSub = (contestData.contest.submissions || []).find(
          (s) => (s.userId?._id || s.userId)?.toString() === curUserId?.toString()
        );
        if (existingSub) {
          const breakdown = (contestData.contest.questions || []).map((q, idx) => {
            const qIdStr = q._id?.toString() || String(idx);
            const chosen = (existingSub.answers && existingSub.answers[qIdStr]) || "";
            const expected = q.correctAnswer || (q.options && q.options[0]) || "";
            return {
              questionId: qIdStr,
              question: q.question,
              options: q.options,
              chosenOption: chosen,
              correctAnswer: expected,
              isCorrect: Boolean(chosen && chosen.trim() === expected.trim()),
              source: q.source || "",
            };
          });
          setSubmissionResults({
            score: existingSub.score,
            totalQuestions: existingSub.totalQuestions || contestData.contest.questions.length,
            percentage: existingSub.percentage,
            averageScore: existingSub.percentage,
            totalContestants: (contestData.contest.submissions || []).length || 1,
            breakdown,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load contest:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadContestData();
    }
  }, [id]);

  const handleUnlockAndJoin = async (e) => {
    e?.preventDefault();
    if (!unlockCode.trim()) return;
    try {
      setUnlockLoading(true);
      setUnlockFeedback(null);
      const res = await joinOrganizationByCode(unlockCode.trim().toUpperCase());
      setUnlockFeedback({
        type: "success",
        text: res.message || "Successfully joined institute! Unlocking contest...",
      });
      setTimeout(() => {
        loadContestData();
      }, 1000);
    } catch (err) {
      setUnlockFeedback({
        type: "error",
        text: err.message || "Invalid invite code. Could not join institute.",
      });
    } finally {
      setUnlockLoading(false);
    }
  };

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timeUpAlert, setTimeUpAlert] = useState(false);
  const timerRef = useRef(null);

  // submittedAnswers stores explicitly submitted answers: { [qId]: optionString }
  // Questions that expire without being submitted are recorded as "" (0 points / timed out)
  const [submittedAnswers, setSubmittedAnswers] = useState({});

  const isExpired = contest
    ? isContestExpired(contest.activeTill) || contest.status === "archived"
    : false;

  const curUserId = (user?._id || user?.id)?.toString();
  const contestHostIdStr = (contest?.host?._id || contest?.host)?.toString();
  const isHostCreator = Boolean(
    curUserId && contestHostIdStr && contestHostIdStr === curUserId
  );

  const questions = contest?.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex];
  const currentQIdStr = currentQuestion?._id?.toString() || String(currentQuestionIndex);
  const qDuration = currentQuestion?.timer ? Number(currentQuestion.timer) : 30;

  const hasSubmittedRef = useRef(false);
  const answersRef = useRef({ submittedAnswers, userAnswers, currentQIdStr, questions });

  useEffect(() => {
    answersRef.current = { submittedAnswers, userAnswers, currentQIdStr, questions };
  }, [submittedAnswers, userAnswers, currentQIdStr, questions]);

  useEffect(() => {
    if (submissionResults) {
      hasSubmittedRef.current = true;
    }
  }, [submissionResults]);

  const handleSubmitContest = async (finalAnswers) => {
    if (isExpired) {
      alert("This contest has expired and can no longer be submitted or re-attempted.");
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setShowConfirmModal(false);
    setShowLeaveModal(false);
    hasSubmittedRef.current = true;

    const answersToSubmit = finalAnswers || submittedAnswers;

    try {
      setIsSubmitting(true);
      const cleanAnswers = {};
      questions.forEach((q, idx) => {
        const qId = q._id?.toString() || String(idx);
        cleanAnswers[qId] = answersToSubmit[qId] || "";
      });

      let res = null;
      try {
        res = await submitWholeContest(id, cleanAnswers);
      } catch (submitErr) {
        if (
          submitErr.status === 403 ||
          submitErr.data?.restricted ||
          (submitErr.message && submitErr.message.toLowerCase().includes("access denied"))
        ) {
          alert(
            submitErr.message ||
              "Access denied. You must join this institute to attempt or submit this contest."
          );
          setIsSubmitting(false);
          return;
        }
        if (submitErr.status === 400 && submitErr.data?.submission) {
          res = submitErr.data.submission;
        }
        console.warn("Backend submitWholeContest encountered an issue, compiling local results:", submitErr);
      }

      if (res && res.score !== undefined) {
        setSubmissionResults(res);
      } else {
        // Guaranteed local grading fallback so results screen ALWAYS displays
        let score = 0;
        const breakdown = questions.map((q, idx) => {
          const qId = q._id?.toString() || String(idx);
          const chosen = cleanAnswers[qId] || "";
          const expected = q.correctAnswer || (q.options && q.options[0]) || "";
          const isCorrect = Boolean(chosen && chosen.trim() === expected.trim());
          if (isCorrect) score++;
          return {
            questionId: qId,
            question: q.question,
            options: q.options,
            chosenOption: chosen,
            correctAnswer: expected,
            isCorrect,
            source: q.source || "",
          };
        });

        const total = questions.length;
        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
        setSubmissionResults({
          score,
          totalQuestions: total,
          percentage,
          averageScore: percentage,
          totalContestants: 1,
          breakdown,
        });
      }

      try {
        const curId = user?._id || user?.id || "guest";
        localStorage.setItem(`fantasy_submitted_contest_${id}_${curId}`, "true");
      } catch (e) {
        console.error("Failed to save submission flag to localStorage", e);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Submit whole contest error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmLeaveAndSubmit = async () => {
    setShowLeaveModal(false);
    hasSubmittedRef.current = true;

    const userChoice = userAnswers[currentQIdStr];
    const selectedOption =
      userChoice && typeof userChoice === "object" ? userChoice.option : userChoice || "";

    const updated = {
      ...submittedAnswers,
    };
    if (selectedOption) {
      updated[currentQIdStr] = selectedOption;
    }

    await handleSubmitContest(updated);
  };

  // Intercept leaving the page (beforeunload, pagehide, and browser back) - contestants only
  useEffect(() => {
    const isTestActive = !submissionResults && !isExpired && !isHostCreator && contest && questions.length > 0;
    if (!isTestActive) return;

    window.history.pushState({ testActive: true }, "");

    const handleBeforeUnload = (e) => {
      if (hasSubmittedRef.current) return;
      e.preventDefault();
      e.returnValue =
        "Warning: If you leave now, your quiz will be submitted immediately. Answered questions will be graded and pending questions will be marked 0. You cannot retake this test.";
      return e.returnValue;
    };

    const handlePageHide = () => {
      if (hasSubmittedRef.current) return;
      hasSubmittedRef.current = true;

      const {
        submittedAnswers: subAns,
        userAnswers: uAns,
        currentQIdStr: qIdStr,
        questions: qs,
      } = answersRef.current;

      const currentChoice = uAns[qIdStr];
      const currentSelected =
        currentChoice && typeof currentChoice === "object"
          ? currentChoice.option
          : currentChoice || "";

      const finalAnswers = { ...subAns };
      if (currentSelected) {
        finalAnswers[qIdStr] = currentSelected;
      }

      const cleanAnswers = {};
      qs.forEach((q, idx) => {
        const qId = q._id?.toString() || String(idx);
        cleanAnswers[qId] = finalAnswers[qId] || "";
      });

      const curId = user?._id || user?.id || "guest";
      try {
        localStorage.setItem(`fantasy_submitted_contest_${id}_${curId}`, "true");
      } catch (e) {}

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      try {
        fetch(`${API_URL}/api/contests/${id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          keepalive: true,
          body: JSON.stringify({ userAnswers: cleanAnswers }),
        });
      } catch (err) {
        console.error("Auto submit on leave error:", err);
      }
    };

    const handlePopState = () => {
      if (hasSubmittedRef.current) return;
      window.history.pushState({ testActive: true }, "");
      setShowLeaveModal(true);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [contest?._id, submissionResults !== null, isExpired, questions.length, user?._id]);

  // Single, reliable countdown and auto-advance effect per question - contestants only
  useEffect(() => {
    if (!contest || submissionResults || isExpired || isHostCreator) return;
    if (questions.length === 0 || currentQuestionIndex >= questions.length) return;

    const duration = qDuration > 0 ? qDuration : 30;
    setTimeLeft(duration);
    setTimeUpAlert(false);

    let remaining = duration;
    let transitionTimeout = null;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);

        // Time's up! Question was not submitted in time -> mark as 0 points
        setTimeUpAlert(true);
        const isLast = currentQuestionIndex >= questions.length - 1;

        setSubmittedAnswers((prev) => {
          const updated = {
            ...prev,
            [currentQIdStr]: "",
          };

          transitionTimeout = setTimeout(() => {
            setTimeUpAlert(false);
            if (isLast) {
              handleSubmitContest(updated);
            } else {
              setCurrentQuestionIndex((prevIdx) => Math.min(prevIdx + 1, questions.length - 1));
            }
          }, 1200);

          return updated;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (transitionTimeout) clearTimeout(transitionTimeout);
    };
  }, [currentQuestionIndex, contest?._id, isExpired, submissionResults !== null, qDuration]);

  // Handle user manual submit & next or final submit
  const handleNextOrSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const userChoice = userAnswers[currentQIdStr];
    const selectedOption =
      userChoice && typeof userChoice === "object" ? userChoice.option : userChoice || "";

    const updatedSubmitted = {
      ...submittedAnswers,
      [currentQIdStr]: selectedOption,
    };
    setSubmittedAnswers(updatedSubmitted);

    const isLast = currentQuestionIndex >= questions.length - 1;
    if (isLast) {
      handleSubmitContest(updatedSubmitted);
    } else {
      setCurrentQuestionIndex((prevIdx) => Math.min(prevIdx + 1, questions.length - 1));
    }
  };

  const handleSelectOption = (questionId, option, optionIndex) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: { option, index: optionIndex },
    }));
  };

  const answeredCount =
    Object.keys(submittedAnswers).filter((k) => {
      const val = submittedAnswers[k];
      return Boolean(val && typeof val === "string" && val.trim() !== "");
    }).length + (userAnswers[currentQIdStr] && !submittedAnswers[currentQIdStr] ? 1 : 0);

  const progressPercent =
    totalQuestions > 0
      ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-[#12BAB0]">
        <Loader2 className="w-10 h-10 animate-spin mb-3" />
        <p className="text-gray-600 font-semibold text-sm">Loading Contest...</p>
      </div>
    );
  }

  if (restrictedInfo) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-white rounded-3xl border border-rose-100 shadow-xl mt-12 animate-in zoom-in-95 duration-150">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Private Institute Contest</h2>
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          {restrictedInfo.message ||
            "This contest is exclusively for students who joined this institute. No other contestant can view or attempt it."}
        </p>

        {/* Quick Join / Unlock box */}
        <form onSubmit={handleUnlockAndJoin} className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80 mb-6 text-left">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Have the Institute Invite Code?
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. VIRT-9A2B"
              value={unlockCode}
              onChange={(e) => setUnlockCode(e.target.value.toUpperCase())}
              className="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-[#12BAB0]"
            />
            <button
              type="submit"
              disabled={unlockLoading || !unlockCode.trim()}
              className="px-4 py-2 bg-[#12BAB0] hover:bg-[#0ea89b] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {unlockLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              Join & Unlock
            </button>
          </div>
          {unlockFeedback && (
            <p
              className={`mt-2 text-xs font-semibold ${
                unlockFeedback.type === "success" ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {unlockFeedback.text}
            </p>
          )}
        </form>

        <Link href="/dashboard">
          <button className="px-6 py-2.5 bg-[#010B28] text-white rounded-full text-xs font-bold hover:bg-gray-900 transition-colors cursor-pointer">
            ← Return to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-white rounded-3xl border border-gray-100 shadow-xl mt-12">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Contest Not Found</h2>
        <p className="text-gray-500 text-sm mb-6">This contest may have been removed or does not exist.</p>
        <Link href="/dashboard">
          <button className="px-6 py-2.5 bg-[#010B28] text-white rounded-full text-sm font-bold hover:bg-[#12BAB0] transition-colors cursor-pointer">
            Back to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/dashboard"
          onClick={(e) => {
            const isTestActive = !submissionResults && !isExpired && contest && questions.length > 0;
            if (isTestActive) {
              e.preventDefault();
              setShowLeaveModal(true);
            }
          }}
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Contests
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-[#12BAB0] bg-[#12BAB0]/10 border border-[#12BAB0]/20 px-3.5 py-1 rounded-full">
            {contest.status || "Ongoing"}
          </span>
        </div>
      </div>

      {/* Contest Banner Card */}
      <div className="bg-gradient-to-r from-[#010B28] via-[#05173E] to-[#0A2357] rounded-3xl text-white p-6 md:p-8 mb-6 shadow-xl relative overflow-hidden border border-white/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#12BAB0] bg-white/10 px-3 py-0.5 rounded-full backdrop-blur-md">
                Official Contest
              </span>
              {(contest.organizationName || contest.host?.organizationName) && (
                <span className="text-xs font-bold bg-[#12BAB0]/20 text-white px-3 py-0.5 rounded-full border border-[#12BAB0]/40 flex items-center gap-1.5">
                  🏛️ {contest.organizationName || contest.host?.organizationName}
                  {(contest.organizationType || contest.host?.organizationType) && (
                    <span className="text-[10px] font-mono text-[#12BAB0] uppercase bg-black/40 px-1.5 py-0.2 rounded">
                      {contest.organizationType || contest.host?.organizationType}
                    </span>
                  )}
                </span>
              )}
              <span className="text-xs text-gray-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#12BAB0]" />
                {formatTimeRemaining(contest.activeTill)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight truncate">
              {contest.name}
            </h1>
            <p className="text-sm text-gray-300 mt-2 max-w-3xl leading-relaxed">
              Answer all questions and submit the test to see your score, compare with the contest average, and view correct answers.
            </p>
          </div>

          {/* Banner Thumbnail */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0 relative bg-gray-800">
            {contest.image ? (
              <img
                src={contest.image}
                alt={contest.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src={banner}
                alt="Banner"
                fill
                className="object-cover"
              />
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CASE 1: CONTEST RESULTS SCREEN (IF SUBMITTED) */}
      {/* ========================================================= */}
      {submissionResults ? (
        <div className="animate-in fade-in duration-300 space-y-8">
          {/* Results Hero Card */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl text-center relative overflow-hidden">
            <div className="inline-flex p-3 rounded-2xl bg-amber-100 text-amber-600 mb-4 shadow-xs">
              <Trophy className="w-8 h-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#010B28]">
              Contest Completed!
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Here is your final performance breakdown and community score comparison.
            </p>

            {/* Score Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {/* Your Score */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
                <span className="text-xs font-semibold text-gray-500 mb-1">Your Score</span>
                <span className="text-2xl sm:text-3xl font-black text-[#12BAB0]">
                  {submissionResults.score} / {submissionResults.totalQuestions}
                </span>
                <span className="text-xs font-bold text-gray-700 mt-0.5">
                  ({submissionResults.percentage}%)
                </span>
              </div>

              {/* Contest Average */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
                <span className="text-xs font-semibold text-gray-500 mb-1">Contest Average</span>
                <span className="text-2xl sm:text-3xl font-black text-gray-800">
                  {submissionResults.averageScore}%
                </span>
                <span className="text-xs text-gray-500 mt-0.5">Community Avg</span>
              </div>

              {/* Accuracy / Status */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
                <span className="text-xs font-semibold text-gray-500 mb-1">Performance</span>
                <span
                  className={`text-lg sm:text-xl font-bold ${
                    submissionResults.percentage >= submissionResults.averageScore
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {submissionResults.percentage >= submissionResults.averageScore
                    ? "Above Average 🔥"
                    : "Below Average"}
                </span>
                <span className="text-[11px] text-gray-400 mt-1">
                  {submissionResults.percentage >= submissionResults.averageScore
                    ? `+${submissionResults.percentage - submissionResults.averageScore}% difference`
                    : `${submissionResults.averageScore - submissionResults.percentage}% below avg`}
                </span>
              </div>

              {/* Total Contestants */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
                <span className="text-xs font-semibold text-gray-500 mb-1">Participants</span>
                <span className="text-2xl sm:text-3xl font-black text-gray-800">
                  {submissionResults.totalContestants || 1}
                </span>
                <span className="text-xs text-gray-500 mt-0.5">Contestants</span>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/dashboard">
                <button className="px-6 py-2.5 bg-[#010B28] hover:bg-[#12BAB0] text-white rounded-full font-bold text-sm transition-colors cursor-pointer shadow-sm">
                  Back to Dashboard
                </button>
              </Link>
              <div className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-50 text-emerald-800 rounded-full text-xs sm:text-sm font-bold border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Test Completed • Retakes Not Allowed
              </div>
            </div>
          </div>

          {/* Detailed Question Review Breakdown */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900">
              Questions Review & Solutions
            </h3>

            {(submissionResults.breakdown || []).map((item, idx) => {
              return (
                <div
                  key={item.questionId || idx}
                  className={`bg-white rounded-2xl p-6 border shadow-xs transition-all ${
                    item.isCorrect
                      ? "border-emerald-300/80 bg-emerald-50/15"
                      : "border-red-300/80 bg-red-50/15"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Question {idx + 1}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                        item.isCorrect
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : !item.chosenOption
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-red-100 text-red-800 border border-red-300"
                      }`}
                    >
                      {item.isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Correct (+1 pt)
                        </>
                      ) : !item.chosenOption ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          ⏱ Pending / Unanswered (0 pts)
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          Incorrect (0 pts)
                        </>
                      )}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-gray-900 mb-4">
                    {item.question}
                  </h4>

                  {/* Options review */}
                  <div className="space-y-2 mb-4">
                    {(item.options || []).map((opt, optIdx) => {
                      const isUserChoice = item.chosenOption === opt;
                      const isCorrectAnswer = item.correctAnswer === opt;

                      let rowStyle = "border-gray-200 bg-gray-50 text-gray-700";
                      if (isCorrectAnswer) {
                        rowStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
                      } else if (isUserChoice && !item.isCorrect) {
                        rowStyle = "border-red-400 bg-red-50 text-red-900 font-semibold";
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center justify-between p-3 rounded-xl border text-sm ${rowStyle}`}
                        >
                          <span className="flex items-center gap-2">
                            {isCorrectAnswer ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            ) : isUserChoice ? (
                              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            ) : (
                              <span className="w-4 h-4 rounded-full border border-gray-300 inline-block flex-shrink-0"></span>
                            )}
                            {opt}
                          </span>

                          <span className="text-xs">
                            {isCorrectAnswer && "✓ Correct Solution"}
                            {isUserChoice && !isCorrectAnswer && "✗ Your Answer"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {!item.chosenOption && (
                    <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>This question was pending or left unanswered when test was submitted (0 points awarded).</span>
                    </div>
                  )}

                  {item.source && item.source.trim() && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500">Source:</span>
                      <a
                        href={item.source.startsWith("http") ? item.source : `https://${item.source}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1C77FF] hover:underline text-xs font-semibold inline-flex items-center gap-1 break-all"
                      >
                        {item.source} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : isExpired ? (
        /* ========================================================= */
        /* CASE 2: CONTEST HAS EXPIRED AND CANNOT BE ATTEMPTED */
        /* ========================================================= */
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-200 shadow-xl text-center max-w-lg mx-auto mt-8 animate-in fade-in duration-200">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#010B28] mb-2">
            Contest Expired
          </h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            This contest has ended and is closed. Expired contests cannot be attempted or submitted.
          </p>
          <Link href="/dashboard">
            <button className="px-6 py-2.5 bg-[#010B28] hover:bg-[#12BAB0] text-white rounded-full font-bold text-sm transition-colors cursor-pointer shadow-sm">
              Back to Dashboard
            </button>
          </Link>
        </div>
      ) : isHostCreator ? (
        /* ========================================================= */
        /* CASE 3: HOST CREATOR PREVIEW MODE (PARTICIPATION BLOCKED) */
        /* ========================================================= */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Host Notification Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-[#0B172E] to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider mb-2">
                    Host Creator Mode
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    You Are The Creator Of This Quiz
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
                    As the contest host and author, test participation and answer submission are disabled to ensure competitive fairness. You can preview all questions and solutions below.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                <Link href="/dashboard/host">
                  <button className="px-4 py-2 bg-[#12BAB0] hover:bg-[#0ea89b] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer w-full">
                    <span>Host Hub</span> &rarr;
                  </button>
                </Link>
                <Link href="/dashboard">
                  <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer w-full">
                    <span>Back to Contests</span>
                  </button>
                </Link>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Total Questions</span>
                <span className="text-lg font-black text-white">{totalQuestions}</span>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Contestants Enrolled</span>
                <span className="text-lg font-black text-[#12BAB0]">
                  {contest.submissions?.length || 0} participants
                </span>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block mb-0.5">Status</span>
                <span className="text-lg font-black text-emerald-400 uppercase">
                  {contest.status || "Ongoing"}
                </span>
              </div>
            </div>
          </div>

          {/* Questions Preview Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>Quiz Questions & Solution Key</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#12BAB0] border border-teal-200">
                  {totalQuestions} Questions
                </span>
              </h3>
            </div>

            {questions.map((q, idx) => {
              const expected = q.correctAnswer || (q.options && q.options[0]) || "";
              return (
                <div
                  key={q._id || idx}
                  className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Question {idx + 1}
                    </span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{q.timer || 30}s timer</span>
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-gray-900 mb-4">{q.question}</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                    {(q.options || []).map((opt, optIdx) => {
                      const isCorrect = opt.trim() === expected.trim();
                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-xl border text-sm flex items-center justify-between ${
                            isCorrect
                              ? "border-emerald-400 bg-emerald-50 text-emerald-950 font-bold"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                isCorrect
                                  ? "bg-emerald-600 text-white"
                                  : "border border-gray-300 text-gray-500"
                              }`}
                            >
                              {OPTION_LETTERS[optIdx] || optIdx + 1}
                            </span>
                            <span>{opt}</span>
                          </span>
                          {isCorrect && (
                            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.source && q.source.trim() && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-1.5">
                      <span className="font-semibold">Source:</span>
                      <a
                        href={q.source.startsWith("http") ? q.source : `https://${q.source}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#12BAB0] hover:underline inline-flex items-center gap-1"
                      >
                        {q.source} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* CASE 4: ACTIVE CONTEST TEST VIEW: ONE QUESTION ON SCREEN  */
        /* ========================================================= */
        <div className="space-y-6">
          {/* Top Progress & Live Question Countdown Bar */}
          <div className="bg-white/95 p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-md sticky top-4 z-30 flex items-center justify-between gap-4 sm:gap-6 backdrop-blur-md">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#12BAB0]" />
                  Contest Progress
                </span>
                <span className="text-xs font-black text-[#010B28] flex items-center gap-2">
                  <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-teal-50 text-[#12BAB0] border border-teal-200 hidden sm:inline-block">
                    {totalQuestions > 0 ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100) : 0}% Completed
                  </span>
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#12BAB0] h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Live Question Countdown Badge */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 font-black text-sm sm:text-base flex-shrink-0 transition-all shadow-xs ${
                timeLeft <= 5
                  ? "border-red-400 bg-red-50 text-red-600 animate-pulse"
                  : timeLeft <= 10
                  ? "border-amber-400 bg-amber-50 text-amber-600"
                  : "border-[#12BAB0] bg-teal-50 text-[#12BAB0]"
              }`}
            >
              <Clock className={`w-4 h-4 ${timeLeft <= 5 ? "animate-spin text-red-600" : ""}`} />
              <span>{timeLeft}s left</span>
            </div>
          </div>

          {/* Time's Up Auto-Advance Alert */}
          {timeUpAlert && (
            <div className="p-4 bg-red-100/95 border border-red-300 text-red-800 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-bounce shadow-sm">
              <Clock className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>
                {currentQuestionIndex >= totalQuestions - 1
                  ? "⏱ Time's up! Question not submitted in time (marked as 0 points). Grading test now..."
                  : "⏱ Time's up! Question not submitted in time (marked as 0 points). Moving to next question..."}
              </span>
            </div>
          )}

          {/* Current Question Display Card */}
          {currentQuestion ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 shadow-md transition-all relative overflow-hidden">
              {/* Sleek countdown progress line at the top border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-linear ${
                    timeLeft <= 5
                      ? "bg-red-500"
                      : timeLeft <= 10
                      ? "bg-amber-500"
                      : "bg-[#12BAB0]"
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (timeLeft / (qDuration || 30)) * 100))}%`,
                  }}
                />
              </div>

              {/* Question Metadata Header */}
              <div className="flex items-center justify-between mb-4 pt-1">
                <span className="text-xs sm:text-sm font-black text-[#12BAB0] bg-teal-50 border border-teal-200/80 px-4 py-1 rounded-full shadow-2xs">
                  Question {currentQuestionIndex + 1}
                </span>
                <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span>Single Choice</span>
                  <span>•</span>
                  <span>⏱ {qDuration}s Timer</span>
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#010B28] mb-6 leading-snug tracking-tight">
                {currentQuestion.question}
              </h3>

              {/* Options List */}
              <div className="space-y-3.5 mb-6">
                {(currentQuestion.options || []).map((opt, optIdx) => {
                  const userChoice = userAnswers[currentQIdStr];
                  const selectedVal = userChoice
                    ? typeof userChoice === "object"
                      ? userChoice.option
                      : userChoice
                    : "";
                  const selectedIdx =
                    userChoice && typeof userChoice === "object"
                      ? userChoice.index
                      : undefined;
                  const isChecked =
                    selectedIdx !== undefined
                      ? selectedIdx === optIdx
                      : selectedVal === opt;

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(currentQIdStr, opt, optIdx)}
                      className={`flex items-center gap-4 p-4.5 px-6 rounded-2xl border-2 transition-all cursor-pointer ${
                        isChecked
                          ? "bg-[#12BAB0]/5 border-[#12BAB0] text-[#010B28] font-bold shadow-sm ring-2 ring-[#12BAB0]/20 scale-[1.003]"
                          : "bg-gray-50/70 hover:bg-white border-gray-200 hover:border-gray-300 text-gray-800"
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? "bg-[#12BAB0] text-white shadow-xs"
                            : "bg-white text-gray-600 border border-gray-300"
                        }`}
                      >
                        {OPTION_LETTERS[optIdx] || optIdx + 1}
                      </span>
                      <span className="text-base sm:text-lg flex-1 font-medium">{opt}</span>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isChecked
                            ? "border-[#12BAB0] bg-[#12BAB0]"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isChecked && (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {currentQuestion.source && currentQuestion.source.trim() && (
                <div className="pt-3 border-t border-gray-200/80 mb-6">
                  <a
                    href={
                      currentQuestion.source.startsWith("http")
                        ? currentQuestion.source
                        : `https://${currentQuestion.source}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#1C77FF] hover:underline font-medium inline-flex items-center gap-1"
                  >
                    Source Reference <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Bottom Submit / Next Action Bar */}
              <div className="mt-8 pt-6 border-t border-gray-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="text-xs sm:text-sm text-gray-500 font-medium flex-1 min-w-0">
                  {userAnswers[currentQIdStr] ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Option selected! Click submit to lock in answer before timer expires.
                    </span>
                  ) : (
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" /> Select an answer before timer runs out ({timeLeft}s left). Unsubmitted questions receive 0 pts.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNextOrSubmit}
                  disabled={isSubmitting || timeUpAlert}
                  className={`w-full sm:w-auto px-7 sm:px-9 py-3.5 rounded-full font-black text-sm sm:text-base transition-all duration-200 cursor-pointer shadow-md inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
                    currentQuestionIndex >= totalQuestions - 1
                      ? "bg-[#12BAB0] hover:bg-[#0fa89f] text-white hover:shadow-lg hover:scale-105 active:scale-95"
                      : "bg-[#010B28] hover:bg-[#12BAB0] text-white hover:shadow-lg hover:scale-105 active:scale-95"
                  } disabled:opacity-50`}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Grading Contest...</span>
                    </span>
                  ) : currentQuestionIndex >= totalQuestions - 1 ? (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <Award className="w-4 h-4 shrink-0" />
                      <span>Submit Answer &amp; Finish Test</span>
                      <span className="text-base leading-none shrink-0">🚀</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span>Submit Answer &amp; Next Question</span>
                      <span className="text-base leading-none shrink-0">➔</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-500">
              No questions found in this contest.
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal if questions unanswered */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Unanswered Questions Detected
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              You answered <strong className="text-black">{answeredCount}</strong> of{" "}
              <strong className="text-black">{totalQuestions}</strong> questions. Unanswered questions will be marked as incorrect (0 pts). Are you sure you want to submit now?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Go Back & Finish
              </button>
              <button
                onClick={handleSubmitContest}
                className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#12BAB0] text-white hover:bg-[#0fa89f] transition-colors cursor-pointer shadow-sm"
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Test Warning Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-center border border-amber-200 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-300 shadow-sm">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-2">
              Leave Test in Progress?
            </h3>

            <div className="bg-amber-50/90 rounded-2xl p-4 border border-amber-200 text-left mb-5 space-y-2.5">
              <p className="text-xs sm:text-sm text-amber-900 font-bold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>If you leave now, your quiz will be submitted immediately!</span>
              </p>
              <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside">
                <li>
                  Your answered questions (<strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong>) will be graded and awarded marks.
                </li>
                <li>
                  All pending/unanswered questions (<strong>{Math.max(0, totalQuestions - answeredCount)}</strong>) will be marked as <strong>0 points</strong>.
                </li>
                <li>
                  <strong>You cannot retake or re-enter this test once you leave.</strong>
                </li>
              </ul>
            </div>

            <p className="text-xs text-gray-500 mb-6">
              Are you sure you want to leave and finalize your submission now?
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Stay &amp; Continue Test
              </button>
              <button
                type="button"
                onClick={handleConfirmLeaveAndSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>Submit &amp; Leave Test</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
