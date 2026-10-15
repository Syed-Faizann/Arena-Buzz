import React, { useState, useEffect } from "react";
import { Edit2, Link2, ExternalLink, Timer } from "lucide-react";
import QuestionCard from "./QuestionCard";

const SubmitedQuestion = ({ data, index, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);

  const [localData, setLocalData] = useState({ ...data });

  useEffect(() => {
    setLocalData({ ...data });
  }, [data]);


  const handleSave = () => {
    onUpdate?.(localData); 
    setIsEditing(false);
  };

  if (isEditing) {

    return (
      <div className="w-full max-w-3xl mb-6">
        <QuestionCard
          index={index}
          data={localData}
          onChange={(updatedData) => setLocalData(prev => ({ ...prev, ...updatedData }))}
          onDelete={() => {}}
          onSave={handleSave} 
        />
      </div>
    );
  }


  return (
    <div className="w-full max-w-3xl mb-6">
      <div className="bg-[#EFF0F3] border-[#000000] border-1 rounded-xl p-6">
        <div className="flex justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-[#12BAB0] mb-4">
            Question {index + 1}
          </h2>
          <Edit2
            className="ml-2 sm:ml-4 mt-2 text-[#222222] cursor-pointer flex-shrink-0"
            size={20}
            onClick={() => setIsEditing(true)}
          />
        </div>

        <h1 className="text-[#4E4E4E] text-xl font-bold">{localData.question}</h1>

        <div className="mt-4 flex flex-col gap-4">
          {localData.options.map((opt, i) => (
            <label key={`${localData.id}-${i}`} className="flex items-center gap-2 text-[#4C4D4E] text-sm">
              <input type="radio" name={`answer-${index}`} value={opt} />
              {opt}
            </label>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-4">
          <span className="w-36 sm:w-40 text-[#4C4D4E] text-sm sm:text-base font-bold flex items-center gap-2 whitespace-nowrap flex-shrink-0">
            <Timer size={18} className="text-[#12BAB0] flex-shrink-0" />
            Active Timer:
          </span>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold shadow-2xs">
              ⏱ {localData.timer || 30} seconds
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3">
          <span className="w-36 sm:w-40 text-[#222222] text-sm sm:text-base font-bold whitespace-nowrap flex items-center gap-2 flex-shrink-0">
            <Link2 size={18} className="text-[#12BAB0] flex-shrink-0" />
            Source Link:
          </span>
          <div className="flex-1">
            {localData.source && localData.source.trim() ? (
              <a
                href={localData.source.startsWith("http") ? localData.source : `https://${localData.source}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#1C77FF] hover:underline text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 break-all"
              >
                {localData.source} <ExternalLink size={13} />
              </a>
            ) : (
              <span className="text-gray-400 text-xs sm:text-sm italic">
                No source link attached
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitedQuestion;
