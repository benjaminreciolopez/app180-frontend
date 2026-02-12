"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  selected: string[]; // ISO strings YYYY-MM-DD
  onSelect: (dates: string[]) => void;
  className?: string;
}

export default function SimpleMultiselectCalendar({ selected, onSelect, className = "" }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }), // Lunes
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
  });

  const toggleDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    if (selected.includes(dateStr)) {
      onSelect(selected.filter(d => d !== dateStr));
    } else {
      onSelect([...selected, dateStr]);
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className={`p-4 bg-white border rounded-lg shadow-sm w-full max-w-sm mx-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
            type="button"
            onClick={prevMonth} 
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="font-semibold text-gray-800 capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </span>
        <button 
            type="button"
            onClick={nextMonth} 
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 mb-2">
        {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
          <div key={day} className="text-center text-xs font-bold text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((day, i) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const isSelected = selected.includes(dayStr);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isDayToday = isToday(day);

          return (
            <button
              key={dayStr}
              type="button"
              onClick={() => toggleDate(day)}
              className={`
                h-9 w-9 text-sm rounded-full flex items-center justify-center transition-all duration-200
                ${!isCurrentMonth ? "text-gray-300" : "text-gray-700"}
                ${isSelected 
                    ? "bg-blue-600 text-white font-bold shadow-md transform scale-105" 
                    : "hover:bg-blue-50"}
                ${isDayToday && !isSelected ? "border-2 border-blue-400 font-semibold" : ""}
              `}
            >
              <time dateTime={dayStr}>{format(day, "d")}</time>
            </button>
          );
        })}
      </div>
      
      <div className="mt-3 text-center">
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
                {selected.length} {selected.length === 1 ? 'día seleccionado' : 'días seleccionados'}
            </span>
      </div>
    </div>
  );
}
