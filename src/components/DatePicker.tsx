import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string; // Expects "dd/mm/yyyy" or "yyyy-mm-dd"
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  align?: 'left' | 'right';
}

function parseDateString(str: string) {
  if (!str) return null;
  const s = str.trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return { day: d, month: m, year: y };
      }
    }
  } else if (s.includes('-')) {
    const parts = s.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return { day: d, month: m, year: y };
      }
    }
  }
  return null;
}

function formatDateString(day: number, month: number, year: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(day)}/${pad(month)}/${year}`;
}

export default function DatePicker({ value, onChange, placeholder = "dd/mm/yyyy", required = false, align = 'left' }: DatePickerProps) {
  const [inputValue, setInputValue] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Calendar viewport state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize internal input text with prop value
  useEffect(() => {
    if (!value) {
      setInputValue('');
      return;
    }
    const parsed = parseDateString(value);
    if (parsed) {
      setInputValue(formatDateString(parsed.day, parsed.month, parsed.year));
    } else {
      setInputValue(value);
    }
  }, [value]);

  // Sync calendar picker viewport when calendar is opened or value changes
  useEffect(() => {
    if (showCalendar && value) {
      const parsed = parseDateString(value);
      if (parsed) {
        setCurrentMonth(parsed.month - 1);
        setCurrentYear(parsed.year);
      }
    }
  }, [showCalendar, value]);

  // Click outside to close calendar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let text = e.target.value;
    
    // Auto-insert slashes for easier typing (e.g. typing "1203" becomes "12/03/")
    // Only apply if user is typing forward (not pressing backspace)
    if (text.length > inputValue.length) {
      // Remove non-digits for formatting
      const clean = text.replace(/\D/g, '');
      if (clean.length > 0) {
        let formatted = '';
        if (clean.length <= 2) {
          formatted = clean;
        } else if (clean.length <= 4) {
          formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
        } else {
          formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`;
        }
        text = formatted;
      }
    }

    setInputValue(text);
    
    // Validate and push update up if complete
    const parsed = parseDateString(text);
    if (parsed && parsed.year >= 1900 && parsed.year <= 2100 && parsed.month >= 1 && parsed.month <= 12 && parsed.day >= 1 && parsed.day <= 31) {
      onChange(formatDateString(parsed.day, parsed.month, parsed.year));
    } else if (text === '') {
      onChange('');
    }
  };

  const handleBlur = () => {
    // If the typed date is invalid on blur, reset to current selected date
    if (inputValue !== '') {
      const parsed = parseDateString(inputValue);
      if (!parsed || parsed.year < 1900 || parsed.year > 2100 || parsed.month < 1 || parsed.month > 12 || parsed.day < 1 || parsed.day > 31) {
        // Reset to original value or clear
        if (value) {
          const originalParsed = parseDateString(value);
          if (originalParsed) {
            setInputValue(formatDateString(originalParsed.day, originalParsed.month, originalParsed.year));
          }
        } else {
          setInputValue('');
          onChange('');
        }
      }
    }
  };

  const handleSelectDay = (day: number) => {
    const formatted = formatDateString(day, currentMonth + 1, currentYear);
    setInputValue(formatted);
    onChange(formatted);
    setShowCalendar(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInputValue('');
    onChange('');
    setShowCalendar(false);
  };

  const handleToday = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
    const formatted = formatDateString(today.getDate(), today.getMonth() + 1, today.getFullYear());
    setInputValue(formatted);
    onChange(formatted);
    setShowCalendar(false);
  };

  // Generate days grid for currentMonth & currentYear
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayIndex = (month: number, year: number) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDayIndex = getFirstDayIndex(currentMonth, currentYear);
  
  // Previous month padding days
  const prevMonthDaysCount = currentMonth === 0 ? getDaysInMonth(11, currentYear - 1) : getDaysInMonth(currentMonth - 1, currentYear);
  const paddingDays = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    paddingDays.push(prevMonthDaysCount - i);
  }

  // Current month days
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const selectedDate = parseDateString(value);
  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.day === day && selectedDate.month === (currentMonth + 1) && selectedDate.year === currentYear;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  };

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  // Quick years generator (from 2020 to 2035)
  const yearsList = [];
  for (let y = 2020; y <= 2035; y++) {
    yearsList.push(y);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          required={required}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onClick={() => setShowCalendar(true)}
          className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-all cursor-pointer shadow-xs"
        />
        <div className="absolute right-3 top-3.5 flex items-center gap-1.5">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
          >
            <CalendarIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showCalendar && (
        <div 
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-4 transition-all duration-200 animate-fadeIn`}
          style={{ boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
        >
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800/60">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex gap-2">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-150 dark:border-slate-800 focus:outline-none cursor-pointer"
              >
                {monthNames.map((name, idx) => (
                  <option key={name} value={idx} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-150 dark:border-slate-800 focus:outline-none cursor-pointer"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-450 dark:text-slate-500 mb-2 uppercase tracking-wider">
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
            <span className="text-rose-500 dark:text-rose-400">CN</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Previous month padding */}
            {paddingDays.map((d, i) => (
              <span key={`pad-${i}`} className="py-1 text-xs text-slate-300 dark:text-slate-700 font-medium select-none">
                {d}
              </span>
            ))}

            {/* Current month days */}
            {days.map((d) => {
              const selected = isSelected(d);
              const today = isToday(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selected
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500 shadow-md shadow-indigo-100 dark:shadow-none'
                      : today
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Bottom actions footer */}
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-200 font-semibold cursor-pointer py-1 px-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              Xóa ngày
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-indigo-600 dark:text-indigo-400 font-bold cursor-pointer py-1 px-2.5 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
