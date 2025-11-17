"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarProps {
  mode?: "single" | "range";
  selected?: Date | { from: Date; to: Date } | undefined;
  onSelect?: ((date: Date | undefined) => void) | ((range: { from: Date; to: Date } | undefined) => void);
  className?: string;
  disabled?: (date: Date) => boolean;
}

function Calendar({
  mode = "single",
  selected,
  onSelect,
  className = "",
  disabled,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    if (selected) {
      if (mode === "single" && selected instanceof Date) {
        return new Date(selected.getFullYear(), selected.getMonth(), 1);
      } else if (mode === "range" && typeof selected === "object" && "from" in selected && selected.from) {
        return new Date(selected.from.getFullYear(), selected.from.getMonth(), 1);
      }
    }
    return new Date();
  });
  const [rangeStart, setRangeStart] = React.useState<Date | null>(
    mode === "range" && selected && typeof selected === "object" && "from" in selected
      ? selected.from
      : null
  );

  const monthStart = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );
  const monthEnd = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  );
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const days: Date[] = [];
  const currentDate = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const isSelected = (date: Date): boolean => {
    if (!selected) return false;
    if (mode === "single") {
      const selectedDate = selected as Date;
      return (
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear()
      );
    } else {
      const range = selected as { from: Date; to: Date };
      return (
        (range.from &&
          date.getDate() === range.from.getDate() &&
          date.getMonth() === range.from.getMonth() &&
          date.getFullYear() === range.from.getFullYear()) ||
        (range.to &&
          date.getDate() === range.to.getDate() &&
          date.getMonth() === range.to.getMonth() &&
          date.getFullYear() === range.to.getFullYear())
      );
    }
  };

  const isInRange = (date: Date): boolean => {
    if (mode !== "range" || !selected) return false;
    const range = selected as { from: Date; to: Date };
    if (!range.from || !range.to) return false;
    return date >= range.from && date <= range.to;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const handleDateClick = (date: Date) => {
    if (disabled && disabled(date)) return;

    if (mode === "single") {
      onSelect?.(date as any);
    } else {
      if (!rangeStart || (rangeStart && date < rangeStart)) {
        setRangeStart(date);
        onSelect?.({ from: date, to: date } as any);
      } else {
        onSelect?.({ from: rangeStart, to: date } as any);
        setRangeStart(null);
      }
    }
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={`p-3 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-medium">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <button
          onClick={nextMonth}
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="w-full">
        <div className="grid grid-cols-7 gap-0 mb-1">
          {dayNames.map((day) => (
            <div
              key={day}
              className="h-9 flex items-center justify-center text-xs font-medium text-gray-500"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0">
          {days.map((date, index) => {
            const selected = isSelected(date);
            const inRange = isInRange(date);
            const today = isToday(date);
            const currentMonth = isCurrentMonth(date);
            const isDisabled = disabled ? disabled(date) : false;

            return (
              <button
                key={index}
                onClick={() => handleDateClick(date)}
                disabled={isDisabled}
                className={`
                  h-9 w-9 flex items-center justify-center text-sm rounded-md
                  transition-colors
                  ${!currentMonth ? "text-gray-400" : "text-gray-900"}
                  ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-100"}
                  ${selected ? "bg-black text-white hover:bg-gray-800" : ""}
                  ${inRange && !selected ? "bg-gray-200" : ""}
                  ${today && !selected ? "bg-gray-200 font-semibold" : ""}
                `}
                type="button"
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
