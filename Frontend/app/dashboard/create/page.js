"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Upload,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Building2,
  Sparkles,
  AlertTriangle,
  Zap,
  CreditCard,
  Lock,
} from "lucide-react";
import DeadlinePicker from "../../components/DeadlinePicker";
import QuestionCard from "../../components/QuestionCard";
import SubmitedQuestion from "@/app/components/SubmitedQuestion";
import SubscriptionModal from "../../components/SubscriptionModal";
import { useAuth } from "../../context/AuthContext";
import { createContest, uploadContestImage, getSubscriptionStatus } from "../../services/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

const Page = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [contestName, setContestName] = useState("");
  const [contestImage, setContestImage] = useState("");
  const [contestActiveTill, setContestActiveTill] = useState({ date: "", time: "" });
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("college");
  const [customOrgType, setCustomOrgType] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [subStatus, setSubStatus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSubStatus = async () => {
    try {
      const res = await getSubscriptionStatus();
      if (res) setSubStatus(res);
    } catch (err) {
      console.error("Failed to fetch subscription status:", err);
    }
  };

  useEffect(() => {
    if (user?.userType === "host") {
      fetchSubStatus();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      if (user.organizationName) {
        setOrganizationName(user.organizationName);
      }
      if (user.organizationType) {
        setOrganizationType(user.organizationType);
      }
    }
  }, [user]);

  const [questions, setQuestions] = useState([
    {
      id: Date.now(),
      question: "",
      options: ["", "", "", ""],
      activeTill: { date: "", time: "" },
      timer: 30,
      source: "",
    },
  ]);

  const [submittedQuestions, setSubmittedQuestions] = useState([]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: Date.now(),
        question: "",
        options: ["", "", "", ""],
        activeTill: { date: "", time: "" },
        timer: 30,
        source: "",
      },
    ]);
  };

  const deleteQuestion = (id) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Image upload handler using api.js uploadContestImage
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file");
      return;
    }

    try {
      setIsUploadingImage(true);
      setErrorMessage("");
      const res = await uploadContestImage(file);
      if (res && res.url) {
        setContestImage(res.url);
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to upload contest image");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Submit handler calling api.js createContest
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    // Pre-flight check subscription / free trial limit
    if (subStatus && !subStatus.canCreateContest) {
      setErrorMessage(subStatus.blockReason);
      setIsModalOpen(true);
      return;
    }

    if (!contestName.trim()) {
      setErrorMessage("Please provide a name for the contest");
      return;
    }

    // Combine any submittedQuestions and current valid questions
    const allQuestions = [...submittedQuestions, ...questions].filter(
      (q) => q && q.question && q.question.trim() !== ""
    );

    if (allQuestions.length === 0) {
      setErrorMessage("Please add at least one question with text");
      return;
    }

    try {
      setIsSubmitting(true);
      const resolvedOrgType =
        organizationType === "other" && customOrgType.trim()
          ? customOrgType.trim()
          : organizationType;

      const contestPayload = {
        name: contestName.trim(),
        image: contestImage,
        activeTill: contestActiveTill,
        organizationName: organizationName.trim(),
        organizationType: resolvedOrgType,
        questions: allQuestions,
      };

      await createContest(contestPayload);
      setSuccessMessage("Contest created successfully! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err) {
      if (err.data?.code === "SUBSCRIPTION_REQUIRED" || err.status === 403) {
        if (err.data?.subStatus) {
          setSubStatus(err.data.subStatus);
        } else {
          fetchSubStatus();
        }
        setIsModalOpen(true);
      }
      setErrorMessage(err.message || "Failed to create contest");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#12BAB0] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user?.userType !== "host") {
    return (
      <div className="p-6 max-w-xl mx-auto mt-12 bg-white rounded-3xl border border-gray-100 shadow-xl text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          Only users with a <strong className="text-black">Host</strong> account have permission to create quizzes and contests. Your account role is currently set to <strong className="text-[#12BAB0] capitalize">{user?.userType || "Contestant"}</strong>.
        </p>
        <Link href="/dashboard">
          <button className="flex items-center gap-2 bg-[#010B28] hover:bg-[#12BAB0] text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            Back to Contests
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 w-full max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-black">
          Create Contest
        </h1>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      {/* Subscription & Free Trial Status Banner */}
      {subStatus && (
        <div className="mb-6">
          {subStatus.isExpired ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-rose-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-950">Subscription Expired</h4>
                  <p className="text-xs text-amber-800">
                    Your previous plan has expired. Please renew your plan to publish new contests.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="shrink-0 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
              >
                Renew Plan Now
              </button>
            </div>
          ) : !subStatus.canCreateContest ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/15 to-orange-500/15 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-rose-950">Free Trial Limit Reached</h4>
                  <p className="text-xs text-rose-800">
                    You have used your 3 free trial contests. Upgrade to Pro for unlimited contest hosting.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="shrink-0 px-4 py-2 rounded-xl bg-[#12BAB0] hover:bg-[#0f9c8f] text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
              >
                View Plans & Upgrade
              </button>
            </div>
          ) : subStatus.isTrial ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-700">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Free Trial</span>
                    <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                      {subStatus.contestCount || 0} of {subStatus.freeLimit || 3} free contests used
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {subStatus.trialRemaining} free {subStatus.trialRemaining === 1 ? "contest" : "contests"} remaining before requiring a subscription plan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-semibold text-[#12BAB0] hover:text-[#0f9c8f] underline whitespace-nowrap cursor-pointer"
              >
                Upgrade to Pro
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  <strong>Pro Host Plan Active:</strong> Unlimited contest creation enabled
                  {subStatus.daysRemaining !== null && ` (${subStatus.daysRemaining} days remaining)`}
                </span>
              </div>
              <Link href="/dashboard/host?tab=billing" className="font-semibold text-emerald-700 hover:underline">
                Manage Plan
              </Link>
            </div>
          )}
        </div>
      )}


      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Contest Banner */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Contest Primary Info: Image on Left + Name & Deadline on Right */}
      <div className="flex flex-col sm:flex-row gap-5 md:gap-6 items-stretch mb-6">
        {/* Contest Image Upload Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative flex flex-col w-full sm:w-48 md:w-56 bg-[#EFF0F3] min-h-[160px] items-center justify-center rounded-2xl cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 hover:border-[#12BAB0] transition-colors group shrink-0"
        >
          {contestImage ? (
            <>
              <img
                src={contestImage}
                alt="Contest Banner Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold">
                <Upload className="w-5 h-5 mb-1 text-[#12BAB0]" />
                Change Image
              </div>
            </>
          ) : isUploadingImage ? (
            <div className="flex flex-col items-center justify-center text-[#050D27]">
              <Loader2 className="w-7 h-7 animate-spin text-[#12BAB0] mb-2" />
              <p className="text-xs font-medium">Uploading to ImageKit...</p>
            </div>
          ) : (
            <>
              <Upload className="w-6 h-6 text-[#050D27] mb-2 group-hover:text-[#12BAB0] transition-colors" />
              <p className="text-[#050D27] text-sm font-medium underline group-hover:text-[#12BAB0] transition-colors">
                Upload your image
              </p>
            </>
          )}
        </div>

        {/* Contest Name and Deadline */}
        <div className="flex-1 flex flex-col justify-between gap-4 text-[#050D27]">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Name of the contest
            </label>
            <input
              type="text"
              value={contestName}
              onChange={(e) => setContestName(e.target.value)}
              placeholder="e.g. Ongoing Contest"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#12BAB0] focus:border-transparent text-sm bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Contest Active till
            </label>
            <DeadlinePicker
              value={contestActiveTill}
              onChange={(val) => setContestActiveTill(val)}
            />
          </div>
        </div>
      </div>

      {/* Host Institute Affiliation - Full Width Card */}
      <div className="mb-6 p-4 sm:p-5 bg-teal-50/60 border border-teal-200/80 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#12BAB0]" />
          <span className="text-xs font-bold text-[#010B28] uppercase tracking-wider">
            Institute Affiliation
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Organization / College / School Name
          </label>
          <input
            type="text"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="e.g. Stanford University, Lincoln High School, Apex Coaching"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-sm bg-white text-gray-900"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Institute Category
            </label>
            <select
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-sm bg-white text-gray-900 font-medium"
            >
              <option value="school">School</option>
              <option value="college">College</option>
              <option value="university">University</option>
              <option value="institute">Coaching / Training Institute / Academy</option>
              <option value="company">Corporate / Company</option>
              <option value="other">Other</option>
            </select>
          </div>

          {organizationType === "other" && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Specify Custom Category
              </label>
              <input
                type="text"
                value={customOrgType}
                onChange={(e) => setCustomOrgType(e.target.value)}
                placeholder="e.g. Sports Club, NGO, Community"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] text-sm bg-white text-gray-900"
              />
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-500">
          Students and contestants can filter and view ongoing contests under your institute banner.
        </p>
      </div>

      <div className="border-t border-gray-200 my-8"></div>

      {submittedQuestions.map((q, index) => (
        <SubmitedQuestion key={q.id} data={q} index={index} />
      ))}

      {questions.map((q, index) => (
        <QuestionCard
          key={q.id}
          index={submittedQuestions.length + index}
          data={q}
          onChange={(updatedData) => {
            setQuestions((prev) =>
              prev.map((item) => (item.id === q.id ? { ...item, ...updatedData } : item))
            );
          }}
          onDelete={() => deleteQuestion(q.id)}
        />
      ))}

      <div className="flex justify-between items-center mt-8 pb-12">
        <button
          type="button"
          onClick={addQuestion}
          className="text-md md:text-xl font-semibold underline text-[#12BAB0] hover:text-[#0f9c8f] cursor-pointer flex items-center gap-2"
        >
          <span>New Question</span>
          <Plus size={18} />
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`md:px-10 px-8 py-2 md:py-2.5 rounded-full font-bold text-sm md:text-base cursor-pointer transition-all shadow-md flex items-center gap-2 disabled:opacity-50 ${
            subStatus && !subStatus.canCreateContest
              ? "bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 shadow-amber-500/20"
              : "bg-[#12BAB0] hover:bg-[#0f9c8f] text-white"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating...</span>
            </>
          ) : subStatus && !subStatus.canCreateContest ? (
            <>
              <Lock className="w-4 h-4" />
              <span>Submit (Plan Required)</span>
            </>
          ) : (
            <span>Submit</span>
          )}
        </button>
      </div>

      {/* Subscription Plans Modal */}
      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={async () => {
          await fetchSubStatus();
          setIsModalOpen(false);
          setErrorMessage("");
          setSuccessMessage("Plan activated successfully! You can now submit your contest.");
        }}
        subStatus={subStatus}
        title="Unlock Unlimited Contests"
        description="You have reached your 3 free trial contests. Upgrade to Pro to publish your 4th contest."
        successButtonText="Plan Activated — Continue & Submit Contest"
      />
    </div>
  );
};

export default Page;
