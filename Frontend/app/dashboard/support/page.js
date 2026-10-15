"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  LifeBuoy,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
  Bug,
  Trophy,
  CreditCard,
  User,
  Sparkles,
  HelpCircle,
  MessageSquare,
  Eye,
  RefreshCw,
  Flame,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { createSupportTicket, getMySupportTickets } from "../../services/api";

const CATEGORIES = [
  { id: "bug", label: "Bug / Glitch", icon: Bug, color: "text-rose-500 bg-rose-50 border-rose-200" },
  { id: "contest_issue", label: "Contest Problem", icon: Trophy, color: "text-amber-500 bg-amber-50 border-amber-200" },
  { id: "billing", label: "Billing / Plan", icon: CreditCard, color: "text-emerald-500 bg-emerald-50 border-emerald-200" },
  { id: "account", label: "Account & Login", icon: User, color: "text-blue-500 bg-blue-50 border-blue-200" },
  { id: "feature_request", label: "Feature Suggestion", icon: Sparkles, color: "text-purple-500 bg-purple-50 border-purple-200" },
  { id: "other", label: "General Feedback", icon: HelpCircle, color: "text-teal-500 bg-teal-50 border-teal-200" },
];

const PRIORITIES = [
  { id: "low", label: "Low", dotColor: "bg-emerald-400" },
  { id: "medium", label: "Medium", dotColor: "bg-amber-400" },
  { id: "high", label: "High", dotColor: "bg-orange-500" },
  { id: "urgent", label: "Urgent", dotColor: "bg-rose-500" },
];

