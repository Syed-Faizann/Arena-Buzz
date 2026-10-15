import React from "react";
import { Plus, Trash2, Link2, ExternalLink, Timer } from "lucide-react";
import QuestionDeadline from "./QuestionDeadline";

export default function QuestionCard({ index, data, onChange, onDelete, onSave, onCancel }) {
  const addOption = () => {
    onChange({
      options: [...data.options, ""],
    });
  };

  const removeOption = (i) => {
    if (data.options.length > 1) {
      const newOptions = data.options.filter((_, idx) => idx !== i);
      onChange({ options: newOptions });
    }
  };

  const updateOption = (i, value) => {
    const newOptions = [...data.options];
    newOptions[i] = value;
    onChange({ options: newOptions });
  };

  return (
    <div className="w-full max-w-3xl mb-6">
      <div
        className={`p-4 sm:p-6 rounded-3xl border-l-4 sm:border-l-8 border-[#010B28] bg-[#EFF0F3] min-h-[100px]`}
      >
        <div className="flex items-center mb-4 justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-[#12BAB0] mb-4">
            Question {index + 1}
          </h2>
          {onDelete && (
            <Trash2
              className="ml-2 sm:ml-4 mt-2 text-red-500 cursor-pointer flex-shrink-0"
              size={20}
              onClick={onDelete}
            />
          )}
        </div>

        <h2 className="text-[#222222] text-base sm:text-lg">Type the question:</h2>

        <div className="pr-0 sm:pr-12">
    
          <div className="mb-4">
            <textarea
              rows={4}
              value={data.question}
              onChange={(e) =>
                onChange({ question: e.target.value })
              }
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-sm text-[#4E4E4E] outline-none focus:ring-2 focus:ring-[#12BAB0] focus:border-transparent"
            />
          </div>

          <div className="mb-6 border border-gray-300 rounded-lg p-3 sm:p-4">
            <div className="space-y-3">
              {data.options.map((option, i) => {
                const isCorrect = data.correctAnswer === option && option !== "";
                return (
                  <div key={i} className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => option && onChange({ correctAnswer: option })}
                        className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer flex-shrink-0 flex items-center gap-1 border ${
                          isCorrect
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-gray-100 text-gray-500 border-gray-300 hover:border-[#12BAB0] hover:text-[#12BAB0]"
                        }`}
                        title="Mark this option as the correct answer for scoring"
                      >
                        {isCorrect ? "✓ Correct" : "Mark Correct"}
                      </button>

                      <div className="w-full">
                        <input
                          type="text"
                          placeholder={`Option ${i + 1}`}
                          value={option}
                          onChange={(e) => {
                            updateOption(i, e.target.value);
                            if (isCorrect) {
                              onChange({ correctAnswer: e.target.value });
                            }
                          }}
                          className="w-full px-1 sm:px-2 py-2 text-[#4E4E4E] border-gray-300 rounded-lg outline-none text-sm sm:text-base"
                        />
                        <div className="border border-[#4E4E4E]"></div>
                      </div>

                      {data.options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="text-gray-400 hover:text-[#12BAB0] transition-colors flex-shrink-0 px-1 text-xl cursor-pointer sm:text-base"
                        >
                          _
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

      
            <button
              type="button"
              onClick={addOption}
              className="flex w-full justify-end text-[#222222] mt-4 text-sm font-medium hover:text-[#12BAB0] transition-colors cursor-pointer"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Question Active Timer */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 my-3">
            <label className="w-36 sm:w-40 flex items-center gap-2 text-sm sm:text-base font-bold text-[#222222] flex-shrink-0">
              <Timer size={18} className="text-[#12BAB0] flex-shrink-0" />
              Active Timer:
            </label>

            <div className="flex-1 flex flex-wrap items-center gap-2.5">
              {/* Preset Seconds Pills */}
              <div className="inline-flex items-center bg-gray-100 p-1 rounded-full border border-gray-200 shadow-2xs">
                {[15, 30, 45, 60, 90].map((sec) => {
                  const isSelected = (data.timer || 30) === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onChange({ timer: sec })}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#12BAB0] text-white shadow-xs"
                          : "text-gray-600 hover:text-black hover:bg-white/60"
                      }`}
                    >
                      {sec}s
                    </button>
                  );
                })}
              </div>

              {/* Custom Seconds Input */}
              <div className="inline-flex items-center gap-1.5 bg-white border border-gray-300 rounded-full px-3 py-1 shadow-2xs hover:border-[#12BAB0] focus-within:ring-2 focus-within:ring-[#12BAB0]/30 focus-within:border-[#12BAB0] transition-all">
                <span className="text-[11px] font-semibold text-gray-400">Custom:</span>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={data.timer || 30}
                  onChange={(e) =>
                    onChange({
                      timer: Math.max(5, parseInt(e.target.value) || 5),
                    })
                  }
                  className="w-10 text-xs font-bold text-center text-[#222222] focus:outline-none bg-transparent"
                />
                <span className="text-[11px] font-semibold text-gray-500">sec</span>
              </div>
            </div>
          </div>

          {/* Question Source Reference */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3">
            <label className="w-36 sm:w-40 flex items-center gap-2 text-sm sm:text-base font-bold text-[#222222] flex-shrink-0">
              <Link2 size={18} className="text-[#12BAB0] flex-shrink-0" />
              Source Link:
            </label>

            <div className="flex-1 relative">
              <input
                type="url"
                value={data.source || ""}
                onChange={(e) => onChange({ source: e.target.value })}
                placeholder="Attach source link (e.g. https://example.com/reference)"
                className="w-full border border-gray-300 rounded-full px-4 py-2 pr-20 text-xs sm:text-sm text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#12BAB0] focus:border-transparent bg-white placeholder:text-gray-400 shadow-2xs"
              />
              {data.source && data.source.trim() && (
                <a
                  href={data.source.startsWith("http") ? data.source : `https://${data.source}`}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#12BAB0] hover:text-[#0f9c8f] hover:underline flex items-center gap-1 bg-white pl-2"
                  title="Test source link"
                >
                  Visit <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

 
          {onSave && (
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={onSave}
                className="px-8 py-2 bg-[#010B28] text-white rounded-full hover:bg-[#0f9c8f] transition-colors cursor-pointer text-sm font-bold shadow-sm"
              >
                Save Changes
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors cursor-pointer text-sm font-semibold"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
