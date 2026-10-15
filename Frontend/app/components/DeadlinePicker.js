"use client";

import React, { useRef } from "react";
import { Calendar, Clock } from "lucide-react";

export default function DeadlinePicker({ value, onChange }) {
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);

  const date = value?.date || "";
  const time = value?.time || "";

  const handleDateChange = (newDate) => {
    onChange?.({ ...value, date: newDate, time });
  };

  const handleTimeChange = (newTime) => {
    onChange?.({ ...value, date, time: newTime });
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
    <div className="mt-1.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Date Input */}
        <div
          onClick={openDatePicker}
          className="relative cursor-pointer group"
        >
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            onClick={openDatePicker}
            className="
              w-full
              border
              border-gray-300
              text-[#222222]
              rounded-full
              px-4 py-2.5 pr-10
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
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            onClick={openTimePicker}
            className="
              w-full
              border
              border-gray-300
              text-[#222222]
              rounded-full
              px-4 py-2.5 pr-10
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
            placeholder="hh:mm"
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