export default function SupportPage() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("submit"); // "submit" | "history"

  // Form State
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("bug");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // History State
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [activePreviewImage, setActivePreviewImage] = useState(null);

  // Load user tickets
  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const res = await getMySupportTickets();
      if (res && res.tickets) {
        setTickets(res.tickets);
      }
    } catch (err) {
      console.error("Failed to load support tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", message: "Please upload an image file (PNG, JPG, WEBP, GIF)." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: "error", message: "Image must be under 5MB." });
      return;
    }

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFeedback(null);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      setFeedback({ type: "error", message: "Please provide a subject." });
      return;
    }
    if (!description.trim()) {
      setFeedback({ type: "error", message: "Please provide details about the issue." });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const formData = new FormData();
      formData.append("subject", subject.trim());
      formData.append("category", category);
      formData.append("priority", priority);
      formData.append("description", description.trim());
      if (selectedFile) {
        formData.append("image", selectedFile);
      }

      const res = await createSupportTicket(formData);

      setFeedback({
        type: "success",
        message: res.message || "Your ticket has been submitted! Our support team will review it shortly.",
      });

      // Reset form
      setSubject("");
      setDescription("");
      setCategory("bug");
      setPriority("medium");
      removeFile();

      // Refresh tickets list
      fetchTickets();

      // Switch to history after delay
      setTimeout(() => {
        setActiveTab("history");
        setFeedback(null);
      }, 2000);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to submit support ticket. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            Pending Review
          </span>
        );
      case "in_review":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            In Progress
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Resolved
          </span>
        );
      case "closed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <X className="w-3.5 h-3.5 text-gray-500" />
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case "urgent":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wide">
            <Flame className="w-3 h-3 text-rose-600" /> Urgent
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 uppercase tracking-wide">
            <AlertTriangle className="w-3 h-3 text-orange-600" /> High
          </span>
        );
      case "medium":
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 capitalize">
            Medium
          </span>
        );
      case "low":
      default:
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#010B28] via-[#08183A] to-[#0A2540] rounded-3xl p-6 md:p-8 text-white border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#12BAB0]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#12BAB0]/20 text-[#12BAB0] border border-[#12BAB0]/40 flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5" />
                Support Center
              </span>
              <span className="text-xs text-gray-400 capitalize font-medium">
                {user?.userType === "host" ? "🏛️ Host Account" : "🎓 Contestant Account"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Feedback & Support
            </h1>
            <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
              Encountered a problem, have feedback, or need help with a contest? Report it here with screenshots and our team will get right on it.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab("submit")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "submit"
                  ? "bg-[#12BAB0] text-white shadow-lg shadow-[#12BAB0]/30"
                  : "bg-white/10 hover:bg-white/15 text-gray-200"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                fetchTickets();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-[#12BAB0] text-white shadow-lg shadow-[#12BAB0]/30"
                  : "bg-white/10 hover:bg-white/15 text-gray-200"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>My Tickets</span>
              {tickets.length > 0 && (
                <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">
                  {tickets.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs md:text-sm font-semibold flex items-center justify-between gap-3 shadow-md transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Tab 1: Submit Form */}
      {activeTab === "submit" && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-xl space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-[#12BAB0]" />
              Submit a Support Request or Feedback
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Fill in the details below. Providing a clear description and screenshot helps us diagnose and fix issues faster.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-2.5">
                Issue Category <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "border-[#12BAB0] bg-[#12BAB0]/10 text-[#0d8780] shadow-sm font-bold ring-2 ring-[#12BAB0]/30"
                          : "border-gray-200 hover:border-gray-300 bg-gray-50/50 text-gray-600"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="text-xs text-center leading-tight">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1.5">
                  Subject / Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cannot submit contest answers, image failed to load, billing question"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] focus:bg-white text-gray-800 transition-all font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1.5">
                  Priority Level
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PRIORITIES.map((p) => {
                    const isSelected = priority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id)}
                        className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          isSelected
                            ? "border-gray-800 bg-gray-900 text-white shadow-xs"
                            : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${p.dotColor}`} />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Detailed Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
                  Description of the Issue / Feedback <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400">
                  {description.length} / 3000
                </span>
              </div>
              <textarea
                required
                rows={5}
                maxLength={3000}
                placeholder="Please describe what happened, steps to reproduce, or suggestions you have in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#12BAB0] focus:bg-white text-gray-800 transition-all leading-relaxed"
              />
            </div>

            {/* Attached Image Upload */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1.5">
                Attach Screenshot or Image (Optional)
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
              />

              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 hover:border-[#12BAB0] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50/60 hover:bg-teal-50/20 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#12BAB0] flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-gray-700">
                    Click to upload a screenshot or relevant image
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Supports PNG, JPG, WEBP, GIF up to 5MB
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-teal-50/50 rounded-2xl border border-teal-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={imagePreview}
                      alt="Attachment Preview"
                      className="w-16 h-16 rounded-xl object-cover border border-teal-200 shadow-xs"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-900 truncate max-w-xs">
                        {selectedFile?.name || "Attached Screenshot"}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {(selectedFile?.size / 1024).toFixed(1)} KB · Image ready for upload
                      </p>
                      <span className="text-[10px] font-bold text-[#12BAB0] uppercase">
                        ✓ Will upload securely to cloud
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Logged in as <strong>{user?.email}</strong>
              </span>

              <button
                type="submit"
                disabled={submitting}
                className="bg-[#12BAB0] hover:bg-[#0ea89b] text-white px-7 py-3 rounded-full text-sm font-extrabold shadow-lg shadow-[#12BAB0]/25 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Ticket...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Ticket</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Tab 2: Ticket History */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#12BAB0]" />
                Your Support Tickets
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Track status updates and official responses from our engineering team.
              </p>
            </div>

            <button
              onClick={fetchTickets}
              disabled={loadingTickets}
              className="p-2 text-gray-400 hover:text-[#12BAB0] rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-4 h-4 ${loadingTickets ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loadingTickets ? (
            <div className="py-16 text-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#12BAB0] mb-2" />
              <p className="text-xs font-semibold">Loading your support tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-16 bg-white rounded-3xl border border-gray-100 text-center p-6 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#12BAB0] flex items-center justify-center mx-auto mb-3">
                <LifeBuoy className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-gray-900 text-lg mb-1">No Tickets Submitted Yet</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mb-5 leading-relaxed">
                When you encounter a glitch, dispute, or have questions about contests or plans, submit a ticket and it will appear here.
              </p>
              <button
                onClick={() => setActiveTab("submit")}
                className="bg-[#010B28] hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold transition-colors cursor-pointer"
              >
                Report an Issue Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((t) => (
                <div
                  key={t._id}
                  className="bg-white rounded-3xl p-5 md:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(t.status)}
                      {getPriorityBadge(t.priority)}
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                        {t.category?.replace("_", " ")}
                      </span>
                    </div>

                    <span className="text-[11px] text-gray-400 font-medium">
                      Submitted on {new Date(t.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 mb-1">
                      {t.subject}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {t.description}
                    </p>
                  </div>

                  {/* Attachment Thumbnail if present */}
                  {t.attachmentUrl && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                        Attached Screenshot
                      </span>
                      <div
                        onClick={() => setActivePreviewImage(t.attachmentUrl)}
                        className="relative w-32 h-20 rounded-xl overflow-hidden border border-gray-200 cursor-pointer group shadow-xs"
                      >
                        <img
                          src={t.attachmentUrl}
                          alt="Ticket attachment"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Official Admin Response */}
                  {t.adminResponse && (
                    <div className="mt-3 p-4 rounded-2xl bg-gradient-to-r from-teal-50/80 to-emerald-50/80 border border-teal-200/80 space-y-1.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-teal-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#12BAB0]" />
                          Official Support Resolution
                        </span>
                        {t.respondedAt && (
                          <span className="text-[10px] text-teal-700/80">
                            {new Date(t.respondedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-teal-950 font-medium leading-relaxed whitespace-pre-wrap">
                        {t.adminResponse}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal for Attachment Zoom */}
      {activePreviewImage && (
        <div
          onClick={() => setActivePreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-transparent">
            <button
              onClick={() => setActivePreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activePreviewImage}
              alt="Zoomed attachment"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
