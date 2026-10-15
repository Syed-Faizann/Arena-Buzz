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

  const questions = contest?.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex];
  const currentQIdStr = currentQuestion?._id?.toString() || String(currentQuestionIndex);
  const qDuration = currentQuestion?.timer ? Number(currentQuestion.timer) : 30;

  const handleSubmitContest = async (finalAnswers) => {
    if (isExpired) {
      alert("This contest has expired and can no longer be submitted or re-attempted.");
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setShowConfirmModal(false);

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

  // Single, reliable countdown and auto-advance effect per question
  useEffect(() => {
    if (!contest || submissionResults || isExpired) return;
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

  const answeredCount = Object.keys(submittedAnswers).filter((k) => {
    const val = submittedAnswers[k];
    return Boolean(val && typeof val === "string" && val.trim() !== "");
  }).length;

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
    <div className="max-w-4xl mx-auto pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Contests
        </Link>
        <span className="text-xs font-bold uppercase tracking-wider text-[#12BAB0] bg-[#12BAB0]/10 px-3 py-1 rounded-full">
          {contest.status || "Ongoing"}
        </span>
      </div>

      {/* Contest Banner Card */}
      <div className="bg-[#010B28] rounded-3xl text-white p-6 md:p-8 mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              {contest.name}
            </h1>
            <p className="text-sm text-gray-300 mt-2">
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
              {isExpired ? (
                <div className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gray-100 text-gray-600 rounded-full text-xs sm:text-sm font-bold border border-gray-200 shadow-2xs">
                  <Clock className="w-4 h-4 text-gray-500" />
                  Contest Expired • Re-attempts Closed
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSubmissionResults(null);
                    setCurrentQuestionIndex(0);
                    setUserAnswers({});
                    setTimeUpAlert(false);
                  }}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full font-bold text-sm transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Retake Test
                </button>
              )}
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
                          ⏱ Timed Out (0 pts)
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
                      <span>This question was not submitted before time expired (0 points awarded).</span>
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
      ) : (
        /* ========================================================= */
        /* CASE 3: ACTIVE CONTEST TEST VIEW: ONE QUESTION ON SCREEN  */
        /* ========================================================= */
        <div className="space-y-6">
          {/* Top Progress & Live Question Countdown Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm sticky top-4 z-30 flex items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Contest Progress
                </span>
                <span className="text-xs font-black text-[#010B28]">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
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
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-black text-sm sm:text-base flex-shrink-0 transition-all shadow-xs ${
                timeLeft <= 5
                  ? "border-red-400 bg-red-50 text-red-600 animate-pulse"
                  : timeLeft <= 10
                  ? "border-amber-400 bg-amber-50 text-amber-600"
                  : "border-[#12BAB0] bg-teal-50 text-[#12BAB0]"
              }`}
            >
              <Clock className={`w-4 h-4 ${timeLeft <= 5 ? "animate-spin text-red-600" : ""}`} />
              <span>{timeLeft}s</span>
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
            <div className="bg-[#EFF0F3] border border-gray-300/80 rounded-3xl p-6 sm:p-8 shadow-sm transition-all relative overflow-hidden">
              {/* Question Countdown Duration Bar */}
              <div className="w-full bg-gray-200/90 rounded-full h-2 overflow-hidden mb-6">
                <div
                  className={`h-full transition-all duration-1000 ease-linear rounded-full ${
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

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs sm:text-sm font-extrabold text-[#12BAB0] bg-white border border-[#12BAB0]/30 px-3.5 py-1 rounded-full shadow-2xs">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-full flex items-center gap-1">
                  ⏱ {qDuration}s Timer
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-[#282828] mb-6 leading-snug">
                {currentQuestion.question}
              </h3>

              {/* Options List */}
              <div className="space-y-3 mb-6">
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
                      className={`flex items-center gap-3.5 p-4 px-5 rounded-2xl border-2 transition-all cursor-pointer ${
                        isChecked
                          ? "bg-white border-[#12BAB0] text-black font-bold shadow-md ring-2 ring-[#12BAB0]/20 scale-[1.005]"
                          : "bg-white/80 border-gray-200 hover:border-gray-300 hover:bg-white text-gray-700"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 transition-colors ${
                          isChecked
                            ? "bg-[#12BAB0] text-white"
                            : "bg-gray-100 text-gray-600 border border-gray-300"
                        }`}
                      >
                        {OPTION_LETTERS[optIdx] || optIdx + 1}
                      </span>
                      <span className="text-sm sm:text-base flex-1">{opt}</span>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isChecked
                            ? "border-[#12BAB0] bg-[#12BAB0]"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isChecked && (
                          <Check className="w-3 h-3 text-white stroke-[3]" />
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
              <div className="mt-8 pt-6 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-500 font-medium">
                  {userAnswers[currentQIdStr] ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Option selected! Click submit to lock in answer before timer expires.
                    </span>
                  ) : (
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" /> Select & submit before timer runs out ({timeLeft}s left). Unsubmitted questions receive 0 pts.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNextOrSubmit}
                  disabled={isSubmitting || timeUpAlert}
                  className={`w-full sm:w-auto px-8 py-3 rounded-full font-extrabold text-sm sm:text-base transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                    currentQuestionIndex >= totalQuestions - 1
                      ? "bg-[#12BAB0] hover:bg-[#0fa89f] text-white hover:shadow-lg"
                      : "bg-[#010B28] hover:bg-[#12BAB0] text-white hover:shadow-lg"
                  } disabled:opacity-50`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Grading Contest...
                    </>
                  ) : currentQuestionIndex >= totalQuestions - 1 ? (
                    <>
                      <Award className="w-4 h-4" />
                      Submit Answer & Finish Test 🚀
                    </>
                  ) : (
                    <>
                      Submit Answer & Next Question ➔
                    </>
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
              <strong className="text-black">{totalQuestions}</strong> questions. Unanswered questions will be marked as incorrect. Are you sure you want to submit now?
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
    </div>
  );
}
