import React, { useState, useMemo, useEffect } from 'react';
import { Employee, TimeLog, DailyStatus } from '../types';
import { getVietnamHolidayName } from '../holidays';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar as CalendarIcon, Clock, AlertCircle, ArrowLeft, CheckCircle2, UserCheck, Key, ShieldAlert, LogOut, Download, Activity, Sun, Moon, BookOpen, X } from 'lucide-react';
import UserGuide from './UserGuide';

interface EmployeePortalProps {
  employees: Employee[];
  timeLogs: TimeLog[];
  isLoading?: boolean;
  onBackToLogin?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  accountantKey?: string;
  departmentPassword?: string;
}

// Helper to calculate OT hours from 'otFrom' and 'otTo'
function calculateOtHours(from: string, to: string): number {
  if (!from || !to) return 0;
  try {
    const [hFrom, mFrom] = from.split(':').map(Number);
    const [hTo, mTo] = to.split(':').map(Number);
    if (isNaN(hFrom) || isNaN(mFrom) || isNaN(hTo) || isNaN(mTo)) return 0;

    let diffMinutes = (hTo * 60 + mTo) - (hFrom * 60 + mFrom);
    if (diffMinutes < 0) {
      // Overnight OT (e.g. 22:00 to 02:00 next day)
      diffMinutes += 24 * 60;
    }
    return Math.max(0, diffMinutes / 60);
  } catch {
    return 0;
  }
}

// Helper to parse registered date format (e.g. "08/07/2026" or "2026-07-08")
function parseRegisteredDate(dateStr: string) {
  if (!dateStr || dateStr.trim() === "" || dateStr.includes("Chưa")) {
    return { day: 1, month: 1, year: 2026 };
  }
  try {
    if (dateStr.includes('/')) {
      const parts = dateStr.trim().split('/');
      return {
        day: parseInt(parts[0], 10) || 1,
        month: parseInt(parts[1], 10) || 1,
        year: parseInt(parts[2], 10) || 2026
      };
    } else if (dateStr.includes('-')) {
      const parts = dateStr.trim().split('-');
      return {
        year: parseInt(parts[0], 10) || 2026,
        month: parseInt(parts[1], 10) || 1,
        day: parseInt(parts[2], 10) || 1
      };
    }
  } catch {
    return { day: 1, month: 1, year: 2026 };
  }
  return { day: 1, month: 1, year: 2026 };
}

// Helper to check if a date is before the registered start date
function isDateBeforeRegistered(year: number, month: number, day: number, registeredAtStr: string): boolean {
  const parsedReg = parseRegisteredDate(registeredAtStr);
  if (!parsedReg) return false;
  
  if (year < parsedReg.year) return true;
  if (year > parsedReg.year) return false;
  
  if (month < parsedReg.month) return true;
  if (month > parsedReg.month) return false;
  
  return day < parsedReg.day;
}

// Helper to check if a date is after the resignation/leave date
function isDateAfterLeft(year: number, month: number, day: number, leftAtStr?: string): boolean {
  if (!leftAtStr) return false;
  const parsedLeft = parseRegisteredDate(leftAtStr);
  if (!parsedLeft) return false;
  
  if (year > parsedLeft.year) return true;
  if (year < parsedLeft.year) return false;
  
  if (month > parsedLeft.month) return true;
  if (month < parsedLeft.month) return false;
  
  return day > parsedLeft.day;
}

