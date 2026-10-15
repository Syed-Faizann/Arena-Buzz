"use client";
import React, { useState, useEffect } from "react";
import {
  Edit2,
  Trash2,
  Eye,
  ShieldCheck,
  Rocket,
  ExternalLink,
} from "lucide-react";
import QuestionCard from "./QuestionCard";
import {
  updateContestQuestion,
  deleteContestQuestion,
} from "../services/api";
import Link from "next/link";

function formatTimeRemaining(activeTill) {
  if (!activeTill) return "Active";
  if (typeof activeTill === "string") return activeTill;
  if (!activeTill.date) return "Active";

  try {
    const target = new Date(`${activeTill.date}T${activeTill.time || "23:59:59"}`);
    const now = new Date();
    const diff = target - now;

    if (isNaN(diff)) return activeTill.date;
    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);

    return `${days}d : ${hours}h : ${mins}m left`;
  } catch {
    return activeTill.date || "Active";
  }
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const OnoingQuestions = ({
  questions: initialQuestions,
  contestId,
  canEdit = false,
  onQuestionsChange,
}) => {
  const [questions, setQuestions] = useState(initialQuestions || []);
  const [editingIndex, setEditingIndex] = useState(null);
  const [localData, setLocalData] = useState(null);

  // Sync questions prop
  useEffect(() => {
    if (initialQuestions) {
      setQuestions(initialQuestions);
    }
  }, [initialQuestions]);

  const handleEdit = (index) => {
    setEditingIndex(index);
    setLocalData({ ...questions[index] });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setLocalData(null);
  };

  const handleSave = async () => {
    const questionToSave = questions[editingIndex];
    if (!questionToSave) return;

    try {
      if (contestId && questionToSave._id) {
        await updateContestQuestion(contestId, questionToSave._id, localData);
      }

      const updated = questions.map((q, i) =>
        i === editingIndex ? { ...q, ...localData } : q
      );
      setQuestions(updated);
      onQuestionsChange?.(updated);
      setEditingIndex(null);
      setLocalData(null);
    } catch (err) {
      console.error("Failed to update question:", err);
      alert(err.message || "Failed to save question");
    }
  };

  const handleDelete = async (index) => {
    const questionToDelete = questions[index];
    if (!questionToDelete) return;

    const confirmDelete = window.confirm("Are you sure you want to delete this question?");
    if (!confirmDelete) return;

    try {
      if (contestId && questionToDelete._id) {
        await deleteContestQuestion(contestId, questionToDelete._id);
      }

      const updated = questions.filter((_, i) => i !== index);
      setQuestions(updated);
      onQuestionsChange?.(updated);
      if (editingIndex === index) {
        setEditingIndex(null);
        setLocalData(null);
      }
    } catch (err) {
      console.error("Failed to delete question:", err);
      alert(err.message || "Failed to delete question");
    }
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="bg-[#F0F0F3]/60 rounded-xl p-6 text-center text-gray-500 text-sm max-w-3xl mb-6">
        No questions have been added to this contest yet.
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl flex flex-col gap-4 md:gap-6 px-1 sm:px-0 mb-8 animate-in fade-in duration-200">
      {questions.map((q, i) => {
        if (editingIndex === i) {
          return (
            <div key={q._id || i} className="relative">
              <QuestionCard
                index={i}
                data={localData}
                onChange={(newData) => setLocalData((prev) => ({ ...prev, ...newData }))}
                onDelete={() => handleDelete(i)}
                onSave={handleSave}
                onCancel={handleCancelEdit}
              />
            </div>
          );
        }

        const timeRemaining = formatTimeRemaining(q.activeTill);

        return (
          <div
            key={q._id || i}
            className={`bg-[#EFF0F3] border rounded-2xl p-4 md:p-6 shadow-xs hover:shadow-md transition-all ${
              canEdit ? "border-[#0629A2]" : "border-[#12BAB0]/50"
            }`}
          >
            {/* Question Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[#282828] flex flex-wrap items-center gap-2 sm:gap-4">
                <h1 className="text-base md:text-lg lg:text-xl font-medium">
                  Question {i + 1}/{questions.length}
                </h1>
                <p className="bg-[#FFFFFF] border border-[#12BAB0] p-1 px-3 rounded-full text-xs md:text-sm text-[#12BAB0] whitespace-nowrap shadow-2xs font-semibold flex items-center gap-1">
                  ⏱ {q.timer || 30}s Timer
                </p>

                {/* Role Status Tag */}
                {canEdit ? (
                  <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Host Controls
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs bg-sky-100 text-sky-800 font-semibold px-2.5 py-0.5 rounded-full border border-sky-200">
                    <Eye className="w-3.5 h-3.5 text-sky-600" /> Preview
                  </span>
                )}
              </div>

              {/* Host Quick Edit / Delete Icons */}
              {canEdit && (
                <div className="text-[#282828] flex gap-3 sm:self-auto items-center">
                  <button
                    type="button"
                    onClick={() => handleEdit(i)}
                    className="p-1.5 rounded-lg hover:bg-white text-gray-700 hover:text-[#12BAB0] transition-colors cursor-pointer"
                    title="Edit question"
                  >
                    <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(i)}
                    className="p-1.5 rounded-lg hover:bg-white text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="border border-[#D9D9D9] mt-3 md:mt-4"></div>

            {/* Question Text */}
            <h1 className="text-[#282828] text-lg md:text-xl lg:text-2xl font-bold mt-3 md:mt-4 break-words">
              {q.question}
            </h1>

            {/* Options Preview List */}
            <div className="mt-3 md:mt-4 flex flex-col gap-2.5 md:gap-3 mb-4">
              {(q.options || []).map((opt, idx) => {
                const isCorrect = canEdit && q.correctAnswer && q.correctAnswer === opt;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 px-4 rounded-xl border transition-all ${
                      isCorrect
                        ? "bg-emerald-50/70 border-emerald-300"
                        : "bg-white/70 border-gray-200/90 hover:bg-white"
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center flex-shrink-0 border border-gray-300">
                      {OPTION_LETTERS[idx] || idx + 1}
                    </span>
                    <span className="break-words text-sm md:text-base font-medium text-gray-800 flex-1">
                      {opt}
                    </span>
                    {isCorrect && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 whitespace-nowrap">
                        ✓ Correct Answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions: Verified Source & Role Specific Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-200/80">
              {q.source && q.source.trim() ? (
                <a
                  href={q.source.startsWith("http") ? q.source : `https://${q.source}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1C77FF] text-xs md:text-sm underline inline-flex items-center gap-1.5 hover:text-blue-700 transition-colors font-medium break-all"
                  title="Open source link"
                >
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  Source: {q.source}
                </a>
              ) : (
                <span className="text-gray-400 text-xs md:text-sm italic">
                  No source link attached
                </span>
              )}

              {/* Host Actions: Edit & Delete buttons */}
              {canEdit ? (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleEdit(i)}
                    className="px-4 py-1.5 rounded-full bg-[#010B28] hover:bg-[#12BAB0] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Question
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(i)}
                    className="px-3.5 py-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              ) : (
                /* Contestant Action: Launch test to submit whole contest */
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Link
                    href={`/dashboard/contest/${contestId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#12BAB0] hover:bg-[#0fa89f] text-white text-xs sm:text-sm font-bold transition-all shadow-xs hover:shadow-md cursor-pointer"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    Take Test to Submit 🚀
                  </Link>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OnoingQuestions;