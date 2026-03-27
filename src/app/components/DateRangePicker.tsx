import React, { useState, useEffect, useRef } from 'react';
import {
  format,
  parseISO,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  isBefore,
  isAfter,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toStr(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function parseOrNull(s: string): Date | null {
  if (!s) return null;
  try { return parseISO(s); } catch { return null; }
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  onClose,
}: DateRangePickerProps) {
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    return parseOrNull(startDate) ?? new Date();
  });

  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectingEnd, setSelectingEnd] = useState<boolean>(!!startDate && !endDate);

  const start = parseOrNull(startDate);
  const end = parseOrNull(endDate);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth)),
    end: endOfWeek(endOfMonth(viewMonth)),
  });

  const handleDayClick = (day: Date) => {
    if (!start || (start && end)) {
      // Start fresh selection
      onChange(toStr(day), '');
      setSelectingEnd(true);
    } else {
      // We have start but no end
      if (isBefore(day, start)) {
        // Clicked before start → new start
        onChange(toStr(day), '');
        setSelectingEnd(true);
      } else if (isSameDay(day, start)) {
        // Deselect
        onChange('', '');
        setSelectingEnd(false);
      } else {
        // Set end
        onChange(startDate, toStr(day));
        setSelectingEnd(false);
        setTimeout(() => onClose(), 120);
      }
    }
  };

  const isInRange = (day: Date): boolean => {
    const rangeEnd = selectingEnd && hoverDate && start
      ? (isBefore(hoverDate, start) ? start : hoverDate)
      : end;
    if (!start || !rangeEnd) return false;
    return isWithinInterval(day, {
      start: isBefore(start, rangeEnd) ? start : rangeEnd,
      end: isBefore(start, rangeEnd) ? rangeEnd : start,
    });
  };

  const isRangeStart = (day: Date): boolean => {
    if (!start) return false;
    if (end) return isSameDay(day, start);
    if (selectingEnd && hoverDate) {
      if (isBefore(hoverDate, start)) return isSameDay(day, hoverDate);
      return isSameDay(day, start);
    }
    return isSameDay(day, start);
  };

  const isRangeEnd = (day: Date): boolean => {
    if (end) return isSameDay(day, end);
    if (selectingEnd && hoverDate && start) {
      if (isBefore(hoverDate, start)) return isSameDay(day, start);
      return isSameDay(day, hoverDate);
    }
    return false;
  };

  const rangeEndDate = selectingEnd && hoverDate && start
    ? (isBefore(hoverDate, start) ? start : hoverDate)
    : end;

  const isEdge = (day: Date) => isRangeStart(day) || isRangeEnd(day);

  const getDayClasses = (day: Date): string => {
    const inRange = isInRange(day);
    const edge = isEdge(day);
    const today = isToday(day);
    const inMonth = isSameMonth(day, viewMonth);

    let cell = 'relative z-10 w-9 h-9 flex items-center justify-center text-sm select-none transition-all duration-100 ';

    if (edge) {
      cell += 'text-white font-semibold ';
    } else if (inRange) {
      cell += `${inMonth ? 'text-indigo-900' : 'text-indigo-400'} `;
    } else if (!inMonth) {
      cell += 'text-gray-300 ';
    } else if (today) {
      cell += 'text-indigo-600 font-semibold ';
    } else {
      cell += 'text-gray-700 ';
    }

    return cell;
  };

  const getBgClasses = (day: Date): string => {
    const inRange = isInRange(day);
    const rStart = isRangeStart(day);
    const rEnd = isRangeEnd(day);

    if (rStart && rEnd) return 'bg-indigo-600 rounded-full';
    if (rStart) return 'bg-indigo-600 rounded-l-full rounded-r-none';
    if (rEnd) return 'bg-indigo-600 rounded-r-full rounded-l-none';
    if (inRange) return 'bg-indigo-100 rounded-none';
    return '';
  };

  const statusText = (() => {
    if (!start && !end) return 'Select a start date';
    if (start && !end) return selectingEnd ? 'Now select an end date' : 'Select a start date';
    if (start && end) return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    return '';
  })();

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.25)' }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={overlayRef}
        className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden"
        style={{ animation: 'calendarIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-indigo-200" />
              <span className="text-indigo-200 text-xs uppercase tracking-wider">Date Range</span>
            </div>
            <button
              onClick={onClose}
              className="text-indigo-200 hover:text-white transition-colors rounded-full p-0.5"
            >
              <X size={15} />
            </button>
          </div>
          <div className="text-white text-sm font-medium min-h-[1.4rem]">{statusText}</div>

          {/* Range pills */}
          <div className="flex items-center gap-2 mt-3">
            <div className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              !start || (start && !end && selectingEnd)
                ? 'bg-white/20 text-white ring-1 ring-white/50'
                : 'bg-white/10 text-indigo-100'
            }`}>
              {start ? format(start, 'MMM d, yyyy') : <span className="text-indigo-300">Start date</span>}
            </div>
            <ChevronRight size={14} className="text-indigo-300 flex-shrink-0" />
            <div className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              start && !end && selectingEnd
                ? 'bg-white/10 text-indigo-200'
                : end
                ? 'bg-white/10 text-indigo-100'
                : 'bg-white/10 text-indigo-300'
            }`}>
              {end ? format(end, 'MMM d, yyyy') : <span className="text-indigo-400">End date</span>}
            </div>
          </div>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <button
            onClick={() => setViewMonth(m => subMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-800">
            {format(viewMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setViewMonth(m => addMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="px-4 pt-3 pb-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="h-8 flex items-center justify-center text-xs text-gray-400 font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {days.map(day => {
              const bg = getBgClasses(day);
              const cell = getDayClasses(day);
              const inMonth = isSameMonth(day, viewMonth);

              return (
                <div
                  key={toStr(day)}
                  className={`relative h-9 flex items-center justify-center cursor-pointer ${
                    !inMonth ? 'pointer-events-none' : 'hover:z-20'
                  } ${bg}`}
                  onClick={() => inMonth && handleDayClick(day)}
                  onMouseEnter={() => inMonth && setHoverDate(day)}
                  onMouseLeave={() => setHoverDate(null)}
                >
                  <div className={`${cell} ${
                    !isEdge(day) && inMonth ? 'hover:bg-gray-100 rounded-full' : ''
                  } ${isEdge(day) ? 'rounded-full w-9 h-9' : ''}`}>
                    {format(day, 'd')}
                    {isToday(day) && !isEdge(day) && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-400 rounded-full" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <button
            onClick={() => { onChange('', ''); setSelectingEnd(false); }}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            disabled={!start || !end}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              start && end
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>

      <style>{`
        @keyframes calendarIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