// Helper to remove accents/diacritics for flexible search
function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u0301-\u0303-\u0309-\u0323]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export default function EmployeePortal({ 
  employees, 
  timeLogs, 
  isLoading = false,
  onBackToLogin,
  isDarkMode,
  onToggleDarkMode,
  accountantKey = 'visual-accounting',
  departmentPassword = ''
}: EmployeePortalProps) {
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmpName, setSelectedEmpName] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter employees matching query
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = removeVietnameseDiacritics(searchQuery.toLowerCase().trim());
    return employees.filter(emp => {
      const nameClean = removeVietnameseDiacritics(emp.name.toLowerCase());
      const roleClean = emp.role ? removeVietnameseDiacritics(emp.role.toLowerCase()) : '';
      return nameClean.includes(query) || roleClean.includes(query);
    });
  }, [searchQuery, employees]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  const totalDaysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedMonth, selectedYear]);

  // Find selected employee object
  const selectedEmployee = useMemo(() => {
    if (!selectedEmpName) return null;
    return employees.find(emp => emp.name.trim().toLowerCase() === selectedEmpName.trim().toLowerCase()) || null;
  }, [selectedEmpName, employees]);

  // Log guest lookup event to server to satisfy "tôi cần cái gì để theo dõi... ai xem"
  useEffect(() => {
    if (selectedEmpName) {
      fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: `${selectedEmpName} (Nhân viên)`,
          action: 'Tra cứu công phép hằng tháng',
          details: `Xem thông tin Tháng ${selectedMonth}/${selectedYear}`
        })
      }).catch(err => console.error("Lỗi ghi nhận audit log:", err));
    }
  }, [selectedEmpName, selectedMonth, selectedYear]);

  // Compute monthly calculations for selected employee
  const employeeReport = useMemo(() => {
    if (!selectedEmpName || !selectedEmployee) return null;

    const monthStr = String(selectedMonth).padStart(2, '0');
    
    // Filter logs for selected employee, month, and year
    const monthlyLogs = timeLogs.filter(log => {
      const [y, m] = log.date.split('-');
      return (
        parseInt(y) === selectedYear &&
        parseInt(m) === selectedMonth &&
        log.employeeName.trim().toLowerCase() === selectedEmpName.trim().toLowerCase()
      );
    });

    // Initialize daily status calendar grid
    const dailyDetails: { [day: number]: DailyStatus } = {};
    
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${selectedYear}-${monthStr}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
      const isWeekend = dayOfWeek === 0; // Sunday only
      const holidayName = getVietnamHolidayName(dateStr);

      const dayLog = monthlyLogs.find(l => l.date === dateStr);

      let status: DailyStatus['status'] = holidayName ? 'Ngày lễ' : (isWeekend ? 'Nghỉ cuối tuần' : 'Có đi làm');
      let otFrom = '';
      let otTo = '';
      let note = holidayName || '';

      const isBeforeStart = selectedEmployee?.registeredAt 
        ? isDateBeforeRegistered(selectedYear, selectedMonth, d, selectedEmployee.registeredAt)
        : false;
      const isAfterResigned = selectedEmployee?.leftAt
        ? isDateAfterLeft(selectedYear, selectedMonth, d, selectedEmployee.leftAt)
        : false;

      if (dayLog) {
        if (dayLog.status === 'Không đi làm' && holidayName) {
          status = 'Ngày lễ';
        } else if (dayLog.status === 'Không đi làm' && isWeekend) {
          status = 'Nghỉ cuối tuần';
        } else {
          status = dayLog.status;
        }
        otFrom = dayLog.otFrom || '';
        otTo = dayLog.otTo || '';
        note = dayLog.note || holidayName || '';
      } else if (isBeforeStart) {
        status = 'Chưa vào làm';
      } else if (isAfterResigned) {
        status = 'Đã nghỉ việc';
      }

      dailyDetails[d] = {
        date: dateStr,
        status,
        otFrom,
        otTo,
        note,
        holidayName: holidayName || undefined
      };
    }

    // Aggregations
    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let holidayDays = 0;
    let totalOtHours = 0;

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const detail = dailyDetails[d];
      const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
      const isWeekend = dayOfWeek === 0; // Sunday only

      if (detail.status === 'Có đi làm') {
        presentDays++;
        if (detail.otFrom && detail.otTo) {
          totalOtHours += calculateOtHours(detail.otFrom, detail.otTo);
        } else if (dayOfWeek === 0) {
          totalOtHours += 8; // Sunday default
        }
      } else if (detail.status === 'Không đi làm') {
        if (!isWeekend) {
          absentDays++;
        }
      } else if (detail.status === 'Nghỉ phép') {
        leaveDays++;
      } else if (detail.status === 'Ngày lễ') {
        holidayDays++;
      }
    }

    // YTD Leave Balance (according to standard 1 day per month rule for the whole selected year)
    const parsedReg = parseRegisteredDate(selectedEmployee.registeredAt);
    const regMonth = parsedReg && parsedReg.year === selectedYear ? parsedReg.month : 1;
    const regYear = parsedReg ? parsedReg.year : selectedYear;

    let monthsWorkedInSelectedYear = 12;
    if (selectedYear < regYear) {
      monthsWorkedInSelectedYear = 0;
    } else if (selectedYear === regYear) {
      monthsWorkedInSelectedYear = Math.max(0, 12 - regMonth + 1);
    } else {
      monthsWorkedInSelectedYear = 12;
    }

    // Find all 'Nghỉ phép' logs for this employee in selectedYear (entire year)
    const ytdLeaveLogs = timeLogs.filter(log => {
      const [y, m] = log.date.split('-');
      const logYear = parseInt(y, 10);
      return (
        logYear === selectedYear &&
        log.employeeName.trim().toLowerCase() === selectedEmpName.trim().toLowerCase() &&
        log.status === 'Nghỉ phép'
      );
    }).sort((a, b) => b.date.localeCompare(a.date));

    const initialCarryover = (() => {
      if (selectedYear !== 2026) return 0;
      if (selectedEmployee?.leaveCarryover !== undefined) return selectedEmployee.leaveCarryover;
      const nameLower = selectedEmpName.toLowerCase();
      if (nameLower.includes('vũ') || nameLower.includes('vu')) return 12;
      if (nameLower.includes('dũng') || nameLower.includes('dung')) return 10;
      if (nameLower.includes('hảo') || nameLower.includes('hao')) return 6;
      return 0;
    })();

    // Divide logs by Tet 2026 boundary (Feb 17, 2026)
    const beforeTetLogs = ytdLeaveLogs.filter(log => {
      if (selectedYear !== 2026) return false;
      return log.date < '2026-02-17';
    });
    const onOrAfterTetLogs = ytdLeaveLogs.filter(log => {
      if (selectedYear !== 2026) return true;
      return log.date >= '2026-02-17';
    });

    const leaveUsedBeforeTet = beforeTetLogs.length;
    const leaveUsedAfterTet = onOrAfterTetLogs.length;

    // 2025 carryover is consumed by leave before Tet
    const carryoverUsed = Math.min(initialCarryover, leaveUsedBeforeTet);
    const carryoverExpired = initialCarryover - carryoverUsed; // Forfeited after Tet
    const excessBeforeTet = Math.max(0, leaveUsedBeforeTet - initialCarryover);

    // Base entitlement for selectedYear
    const baseEntitlement = selectedEmployee?.leaveAllowance !== undefined 
      ? selectedEmployee.leaveAllowance 
      : monthsWorkedInSelectedYear;

    // Excess before Tet and all after Tet are deducted from base entitlement
    const leaveRemaining = baseEntitlement - (excessBeforeTet + leaveUsedAfterTet);
    const leaveEntitlement = baseEntitlement + carryoverUsed;
    const leaveUsed = ytdLeaveLogs.length;

    return {
      totalDays: totalDaysInMonth,
      presentDays,
      absentDays,
      leaveDays,
      holidayDays,
      totalOtHours,
      monthlyLogs,
      dailyDetails,
      monthsWorkedInSelectedYear,
      leaveEntitlement,
      leaveUsed,
      leaveRemaining,
      ytdLeaveLogs,
      initialCarryover,
      carryoverUsed,
      carryoverExpired,
      baseEntitlement,
      leaveUsedBeforeTet,
      leaveUsedAfterTet
    };
  }, [selectedEmpName, selectedEmployee, selectedMonth, selectedYear, totalDaysInMonth, timeLogs]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Top Welcome Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6">
        <div>
          <span className="text-indigo-600 dark:text-indigo-400 text-xs font-bold font-mono tracking-wider uppercase block mb-1">
            Cổng Tra Cứu Thông Tin Cá Nhân
          </span>
          <h1 id="portal-title" className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans flex items-center gap-2">
            📊 Tra Cứu Công & Phép Phòng Visual
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Xem nhanh bảng công, số ngày nghỉ phép, số giờ tăng ca (OT) hằng tháng bảo mật.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleDarkMode && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleDarkMode}
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-orange-500/10 dark:hover:from-amber-500/20 dark:hover:to-orange-500/20 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold hover:border-amber-500/30 dark:hover:border-amber-500/30 overflow-hidden relative"
              title="Chuyển đổi giao diện"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isDarkMode ? "sun" : "moon"}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1.5"
                >
                  {isDarkMode ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Sáng</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Tối</span>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/30 dark:border-indigo-900/30 rounded-2xl transition-colors shrink-0 cursor-pointer shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Hướng dẫn</span>
          </motion.button>

          {onBackToLogin && (
            <motion.button
              whileHover={{ scale: 1.03, x: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBackToLogin}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-colors shrink-0 cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại trang đăng nhập</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Employee Selector Card */}
      <AnimatePresence mode="wait">
        {!selectedEmpName ? (
          <motion.div
            key="selector"
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -15 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[32px] p-6 shadow-xl space-y-6 max-w-xl mx-auto text-center"
          >
            {isLoading ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500">Đang tải dữ liệu chấm công từ máy chủ...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-left space-y-2 mb-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-extrabold text-xs">
                  <span>⚠️ Hệ thống chưa có dữ liệu đồng bộ</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
                  Hiện tại máy chủ đang trống (chưa có nhân viên nào được tải lên).
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Để tra cứu thông tin, <b>Quản trị viên (Admin)</b> cần truy cập vào ứng dụng bằng tài khoản Google một lần để thiết lập ban đầu và nhấn nút <b>Đồng bộ</b> để kéo dữ liệu từ Google Sheets lên máy chủ. Khi đó mọi người sẽ tra cứu được ngay!
                </p>
              </div>
            ) : null}

            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto cursor-pointer shadow-sm"
            >
              <UserCheck className="w-7 h-7" />
            </motion.div>
            
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-850 dark:text-white">Xác định danh tính của bạn</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Nhập tên hoặc chức vụ của bạn để tìm kiếm hồ sơ chấm công cá nhân.
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Nhập họ và tên đầy đủ..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none text-slate-850 dark:text-slate-100 shadow-inner font-semibold transition-all"
              />

              {/* Dropdown Results */}
              {showDropdown && searchQuery.trim() !== '' && (
                <div className="absolute z-20 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-left">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-4 text-xs text-slate-400 dark:text-slate-500 text-center italic">
                      Không tìm thấy nhân viên nào phù hợp
                    </div>
                  ) : (
                    filteredEmployees.map((emp, idx) => (
                      <motion.button
                        key={emp.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        whileHover={{ x: 6, backgroundColor: "rgba(99, 102, 241, 0.06)" }}
                        onClick={() => {
                          setSelectedEmpName(emp.name);
                          setSearchQuery('');
                          setShowDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-xs flex justify-between items-center text-slate-700 dark:text-slate-200 font-sans cursor-pointer text-left focus:outline-none"
                      >
                        <span className="font-bold">{emp.name}</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-semibold">{emp.role || "Nhân sự"}</span>
                      </motion.button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 text-left">
              <span className="block text-[10px] font-bold text-slate-440 dark:text-slate-500 mb-2 uppercase tracking-wide">
                👥 Danh sách nhân viên phòng Visual:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {employees.map((emp, idx) => (
                  <motion.button
                    key={emp.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.02, type: "spring", stiffness: 350, damping: 25 }}
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedEmpName(emp.name)}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-sky-500 hover:text-white dark:bg-slate-950 dark:hover:from-indigo-500 dark:hover:to-sky-450 dark:hover:text-white text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded-xl border border-slate-200/40 dark:border-slate-800/80 transition-all cursor-pointer shadow-sm hover:shadow-indigo-500/15"
                  >
                    {emp.name}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          // Detailed Employee View
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="space-y-6"
          >
          {/* Back button & title */}
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm">
            <button
              onClick={() => setSelectedEmpName(null)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Chọn nhân sự khác</span>
            </button>
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              Nhân viên: <span className="text-slate-850 dark:text-slate-200 font-extrabold">{selectedEmpName}</span>
            </span>
          </div>

          {/* Employee profile metadata */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-[32px] p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-extrabold text-white text-xl shadow-lg">
                {selectedEmpName.charAt(0)}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black tracking-tight">{selectedEmpName}</h3>
                <p className="text-xs text-indigo-100 flex items-center gap-1.5">
                  <span>Chức vụ: <b>{selectedEmployee?.role || "Nhân viên"}</b></span>
                  <span>•</span>
                  <span>Ngày vào làm: <b>{selectedEmployee?.registeredAt || "Chưa thiết lập"}</b></span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <span className="text-xs font-bold">Tháng truy xuất:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3.5 py-1.5 text-xs bg-white/10 hover:bg-white/15 border border-white/20 rounded-full focus:outline-none focus:ring-2 focus:ring-white/40 text-white font-extrabold cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1} className="text-slate-800">Tháng {i + 1}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3.5 py-1.5 text-xs bg-white/10 hover:bg-white/15 border border-white/20 rounded-full focus:outline-none focus:ring-2 focus:ring-white/40 text-white font-extrabold cursor-pointer"
              >
                {years.map(y => (
                  <option key={y} value={y} className="text-slate-800">Năm {y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Monthly KPI Overview Cards */}
          {employeeReport && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4.5 rounded-2xl shadow-sm flex items-center gap-3 cursor-pointer"
              >
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Ngày đi làm</span>
                  <span className="text-sm font-extrabold text-slate-850 dark:text-white block">{employeeReport.presentDays} ngày</span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4.5 rounded-2xl shadow-sm flex items-center gap-3 cursor-pointer"
              >
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Tổng giờ OT</span>
                  <span className="text-sm font-extrabold text-slate-850 dark:text-white block">{employeeReport.totalOtHours.toFixed(1)} giờ</span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4.5 rounded-2xl shadow-sm flex items-center gap-3 cursor-pointer"
              >
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Phép tháng này</span>
                  <span className="text-sm font-extrabold text-slate-850 dark:text-white block">{employeeReport.leaveDays} ngày nghỉ</span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4.5 rounded-2xl shadow-sm flex items-center gap-3 cursor-pointer"
              >
                <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Không đi làm</span>
                  <span className="text-sm font-extrabold text-slate-850 dark:text-white block">{employeeReport.absentDays} ngày</span>
                </div>
              </motion.div>
            </div>
          )}

          {/* Annual Leave Fund (Quỹ phép năm hằng năm) */}
          {employeeReport && (
            <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 dark:from-amber-950/10 dark:to-orange-950/10 border border-amber-500/10 dark:border-amber-900/20 rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚖️</span>
                <h4 className="font-bold text-sm text-slate-800 dark:text-amber-200">Quỹ Nghỉ Phép Năm Cả Năm ({selectedYear})</h4>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-2.5">
                <p>
                  Theo quy định mới, <strong className="text-slate-700 dark:text-slate-350">không cộng dồn ngày phép gối đầu sang năm tiếp theo sau Tết Nguyên Đán (17/02/2026)</strong>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono bg-slate-100/50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800">
                  <div>
                    <p>• Phép cơ bản {selectedYear}: <strong>{employeeReport.baseEntitlement} ngày</strong></p>
                    <p>• Phép gối đầu 2025 nhận: <strong>{employeeReport.initialCarryover} ngày</strong></p>
                    <p className="text-amber-600 dark:text-amber-400 font-bold">• Hạn gối đầu: Trước Tết (17/02)</p>
                  </div>
                  <div>
                    <p>• Đã dùng trước Tết: <strong>{employeeReport.leaveUsedBeforeTet} ngày</strong> (trừ gối đầu)</p>
                    <p className="text-rose-500 font-bold">• Gối đầu hết hạn (Reset): {employeeReport.carryoverExpired} ngày</p>
                    <p>• Đã dùng sau Tết: <strong>{employeeReport.leaveUsedAfterTet} ngày</strong> (trừ phép {selectedYear})</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-center">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Tích luỹ (A)</span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{employeeReport.leaveEntitlement} ngày</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-center">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Đã nghỉ (B)</span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-500">{employeeReport.leaveUsed} ngày</span>
                </div>
                <div className={`p-3 rounded-2xl text-center border ${
                  employeeReport.leaveRemaining > 0 
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400'
                }`}>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Còn lại (A-B)</span>
                  <span className="text-lg font-black">{employeeReport.leaveRemaining} ngày</span>
                </div>
              </div>

              {/* YTD Leave History breakdown */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden mt-3">
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/60 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  Nhật ký chi tiết các ngày nghỉ phép đã dùng trong năm {selectedYear}
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-850/60 max-h-40 overflow-y-auto">
                  {employeeReport.ytdLeaveLogs.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                      Bạn chưa nghỉ phép ngày nào trong cả năm {selectedYear}
                    </div>
                  ) : (
                    employeeReport.ytdLeaveLogs.map((log, index) => (
                      <div key={index} className="p-2.5 px-4 text-xs flex justify-between items-center">
                        <span className="font-mono bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-bold">{log.date}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] italic">"{log.note || "Nghỉ phép hằng năm"}"</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Attendance Calendar Grid */}
          {employeeReport && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[32px] p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <h4 className="font-bold text-sm text-slate-850 dark:text-white flex items-center gap-2">
                  📅 Lịch Chấm Công Cá Nhân Tháng {selectedMonth}/{selectedYear}
                </h4>
                <div className="flex flex-wrap gap-2 text-[9px] font-bold">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                    <span>Đi làm</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                    <span>Phép</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                    <span>Vắng</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 text-slate-350 dark:text-slate-650" />
                    <span>Chưa vào làm</span>
                  </div>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-31 gap-1.5 pt-1">
                {Array.from({ length: totalDaysInMonth }, (_, i) => {
                  const day = i + 1;
                  const detail = employeeReport.dailyDetails[day];
                  const dayOfWeek = new Date(selectedYear, selectedMonth - 1, day).getDay();
                  const isWeekend = dayOfWeek === 0;

                  let colorClass = 'bg-slate-100 dark:bg-slate-850 text-slate-450 dark:text-slate-500'; // Sunday Default
                  if (detail.status === 'Có đi làm') colorClass = 'bg-emerald-500 text-white';
                  else if (detail.status === 'Nghỉ phép') colorClass = 'bg-amber-500 text-white';
                  else if (detail.status === 'Ngày lễ') colorClass = 'bg-pink-500 text-white font-bold ring-1 ring-pink-300';
                  else if (detail.status === 'Không đi làm') colorClass = 'bg-rose-500 text-white';
                  else if (detail.status === 'Chưa vào làm') colorClass = 'bg-slate-50/50 dark:bg-slate-900/10 text-slate-300 dark:text-slate-700 border border-dashed border-slate-200 dark:border-slate-800/80';

                  return (
                    <div
                      key={day}
                      title={`${day}/${selectedMonth} - ${detail.status}${detail.note ? ` (${detail.note})` : ''}`}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center p-0.5 transition-transform hover:scale-105 shadow-xs ${colorClass}`}
                    >
                      <span className="text-[10px] font-extrabold">{day}</span>
                      {detail.otFrom && detail.otTo && (
                        <span className="text-[7px] font-bold px-0.5 rounded bg-black/20 text-white">OT</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed Overtime & Work logs list */}
          {employeeReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overtime details list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[28px] p-5 shadow-sm space-y-3.5">
                <h4 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-500" />
                  Danh Sách Giờ Tăng Ca (OT) Tháng này
                </h4>

                <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-64 overflow-y-auto pr-1">
                  {employeeReport.monthlyLogs.filter(l => l.otFrom && l.otTo).length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                      Không ghi nhận giờ tăng ca (OT) trong tháng này.
                    </div>
                  ) : (
                    employeeReport.monthlyLogs.filter(l => l.otFrom && l.otTo).map((log, index) => (
                      <div key={index} className="py-2.5 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded mr-2">
                            {log.date}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {log.otFrom} - {log.otTo}
                          </span>
                        </div>
                        <span className="font-extrabold text-purple-600 dark:text-purple-400">
                          +{calculateOtHours(log.otFrom, log.otTo).toFixed(1)}h
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Attendance comments / Ghi chú */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[28px] p-5 shadow-sm space-y-3.5">
                <h4 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  Nhật Ký Chú Thích Hoạt Động
                </h4>

                <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-64 overflow-y-auto pr-1">
                  {employeeReport.monthlyLogs.filter(l => l.note).length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                      Không có ghi chú hoạt động nào trong tháng này.
                    </div>
                  ) : (
                    employeeReport.monthlyLogs.filter(l => l.note).map((log, index) => (
                      <div key={index} className="py-2.5 text-xs flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded">
                            {log.date}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{log.status}</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 italic">"{log.note}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>

    {/* User Guide Modal for Employees */}
    <AnimatePresence>
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowGuideModal(false)}
            className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
          />
          
          {/* Modal Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-slate-50 dark:bg-slate-950 rounded-[32px] border border-slate-100 dark:border-slate-800 w-full max-w-4xl max-h-[85vh] overflow-y-auto p-6 md:p-8 relative z-10 shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer flex items-center justify-center border border-slate-200/40"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>

            <UserGuide 
              accountantKey={accountantKey}
              departmentPassword={departmentPassword}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </div>
  );
}
