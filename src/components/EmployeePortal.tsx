import React, { useState, useMemo, useEffect } from "react";
import { Employee, TimeLog, DailyStatus } from "../types";
import { getVietnamHolidayName } from "../holidays";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  UserCheck,
  Key,
  ShieldAlert,
  LogOut,
  Download,
  Activity,
  Sun,
  Moon,
  BookOpen,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  parseRegisteredDate,
  recalculateAnnualLeave,
} from "../utils/leaveUtils";
import UserGuide from "./UserGuide";
import { getDisplayNameFromList } from "../utils/nameUtils";
import { RandomLoader } from "./RandomLoader";
import { ThemeToggle } from "./ThemeToggle";
import { playTabSound, playConfirmSound } from "../sound";

// Custom hook to track window size for responsive layout adjustments
function useWindowSize() {
  const [size, setSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });
  useEffect(() => {
    const handleResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
}

interface EmployeePortalProps {
  employees: Employee[];
  timeLogs: TimeLog[];
  isLoading?: boolean;
  onBackToLogin?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  accountantKey?: string;
  departmentPassword?: string;
  onRefresh?: () => Promise<void>;
  isOnline?: boolean;
}

// Helper to calculate OT hours from 'otFrom' and 'otTo'
function calculateOtHours(from: string, to: string): number {
  if (!from || !to) return 0;
  try {
    const [hFrom, mFrom] = from.split(":").map(Number);
    const [hTo, mTo] = to.split(":").map(Number);
    if (isNaN(hFrom) || isNaN(mFrom) || isNaN(hTo) || isNaN(mTo)) return 0;

    let diffMinutes = hTo * 60 + mTo - (hFrom * 60 + mFrom);
    if (diffMinutes < 0) {
      // Overnight OT (e.g. 22:00 to 02:00 next day)
      diffMinutes += 24 * 60;
    }
    return Math.max(0, diffMinutes / 60);
  } catch {
    return 0;
  }
}

// Helper to check if a date is before the registered start date
function isDateBeforeRegistered(
  year: number,
  month: number,
  day: number,
  registeredAtStr: string,
): boolean {
  const parsedReg = parseRegisteredDate(registeredAtStr);
  if (!parsedReg) return false;

  if (year < parsedReg.year) return true;
  if (year > parsedReg.year) return false;

  if (month < parsedReg.month) return true;
  if (month > parsedReg.month) return false;

  return day < parsedReg.day;
}

// Helper to check if a date is after the resignation/leave date
function isDateAfterLeft(
  year: number,
  month: number,
  day: number,
  leftAtStr?: string,
): boolean {
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
    .normalize("NFD")
    .replace(/[\u0300-\u0301-\u0303-\u0309-\u0323]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export default function EmployeePortal({
  employees,
  timeLogs,
  isLoading = false,
  onBackToLogin,
  isDarkMode,
  onToggleDarkMode,
  accountantKey = "visual-accounting",
  departmentPassword = "",
  onRefresh,
  isOnline = true,
}: EmployeePortalProps) {
  const { width } = useWindowSize();
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [digitalTime, setDigitalTime] = useState<Date>(new Date());

  // Keep digital clock updating every second
  useEffect(() => {
    const timer = setInterval(() => {
      setDigitalTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = async () => {
    if (onRefresh) {
      setIsManualSyncing(true);
      try {
        await onRefresh();
      } catch (err) {
        console.error("Lỗi khi tải lại dữ liệu:", err);
      } finally {
        setIsManualSyncing(false);
      }
    }
  };
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    now.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmpName, setSelectedEmpName] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [calendarView, setCalendarView] = useState<"grid" | "list">("grid");
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    day: number;
    detail: any;
  } | null>(null);

  // Filter employees matching query
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = removeVietnameseDiacritics(searchQuery.toLowerCase().trim());
    return employees.filter((emp) => {
      const nameClean = removeVietnameseDiacritics(emp.name.toLowerCase());
      const roleClean = emp.role
        ? removeVietnameseDiacritics(emp.role.toLowerCase())
        : "";
      return nameClean.includes(query) || roleClean.includes(query);
    });
  }, [searchQuery, employees]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const totalDaysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedMonth, selectedYear]);

  // Find selected employee object
  const selectedEmployee = useMemo(() => {
    if (!selectedEmpName) return null;
    return (
      employees.find(
        (emp) =>
          emp.name.trim().toLowerCase() ===
          selectedEmpName.trim().toLowerCase(),
      ) || null
    );
  }, [selectedEmpName, employees]);

  // Log guest lookup event to server to satisfy "tôi cần cái gì để theo dõi... ai xem"
  useEffect(() => {
    if (selectedEmpName) {
      fetch("/api/audit-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: `${selectedEmpName} (Nhân viên)`,
          action: "Tra cứu công phép hằng tháng",
          details: `Xem thông tin Tháng ${selectedMonth}/${selectedYear}`,
        }),
      }).catch((err) => console.error("Lỗi ghi nhận audit log:", err));
    }
  }, [selectedEmpName, selectedMonth, selectedYear]);

  // Compute monthly calculations for selected employee
  const employeeReport = useMemo(() => {
    if (!selectedEmpName || !selectedEmployee) return null;

    const monthStr = String(selectedMonth).padStart(2, "0");

    // Filter logs for selected employee, month, and year
    const monthlyLogs = timeLogs.filter((log) => {
      const [y, m] = log.date.split("-");
      return (
        parseInt(y) === selectedYear &&
        parseInt(m) === selectedMonth &&
        log.employeeName.trim().toLowerCase() ===
          selectedEmpName.trim().toLowerCase()
      );
    });

    // Initialize daily status calendar grid
    const dailyDetails: { [day: number]: DailyStatus } = {};

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${selectedYear}-${monthStr}-${String(d).padStart(2, "0")}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
      const isWeekend = dayOfWeek === 0; // Sunday only
      const holidayName = getVietnamHolidayName(dateStr);

      const dayLog = monthlyLogs.find((l) => l.date === dateStr);

      let status: DailyStatus["status"] = holidayName
        ? "Ngày lễ"
        : isWeekend
          ? "Nghỉ cuối tuần"
          : "Có đi làm";
      let otFrom = "";
      let otTo = "";
      let note = holidayName || "";

      const isBeforeStart = selectedEmployee?.registeredAt
        ? isDateBeforeRegistered(
            selectedYear,
            selectedMonth,
            d,
            selectedEmployee.registeredAt,
          )
        : false;
      const isAfterResigned = selectedEmployee?.leftAt
        ? isDateAfterLeft(
            selectedYear,
            selectedMonth,
            d,
            selectedEmployee.leftAt,
          )
        : false;

      if (dayLog) {
        if (dayLog.status === "Không đi làm" && holidayName) {
          status = "Ngày lễ";
        } else if (dayLog.status === "Không đi làm" && isWeekend) {
          status = "Nghỉ cuối tuần";
        } else {
          status = dayLog.status;
        }
        otFrom = dayLog.otFrom || "";
        otTo = dayLog.otTo || "";
        note = dayLog.note || holidayName || "";
      } else if (isBeforeStart) {
        status = "Chưa vào làm";
      } else if (isAfterResigned) {
        status = "Đã nghỉ việc";
      }

      dailyDetails[d] = {
        date: dateStr,
        status,
        otFrom,
        otTo,
        note,
        holidayName: holidayName || undefined,
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

      if (detail.status === "Có đi làm") {
        presentDays++;
        if (detail.otFrom && detail.otTo) {
          totalOtHours += calculateOtHours(detail.otFrom, detail.otTo);
        } else if (dayOfWeek === 0) {
          totalOtHours += 8; // Sunday default
        }
      } else if (detail.status === "Không đi làm") {
        if (!isWeekend) {
          absentDays++;
        }
      } else if (detail.status === "Nghỉ phép") {
        leaveDays++;
        presentDays++; // Approved leave is counted as workday ("vẫn tính công")
      } else if (detail.status === "Ngày lễ" || detail.status === "Nghỉ lễ") {
        holidayDays++;
        presentDays++; // Holiday is counted as workday
      }
    }

    // YTD Leave Balance (using shared utility)
    const leaveData = selectedEmployee
      ? recalculateAnnualLeave(selectedEmployee, timeLogs, selectedYear)
      : {
          monthsWorkedInSelectedYear: 0,
          leaveEntitlement: 0,
          leaveUsed: 0,
          leaveRemaining: 0,
          ytdLeaveLogs: [],
          initialCarryover: 0,
          carryoverUsed: 0,
          carryoverExpired: 0,
          baseEntitlement: 0,
          leaveUsedBeforeTet: 0,
          leaveUsedAfterTet: 0,
          tetDate: "",
        };

    return {
      totalDays: totalDaysInMonth,
      presentDays,
      absentDays,
      leaveDays,
      holidayDays,
      totalOtHours,
      monthlyLogs,
      dailyDetails,
      ...leaveData,
    };
  }, [
    selectedEmpName,
    selectedEmployee,
    selectedMonth,
    selectedYear,
    totalDaysInMonth,
    timeLogs,
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Top Welcome Panel */}
      <div className="border-b border-slate-150 dark:border-slate-800/80 pb-6 space-y-4">
        <div className="w-full">
          <span className="text-indigo-600 dark:text-indigo-400 text-xs font-bold font-mono tracking-wider uppercase block mb-1.5">
            Cổng Tra Cứu Thông Tin Cá Nhân
          </span>
          <h1
            id="portal-title"
            className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans flex flex-wrap items-center gap-x-2.5 gap-y-1"
          >
            <span>📊 Tra Cứu Công & Phép</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Xem nhanh bảng công, số ngày nghỉ phép, số giờ tăng ca (OT) hằng
            tháng bảo mật của từng nhân sự.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1.5 w-full">
          {/* Elegant Digital Clock Badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 rounded-2xl font-mono text-slate-700 dark:text-slate-300 shadow-sm text-xs select-none">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-wider">
              {digitalTime.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </span>
            <span className="text-slate-300 dark:text-slate-700 font-sans">
              |
            </span>
            <span className="text-[10px] font-sans font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {digitalTime.toLocaleDateString("vi-VN", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Connection Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all duration-300 ${
              isOnline
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse"
            }`}
            title={
              isOnline
                ? "Kết nối hoạt động: Đang đồng bộ thời gian thực từ Máy chủ"
                : "Mất kết nối: Đang sử dụng dữ liệu ngoại tuyến"
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
            />
            <span>{isOnline ? "Trực tuyến" : "Ngoại tuyến"}</span>
          </div>

          {onToggleDarkMode && isDarkMode !== undefined && (
            <ThemeToggle isDarkMode={isDarkMode} onChange={onToggleDarkMode} />
          )}

          {onRefresh && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleManualRefresh}
              disabled={isManualSyncing || isLoading}
              className="p-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold transition-colors shrink-0 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isManualSyncing ? "animate-spin text-emerald-600 dark:text-emerald-400" : ""}`}
              />
              <span>
                {isManualSyncing ? "Đang cập nhật..." : "Cập nhật dữ liệu"}
              </span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowGuideModal(true)}
            className="p-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold transition-colors shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Hướng dẫn</span>
          </motion.button>

          {onBackToLogin && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onBackToLogin}
              className="p-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold transition-colors shrink-0 ml-auto"
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
            className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] space-y-6 max-w-xl mx-auto text-center"
          >
            {isLoading ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-3 min-h-[250px]">
                <RandomLoader
                  message="Đang tải dữ liệu chấm công từ máy chủ..."
                  autoCycle={true}
                  cycleIntervalMs={2000}
                  themeColor="text-indigo-600 dark:text-indigo-400"
                />
              </div>
            ) : employees.length === 0 ? (
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-left space-y-2 mb-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-extrabold text-xs">
                  <span>⚠️ Hệ thống chưa có dữ liệu đồng bộ</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
                  Hiện tại máy chủ đang trống (chưa có nhân viên nào được tải
                  lên).
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Để tra cứu thông tin, <b>Quản trị viên (Admin)</b> cần truy
                  cập vào ứng dụng bằng tài khoản Google một lần để thiết lập
                  ban đầu và nhấn nút <b>Đồng bộ</b> để kéo dữ liệu từ Google
                  Sheets lên máy chủ. Khi đó mọi người sẽ tra cứu được ngay!
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
              <h2 className="text-lg font-bold text-slate-850 dark:text-white">
                Xác định danh tính của bạn
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Nhập tên hoặc chức vụ của bạn để tìm kiếm hồ sơ chấm công cá
                nhân.
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
              {showDropdown && searchQuery.trim() !== "" && (
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
                        whileHover={{
                          x: 6,
                          backgroundColor: "rgba(99, 102, 241, 0.06)",
                        }}
                        onClick={() => {
                          playConfirmSound();
                          setSelectedEmpName(emp.name);
                          setSearchQuery("");
                          setShowDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-xs flex justify-between items-center text-slate-700 dark:text-slate-200 font-sans cursor-pointer text-left focus:outline-none"
                      >
                        <span className="font-bold">
                          {getDisplayNameFromList(
                            emp.name,
                            false,
                            employees,
                            true,
                          )}
                        </span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-semibold">
                          {emp.role || "Nhân sự"}
                        </span>
                      </motion.button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 text-left">
              <span className="block text-[10px] font-bold text-slate-440 dark:text-slate-500 mb-2 uppercase tracking-wide">
                👥 Danh sách nhân viên:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {employees.map((emp, idx) => (
                  <motion.button
                    key={emp.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: idx * 0.02,
                      type: "spring",
                      stiffness: 350,
                      damping: 25,
                    }}
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playConfirmSound();
                      setSelectedEmpName(emp.name);
                    }}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-sky-500 hover:text-white dark:bg-slate-950 dark:hover:from-indigo-500 dark:hover:to-sky-450 dark:hover:text-white text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded-xl border border-slate-200/40 dark:border-slate-800/80 transition-all cursor-pointer shadow-sm hover:shadow-indigo-500/15"
                  >
                    {getDisplayNameFromList(emp.name, false, employees, true)}
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
                Nhân viên:{" "}
                <span className="text-slate-850 dark:text-slate-200 font-extrabold">
                  {getDisplayNameFromList(
                    selectedEmpName,
                    false,
                    employees,
                    true,
                  )}
                </span>
              </span>
            </div>

            {/* Employee profile metadata */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-850 text-white rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(99,102,241,0.15)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-extrabold text-white text-xl shadow-lg">
                  {getDisplayNameFromList(
                    selectedEmpName,
                    false,
                    employees,
                    true,
                  ).charAt(0)}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black tracking-tight">
                    {getDisplayNameFromList(
                      selectedEmpName,
                      false,
                      employees,
                      true,
                    )}
                  </h3>
                  <p className="text-xs text-indigo-100 flex items-center gap-1.5">
                    <span>
                      Chức vụ: <b>{selectedEmployee?.role || "Nhân viên"}</b>
                    </span>
                    <span>•</span>
                    <span>
                      Ngày vào làm:{" "}
                      <b>
                        {selectedEmployee?.registeredAt || "Chưa thiết lập"}
                      </b>
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 items-center">
                <span className="text-xs font-bold hidden sm:inline">
                  Tháng truy xuất:
                </span>

                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white transition-colors cursor-pointer"
                  title="Tháng trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3.5 py-1.5 text-xs bg-white/10 hover:bg-white/15 border border-white/20 rounded-full focus:outline-none focus:ring-2 focus:ring-white/40 text-white font-extrabold cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option
                      key={i + 1}
                      value={i + 1}
                      className="text-slate-800"
                    >
                      Tháng {i + 1}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3.5 py-1.5 text-xs bg-white/10 hover:bg-white/15 border border-white/20 rounded-full focus:outline-none focus:ring-2 focus:ring-white/40 text-white font-extrabold cursor-pointer"
                >
                  {years.map((y) => (
                    <option key={y} value={y} className="text-slate-800">
                      Năm {y}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleNextMonth}
                  className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white transition-colors cursor-pointer"
                  title="Tháng sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Monthly KPI Overview Cards */}
            {employeeReport && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onMouseMove={(e) => {
                    const el = e.currentTarget;
                    const rect = el.getBoundingClientRect();
                    const x = e.clientX - rect.left - rect.width / 2;
                    const y = e.clientY - rect.top - rect.height / 2;
                    el.style.transform = `perspective(1000px) rotateX(${-y / 10}deg) rotateY(${x / 10}deg) scale3d(1.03, 1.03, 1.03)`;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] flex items-center gap-3 cursor-pointer transition-all duration-200"
                >
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                      Ngày đi làm
                    </span>
                    <span className="text-sm font-extrabold text-slate-850 dark:text-white block">
                      {employeeReport.presentDays} ngày
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onMouseMove={(e) => {
                    const el = e.currentTarget;
                    const rect = el.getBoundingClientRect();
                    const x = e.clientX - rect.left - rect.width / 2;
                    const y = e.clientY - rect.top - rect.height / 2;
                    el.style.transform = `perspective(1000px) rotateX(${-y / 10}deg) rotateY(${x / 10}deg) scale3d(1.03, 1.03, 1.03)`;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] flex items-center gap-3 cursor-pointer transition-all duration-200"
                >
                  <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                      Tổng giờ OT
                    </span>
                    <span className="text-sm font-extrabold text-slate-850 dark:text-white block">
                      {employeeReport.totalOtHours.toFixed(1)} giờ
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onMouseMove={(e) => {
                    const el = e.currentTarget;
                    const rect = el.getBoundingClientRect();
                    const x = e.clientX - rect.left - rect.width / 2;
                    const y = e.clientY - rect.top - rect.height / 2;
                    el.style.transform = `perspective(1000px) rotateX(${-y / 10}deg) rotateY(${x / 10}deg) scale3d(1.03, 1.03, 1.03)`;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] flex items-center gap-3 cursor-pointer transition-all duration-200"
                >
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                      Phép tháng này
                    </span>
                    <span className="text-sm font-extrabold text-slate-850 dark:text-white block">
                      {employeeReport.leaveDays} ngày nghỉ
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onMouseMove={(e) => {
                    const el = e.currentTarget;
                    const rect = el.getBoundingClientRect();
                    const x = e.clientX - rect.left - rect.width / 2;
                    const y = e.clientY - rect.top - rect.height / 2;
                    el.style.transform = `perspective(1000px) rotateX(${-y / 10}deg) rotateY(${x / 10}deg) scale3d(1.03, 1.03, 1.03)`;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] flex items-center gap-3 cursor-pointer transition-all duration-200"
                >
                  <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                      Không đi làm
                    </span>
                    <span className="text-sm font-extrabold text-slate-850 dark:text-white block">
                      {employeeReport.absentDays} ngày
                    </span>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Annual Leave Fund (Quỹ phép năm hằng năm) */}
            {employeeReport && (
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] space-y-4 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚖️</span>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-amber-200">
                    Quỹ Nghỉ Phép Năm Cả Năm ({selectedYear})
                  </h4>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-2.5">
                  <p>
                    Theo quy định mới,{" "}
                    <strong className="text-slate-700 dark:text-slate-350">
                      không cộng dồn ngày phép gối đầu sang năm tiếp theo sau
                      Tết Nguyên Đán ({employeeReport.tetDate})
                    </strong>
                    .
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono bg-slate-100/50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800">
                    <div>
                      <p>
                        • Phép cơ bản {selectedYear}:{" "}
                        <strong>{employeeReport.baseEntitlement} ngày</strong>
                      </p>
                      <p>
                        • Phép gối đầu nhận:{" "}
                        <strong>{employeeReport.initialCarryover} ngày</strong>
                      </p>
                      <p className="text-amber-600 dark:text-amber-400 font-bold">
                        • Hạn gối đầu: Trước Tết ({employeeReport.tetDate})
                      </p>
                    </div>
                    <div>
                      <p>
                        • Đã dùng trước Tết:{" "}
                        <strong>
                          {employeeReport.leaveUsedBeforeTet} ngày
                        </strong>{" "}
                        (trừ gối đầu)
                      </p>
                      <p className="text-rose-500 font-bold">
                        • Gối đầu hết hạn (Reset):{" "}
                        {employeeReport.carryoverExpired} ngày
                      </p>
                      <p>
                        • Đã dùng sau Tết:{" "}
                        <strong>{employeeReport.leaveUsedAfterTet} ngày</strong>{" "}
                        (trừ phép {selectedYear})
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-center">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                      Tích luỹ (A)
                    </span>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                      {employeeReport.leaveEntitlement} ngày
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-center">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                      Đã nghỉ (B)
                    </span>
                    <span className="text-lg font-black text-amber-600 dark:text-amber-500">
                      {employeeReport.leaveUsed} ngày
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-2xl text-center border ${
                      employeeReport.leaveRemaining > 0
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      Còn lại (A-B)
                    </span>
                    <span className="text-lg font-black">
                      {employeeReport.leaveRemaining} ngày
                    </span>
                  </div>
                </div>

                {/* YTD Leave History breakdown */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden mt-3">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/60 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    Nhật ký chi tiết các ngày nghỉ phép đã dùng trong năm{" "}
                    {selectedYear}
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-850/60 max-h-40 overflow-y-auto">
                    {employeeReport.ytdLeaveLogs.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                        Bạn chưa nghỉ phép ngày nào trong cả năm {selectedYear}
                      </div>
                    ) : (
                      employeeReport.ytdLeaveLogs.map((log, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-2.5 px-4 text-xs flex justify-between items-center hover:bg-amber-500/5 dark:hover:bg-amber-950/20 rounded-lg transition-colors duration-200 cursor-pointer"
                        >
                          <span className="font-mono bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-bold">
                            {log.date}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] italic">
                            "{log.note || "Nghỉ phép hằng năm"}"
                          </span>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Attendance Calendar Grid */}
            {employeeReport &&
              (() => {
                const firstDay = new Date(
                  selectedYear,
                  selectedMonth - 1,
                  1,
                ).getDay();
                const startingOffset = firstDay === 0 ? 6 : firstDay - 1; // Monday=0, Sunday=6
                const calendarGap = "gap-2";
                const calendarPadding = "p-3";

                return (
                  <motion.div
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] space-y-5 cursor-pointer relative"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/40 pb-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-850 dark:text-white flex items-center gap-2">
                          📅 Lịch Chấm Công Cá Nhân Tháng {selectedMonth}/
                          {selectedYear}
                        </h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          Nhấp vào từng ngày để xem chi tiết ghi chú chấm công
                          và lịch sử tăng ca (OT).
                        </p>
                      </div>

                      {/* View switcher and Legend inline container */}
                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {/* View Switcher Toggle */}
                        <div className="flex bg-slate-100/80 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200/40 dark:border-slate-850/60">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCalendarView("grid");
                            }}
                            className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg transition-all ${
                              calendarView === "grid"
                                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                          >
                            Dạng Lưới
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCalendarView("list");
                            }}
                            className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg transition-all ${
                              calendarView === "list"
                                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                          >
                            Dạng Danh Sách
                          </button>
                        </div>

                        {/* Color legends with elegant small status indicator dots */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
                            <span>Đi làm</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-4 ring-amber-500/10" />
                            <span>Phép</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-4 ring-rose-500/10" />
                            <span>Vắng</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full border border-dashed border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-900" />
                            <span>Chưa vào làm</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {calendarView === "grid" ? (
                        <motion.div
                          key="grid-view"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="w-full pt-1"
                        >
                          {/* Days of week header */}
                          <div className="grid grid-cols-7 gap-2 text-center text-[10.5px] font-bold text-slate-400 dark:text-slate-500 pb-2.5 border-b border-slate-100 dark:border-slate-800/40 mb-3">
                            <span>Thứ Hai</span>
                            <span>Thứ Ba</span>
                            <span>Thứ Tư</span>
                            <span>Thứ Năm</span>
                            <span>Thứ Sáu</span>
                            <span>Thứ Bảy</span>
                            <span className="text-rose-500">Chủ Nhật</span>
                          </div>

                          {/* Days grid - expanded to full width to completely resolve lateral gaps */}
                          <div className={`grid grid-cols-7 ${calendarGap}`}>
                            {/* Empty spacer cells */}
                            {Array.from({ length: startingOffset }).map(
                              (_, idx) => (
                                <div
                                  key={`empty-${idx}`}
                                  className="aspect-[1.1] rounded-2xl bg-slate-50/10 dark:bg-slate-900/5 border border-slate-100/20 dark:border-slate-800/10"
                                />
                              ),
                            )}

                            {/* Actual days */}
                            {Array.from(
                              { length: totalDaysInMonth },
                              (_, i) => {
                                const day = i + 1;
                                const detail = employeeReport.dailyDetails[day];
                                const dayOfWeek = new Date(
                                  selectedYear,
                                  selectedMonth - 1,
                                  day,
                                ).getDay();
                                const isSunday = dayOfWeek === 0;

                                let cellClass = "";
                                let dotColor = "";

                                if (detail.status === "Có đi làm") {
                                  cellClass =
                                    "bg-emerald-500/8 dark:bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 dark:border-emerald-500/25 font-bold shadow-xs";
                                  dotColor = "bg-emerald-500";
                                } else if (detail.status === "Nghỉ phép") {
                                  cellClass =
                                    "bg-amber-500/8 dark:bg-amber-500/12 text-amber-600 dark:text-amber-400 border border-amber-500/15 dark:border-amber-500/25 font-bold shadow-xs";
                                  dotColor = "bg-amber-500";
                                } else if (
                                  detail.status === "Ngày lễ" ||
                                  detail.status === "Nghỉ lễ"
                                ) {
                                  cellClass =
                                    "bg-pink-500/8 dark:bg-pink-500/12 text-pink-600 dark:text-pink-400 border border-pink-500/20 dark:border-pink-500/30 font-bold shadow-xs";
                                  dotColor = "bg-pink-500";
                                } else if (detail.status === "Không đi làm") {
                                  cellClass =
                                    "bg-rose-500/8 dark:bg-rose-500/12 text-rose-600 dark:text-rose-400 border border-rose-500/15 dark:border-rose-500/25 font-bold shadow-xs";
                                  dotColor = "bg-rose-500";
                                } else if (detail.status === "Chưa vào làm") {
                                  cellClass =
                                    "bg-slate-50/20 dark:bg-slate-900/5 text-slate-350 dark:text-slate-600 border border-dashed border-slate-150 dark:border-slate-800/40";
                                } else {
                                  // Weekend / Sunday fallback
                                  cellClass =
                                    "bg-slate-100/50 dark:bg-slate-850/40 text-slate-450 dark:text-slate-500 border border-slate-150/40 dark:border-slate-800/30";
                                }

                                return (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{
                                      delay: i * 0.015,
                                      type: "spring",
                                      stiffness: 300,
                                      damping: 20,
                                    }}
                                    key={day}
                                    title={`${day}/${selectedMonth} - ${detail.status}${detail.note ? ` (${detail.note})` : ""}`}
                                    onClick={() =>
                                      setSelectedDayDetail({ day, detail })
                                    }
                                    className={`aspect-[1.1] rounded-2xl flex flex-col items-center justify-center cursor-pointer relative select-none transition-all duration-200 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#6366f1] dark:hover:shadow-[4px_4px_0px_0px_#4f46e5] hover:border-indigo-500/50 dark:hover:border-indigo-400/50 active:translate-y-0 active:shadow-none ${calendarPadding} ${cellClass}`}
                                  >
                                    <span className="text-xs sm:text-sm font-bold tracking-tight">
                                      {day}
                                    </span>

                                    {/* Elegant tiny status indicator dot */}
                                    {dotColor && (
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1 shadow-sm`}
                                      />
                                    )}

                                    {/* Elegant Overtime Indicator */}
                                    {detail.otFrom && detail.otTo && (
                                      <span className="absolute top-1 right-1.5 text-[6.5px] font-extrabold px-1 py-0.2 rounded bg-purple-150 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/30 scale-90">
                                        OT
                                      </span>
                                    )}
                                  </motion.div>
                                );
                              },
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        /* Elegant Summary List view that perfectly scales horizontally with ZERO visual gaps */
                        <motion.div
                          key="list-view"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="w-full pt-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[480px] overflow-y-auto pr-1.5 custom-scrollbar"
                        >
                          {Array.from({ length: totalDaysInMonth }, (_, i) => {
                            const day = i + 1;
                            const detail = employeeReport.dailyDetails[day];
                            const dateObj = new Date(
                              selectedYear,
                              selectedMonth - 1,
                              day,
                            );
                            const weekdays = [
                              "Chủ Nhật",
                              "Thứ Hai",
                              "Thứ Ba",
                              "Thứ Tư",
                              "Thứ Năm",
                              "Thứ Sáu",
                              "Thứ Bảy",
                            ];
                            const dayOfWeekStr = weekdays[dateObj.getDay()];
                            const isSunday = dateObj.getDay() === 0;

                            // Identify status badge color
                            let badgeClass = "";
                            if (detail.status === "Có đi làm") {
                              badgeClass =
                                "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/20";
                            } else if (detail.status === "Nghỉ phép") {
                              badgeClass =
                                "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/20";
                            } else if (
                              detail.status === "Ngày lễ" ||
                              detail.status === "Nghỉ lễ"
                            ) {
                              badgeClass =
                                "bg-pink-100 dark:bg-pink-950/30 text-pink-700 dark:text-pink-400 border border-pink-200/20";
                            } else if (detail.status === "Không đi làm") {
                              badgeClass =
                                "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200/20";
                            } else if (detail.status === "Chưa vào làm") {
                              badgeClass =
                                "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700";
                            } else {
                              badgeClass =
                                "bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border border-slate-200/40";
                            }

                            return (
                              <motion.div
                                key={day}
                                initial={{ opacity: 0, x: -15 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  delay: i * 0.02,
                                  type: "spring",
                                  stiffness: 350,
                                  damping: 25,
                                }}
                                onClick={() =>
                                  setSelectedDayDetail({ day, detail })
                                }
                                className="cursor-pointer flex flex-col justify-between p-3.5 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 border border-slate-150/50 dark:border-slate-800/60 rounded-2xl transition-all duration-150 gap-2.5 hover:scale-[1.02] hover:shadow-sm"
                              >
                                {/* Day and Weekday Row */}
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100/50 dark:border-slate-850/40">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">
                                      {String(day).padStart(2, "0")}
                                    </span>
                                    <span
                                      className={`text-xs font-bold ${isSunday ? "text-rose-500" : "text-slate-600 dark:text-slate-350"}`}
                                    >
                                      {dayOfWeekStr}
                                    </span>
                                  </div>
                                  {detail.otFrom && detail.otTo && (
                                    <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 font-extrabold px-1.5 py-0.5 rounded text-[9px] border border-purple-200/30">
                                      OT
                                    </span>
                                  )}
                                </div>

                                {/* Status badge */}
                                <div className="flex items-center">
                                  <span
                                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${badgeClass} truncate max-w-full transition-colors duration-300`}
                                    title={detail.status}
                                  >
                                    <AnimatePresence mode="wait">
                                      <motion.span
                                        key={
                                          detail.status +
                                          (detail.holidayName || "")
                                        }
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                      >
                                        {detail.status}
                                        {detail.holidayName
                                          ? ` (${detail.holidayName})`
                                          : ""}
                                      </motion.span>
                                    </AnimatePresence>
                                  </span>
                                </div>

                                {/* Extra details (OT or note) */}
                                {(detail.note ||
                                  (detail.otFrom && detail.otTo)) && (
                                  <div className="space-y-1.5 pt-1">
                                    {detail.otFrom && detail.otTo && (
                                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                        ⏱️ Giờ OT: {detail.otFrom} -{" "}
                                        {detail.otTo}
                                      </div>
                                    )}
                                    {detail.note && (
                                      <div
                                        className="text-[10px] text-slate-400 dark:text-slate-500 italic truncate max-w-full"
                                        title={detail.note}
                                      >
                                        " {detail.note} "
                                      </div>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })()}

            {/* Detailed Overtime & Work logs list */}
            {employeeReport && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Overtime details list */}
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] space-y-3.5 cursor-pointer relative"
                >
                  <h4 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-500" />
                    Danh Sách Giờ Tăng Ca (OT) Tháng này
                  </h4>

                  <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-64 overflow-y-auto pr-1">
                    {employeeReport.monthlyLogs.filter(
                      (l) => l.otFrom && l.otTo,
                    ).length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                        Không ghi nhận giờ tăng ca (OT) trong tháng này.
                      </div>
                    ) : (
                      employeeReport.monthlyLogs
                        .filter((l) => l.otFrom && l.otTo)
                        .map((log, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="py-2.5 px-3.5 flex justify-between items-center text-xs hover:bg-purple-500/5 dark:hover:bg-purple-950/20 rounded-xl cursor-pointer transition-colors duration-150"
                          >
                            <div>
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded mr-2">
                                {log.date}
                              </span>
                              <span className="text-slate-600 dark:text-slate-400">
                                {log.otFrom} - {log.otTo}
                              </span>
                            </div>
                            <span className="font-extrabold text-purple-600 dark:text-purple-400">
                              +
                              {calculateOtHours(log.otFrom, log.otTo).toFixed(
                                1,
                              )}
                              h
                            </span>
                          </motion.div>
                        ))
                    )}
                  </div>
                </motion.div>

                {/* Attendance comments / Ghi chú */}
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] space-y-3.5 cursor-pointer relative"
                >
                  <h4 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    Nhật Ký Chú Thích Hoạt Động
                  </h4>

                  <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-64 overflow-y-auto pr-1">
                    {employeeReport.monthlyLogs.filter((l) => l.note).length ===
                    0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                        Không có ghi chú hoạt động nào trong tháng này.
                      </div>
                    ) : (
                      employeeReport.monthlyLogs
                        .filter((l) => l.note)
                        .map((log, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="py-2.5 px-3.5 text-xs flex flex-col gap-1 hover:bg-indigo-500/5 dark:hover:bg-indigo-950/20 rounded-xl cursor-pointer transition-colors duration-150"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded">
                                {log.date}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {log.status}
                              </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 italic">
                              "{log.note}"
                            </p>
                          </motion.div>
                        ))
                    )}
                  </div>
                </motion.div>
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
              className="bg-slate-50 dark:bg-slate-950 rounded-[24px] border border-slate-100 dark:border-slate-800 w-full max-w-4xl max-h-[85vh] overflow-y-auto p-6 md:p-8 relative z-10 shadow-2xl"
            >
              <UserGuide
                accountantKey={accountantKey}
                departmentPassword={departmentPassword}
                showSensitiveInfo={false}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Day Detail Modal */}
      <AnimatePresence>
        {selectedDayDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDayDetail(null)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="neon-glass-card bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800/80 w-full max-w-sm p-6 relative z-10 shadow-2xl overflow-hidden"
            >
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 border border-indigo-100/30 dark:border-indigo-900/30 shadow-inner">
                  <CalendarIcon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1">
                  Ngày {selectedDayDetail.day}/{selectedMonth}/{selectedYear}
                </h3>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  Chi tiết chấm công
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Trạng thái
                    </span>
                    <span
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                        selectedDayDetail.detail.status === "Có đi làm"
                          ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : selectedDayDetail.detail.status === "Nghỉ phép"
                            ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : selectedDayDetail.detail.status === "Không đi làm"
                              ? "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"
                              : selectedDayDetail.detail.status === "Ngày lễ" ||
                                  selectedDayDetail.detail.status === "Nghỉ lễ"
                                ? "bg-pink-100 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {selectedDayDetail.detail.status}
                    </span>
                  </div>

                  {selectedDayDetail.detail.holidayName && (
                    <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center gap-2">
                      <span className="text-pink-500">🎉</span>
                      <span className="text-sm font-bold text-pink-600 dark:text-pink-400">
                        {selectedDayDetail.detail.holidayName}
                      </span>
                    </div>
                  )}
                </div>

                {(selectedDayDetail.detail.otFrom ||
                  selectedDayDetail.detail.otTo ||
                  selectedDayDetail.detail.hasOt) && (
                  <div className="bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl p-4 border border-purple-100 dark:border-purple-900/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-purple-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Tăng ca (OT)
                      </span>
                      <span className="text-sm font-black text-purple-700 dark:text-purple-400">
                        {selectedDayDetail.detail.otFrom || "--:--"} -{" "}
                        {selectedDayDetail.detail.otTo || "--:--"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-purple-100 dark:bg-purple-900/30 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full w-full opacity-50" />
                    </div>
                  </div>
                )}

                {selectedDayDetail.detail.note && (
                  <div className="bg-sky-50/50 dark:bg-sky-900/10 rounded-2xl p-4 border border-sky-100 dark:border-sky-900/30">
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block mb-1.5">
                      Ghi chú
                    </span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                      {selectedDayDetail.detail.note}
                    </p>
                  </div>
                )}

                {/* Fallback info when day is empty */}
                {!selectedDayDetail.detail.note &&
                  !selectedDayDetail.detail.otFrom &&
                  selectedDayDetail.detail.status === "Chưa vào làm" && (
                    <p className="text-center text-sm text-slate-400 dark:text-slate-500 italic mt-4">
                      Chưa có dữ liệu chấm công cho ngày này.
                    </p>
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
