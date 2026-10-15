"use client";

import React, { useRef } from "react";
import { Calendar, Clock } from "lucide-react";

export default function QuestionDeadline({ value, onChange }) {
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    onChange?.({ ...value, date: newDate });
  };

  const handleTimeChange = (e) => {
    const newTime = e.target.value;
    onChange?.({ ...value, time: newTime });
  };

  const openDatePicker = (e) => {
    e?.stopPropagation?.();
    try {
      if (dateInputRef.current) {
        if (typeof dateInputRef.current.showPicker === "function") {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      }
    } catch (_) {}
  };

  const openTimePicker = (e) => {
    e?.stopPropagation?.();
    try {
      if (timeInputRef.current) {
        if (typeof timeInputRef.current.showPicker === "function") {
          timeInputRef.current.showPicker();
        } else {
          timeInputRef.current.focus();
        }
      }
    } catch (_) {}
  };

  return (
    <div className="mt-2">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Date Input */}
        <div
          onClick={openDatePicker}
          className="relative cursor-pointer group"
        >
          <input
            ref={dateInputRef}
            type="date"
            value={value?.date || ""}
            onChange={handleDateChange}
            onClick={openDatePicker}
            className="
              w-full
              border
              border-gray-300
              text-[#222222]
              rounded-full
              px-4 py-2 pr-10
              text-sm
              focus:outline-none
              focus:ring-2
              focus:ring-[#12BAB0]
              bg-white
              cursor-pointer
              [&::-webkit-calendar-picker-indicator]:opacity-0
              [&::-webkit-calendar-picker-indicator]:cursor-pointer
              [&::-webkit-calendar-picker-indicator]:absolute
              [&::-webkit-calendar-picker-indicator]:inset-0
              [&::-webkit-calendar-picker-indicator]:w-full
              [&::-webkit-calendar-picker-indicator]:h-full
            "
          />
          <Calendar
            size={16}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4E4E4E] group-hover:text-[#12BAB0] transition-colors pointer-events-none"
          />
        </div>

        {/* Time Input */}
        <div
          onClick={openTimePicker}
          className="relative cursor-pointer group"
        >
          <input
            ref={timeInputRef}
            type="time"
            value={value?.time || ""}
            onChange={handleTimeChange}
            onClick={openTimePicker}
            className="
              w-full
              border
              border-gray-300
              text-[#222222]
              rounded-full
              px-4 py-2 pr-10
              text-sm
              focus:outline-none
              focus:ring-2
              focus:ring-[#12BAB0]
              bg-white
              cursor-pointer
              [&::-webkit-calendar-picker-indicator]:opacity-0
              [&::-webkit-calendar-picker-indicator]:cursor-pointer
              [&::-webkit-calendar-picker-indicator]:absolute
              [&::-webkit-calendar-picker-indicator]:inset-0
              [&::-webkit-calendar-picker-indicator]:w-full
              [&::-webkit-calendar-picker-indicator]:h-full
            "
          />
          <Clock
            size={16}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4E4E4E] group-hover:text-[#12BAB0] transition-colors pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}
