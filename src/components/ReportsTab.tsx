import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, TimeLog, EmployeeMonthlyReport, DailyStatus } from '../types';
import { updateTimeLog, deleteTimeLog } from '../sheets';
import { getVietnamHolidayName } from '../holidays';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Calendar as CalendarIcon, Clock, Users, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, FileSpreadsheet, Sliders, Edit2, Trash2, Share2, Copy, Check, Printer, FileText, X, LogOut, Search, RefreshCw } from 'lucide-react';

interface ReportsTabProps {
  accessToken: string;
  employees: Employee[];
  timeLogs: TimeLog[];
  onLogUpdated: () => void;
  role?: 'admin' | 'accountant';
}

// Helper to calculate OT hours from 'otFrom' and 'otTo'
function getLeaveDaysString(report: EmployeeMonthlyReport, totalDays: number): string {
  const leaveDaysList: number[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const detail = report.dailyDetails[d];
    if (detail && detail.status === 'Nghỉ phép') {
      leaveDaysList.push(d);
    }
  }
  if (leaveDaysList.length === 0) return "-";
  return leaveDaysList.map(d => `${String(d).padStart(2, '0')}`).join(', ');
}

function getOtDaysString(report: EmployeeMonthlyReport, totalDays: number, year: number, month: number): string {
  const otList: string[] = [];
  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  for (let d = 1; d <= totalDays; d++) {
    const detail = report.dailyDetails[d];
    if (detail && detail.otFrom && detail.otTo) {
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = dateObj.getDay();
      const dayName = weekdays[dayOfWeek];
      otList.push(`${dayName} ${String(d).padStart(2, '0')} (${detail.otFrom}-${detail.otTo})`);
    }
  }
  if (otList.length === 0) return "-";
  return otList.join(', ');
}

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

export default function ReportsTab({ accessToken, employees, timeLogs, onLogUpdated, role = 'admin' }: ReportsTabProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [expandedEmployeeName, setExpandedEmployeeName] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'summary' | 'calendar' | 'leave'>('summary');
  const [leaveCalcMode, setLeaveCalcMode] = useState<'standard' | 'accountant'>('standard');
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Lazy loading states for rendering optimization
  const [isChartsLoaded, setIsChartsLoaded] = useState(false);
  const [isTableLoaded, setIsTableLoaded] = useState(false);

  useEffect(() => {
    // Reset and stagger loading when selected month/year or sub-tab changes
    setIsChartsLoaded(false);
    setIsTableLoaded(false);
    
    const chartTimer = setTimeout(() => {
      setIsChartsLoaded(true);
    }, 120);

    const tableTimer = setTimeout(() => {
      setIsTableLoaded(true);
    }, 280);

    return () => {
      clearTimeout(chartTimer);
      clearTimeout(tableTimer);
    };
  }, [selectedMonth, selectedYear, subTab, leaveCalcMode]);

  // States for Editing & Deleting
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // States for PDF Letterhead Customization (Persistent)
  const [pdfCompanyName, setPdfCompanyName] = useState(() => localStorage.getItem('pdf_company_name') || "CÔNG TY SẢN XUẤT PHÒNG VISUAL");
  const [pdfAddress, setPdfAddress] = useState(() => localStorage.getItem('pdf_address') || "Địa chỉ: Tòa nhà Sông Đà, Phạm Hùng, Mỹ Đình, Hà Nội");
  const [pdfHotlineEmail, setPdfHotlineEmail] = useState(() => localStorage.getItem('pdf_hotline_email') || "Hotline: 024.123.4567 | Email: contact@visualroom.com");
  const [pdfReportTitle, setPdfReportTitle] = useState(() => localStorage.getItem('pdf_report_title') || "BẢNG TỔNG HỢP CÔNG & PHÉP NHÂN SỰ");
  const [pdfDocumentCode, setPdfDocumentCode] = useState(() => localStorage.getItem('pdf_document_code') || "QT-NS-09");
  const [pdfSigner1, setPdfSigner1] = useState(() => localStorage.getItem('pdf_signer1') || "Bộ phận Nhân sự");
  const [pdfSigner2, setPdfSigner2] = useState(() => localStorage.getItem('pdf_signer2') || "Ban Tài chính - Kế toán");
  const [pdfSigner3, setPdfSigner3] = useState(() => localStorage.getItem('pdf_signer3') || "Đại diện pháp luật");
  const [pdfLocation, setPdfLocation] = useState(() => localStorage.getItem('pdf_location') || "");
  const [pdfDateString, setPdfDateString] = useState(() => {
    return localStorage.getItem('pdf_date_string') || (() => {
      const today = new Date();
      return `Hà Nội, ngày ${String(today.getDate()).padStart(2, '0')} tháng ${String(today.getMonth() + 1).padStart(2, '0')} năm ${today.getFullYear()}`;
    })();
  });

  const handleUpdatePdfConfig = (key: string, value: string, setter: (val: string) => void) => {
    setter(value);
    localStorage.setItem(key, value);
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?role=accountant`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDelete = async (log: TimeLog) => {
    if (!log.rowIndex) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa lịch sử chấm công của ${log.employeeName} ngày ${log.date}?`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteTimeLog(accessToken, log.rowIndex);
      alert("Xóa dòng chấm công thành công trên Google Sheet!");
      onLogUpdated();
    } catch (err: any) {
      console.error(err);
      alert(`Không thể xóa: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;

    setIsUpdating(true);
    try {
      await updateTimeLog(accessToken, editingLog);
      alert("Cập nhật nhật ký chấm công thành công vào Google Sheet!");
      setEditingLog(null);
      onLogUpdated();
    } catch (err: any) {
      console.error(err);
      alert(`Lỗi khi cập nhật Google Sheets: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  // Total days in selected month
  const totalDaysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedMonth, selectedYear]);

  // Precompute days information for selected month and year to avoid redundant heavy date allocations inside nested employee loops
  const daysInfo = useMemo(() => {
    const info = [];
    const monthStr = String(selectedMonth).padStart(2, '0');
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${selectedYear}-${monthStr}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
      const isWeekend = dayOfWeek === 0; // Sunday only
      const holidayName = getVietnamHolidayName(dateStr);
      info.push({
        day: d,
        dateStr,
        dayOfWeek,
        isWeekend,
        holidayName
      });
    }
    return info;
  }, [selectedMonth, selectedYear, totalDaysInMonth]);

  // Aggregate monthly report for all employees
  const monthlyReports = useMemo((): EmployeeMonthlyReport[] => {
    const result: EmployeeMonthlyReport[] = [];

    // Filter logs for selected month and year
    const monthlyLogs = timeLogs.filter(log => {
      const [y, m] = log.date.split('-');
      return parseInt(y) === selectedYear && parseInt(m) === selectedMonth;
    });

    // Pre-group monthly logs by employee name for fast lookup
    const monthlyLogsByEmp = new Map<string, TimeLog[]>();
    for (const log of monthlyLogs) {
      const empKey = log.employeeName.trim().toLowerCase();
      if (!monthlyLogsByEmp.has(empKey)) {
        monthlyLogsByEmp.set(empKey, []);
      }
      monthlyLogsByEmp.get(empKey)!.push(log);
    }

    employees.forEach(emp => {
      const empKey = emp.name.trim().toLowerCase();
      const empLogs = monthlyLogsByEmp.get(empKey) || [];

      // Pre-index empLogs by date for O(1) fast lookup
      const empLogsByDate = new Map<string, TimeLog>();
      for (const log of empLogs) {
        empLogsByDate.set(log.date, log);
      }

      // Initialize daily status calendar grid
      const dailyDetails: { [day: number]: DailyStatus } = {};
      
      daysInfo.forEach(({ day, dateStr, dayOfWeek, isWeekend, holidayName }) => {
        const dayLog = empLogsByDate.get(dateStr);

        let status: DailyStatus['status'] = holidayName ? 'Ngày lễ' : (isWeekend ? 'Nghỉ cuối tuần' : 'Có đi làm');
        let otFrom = '';
        let otTo = '';
        let note = holidayName || '';

        const isBeforeStart = emp.registeredAt 
          ? isDateBeforeRegistered(selectedYear, selectedMonth, day, emp.registeredAt)
          : false;
        const isAfterResigned = emp.leftAt
          ? isDateAfterLeft(selectedYear, selectedMonth, day, emp.leftAt)
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

        dailyDetails[day] = {
          date: dateStr,
          status,
          otFrom,
          otTo,
          note,
          holidayName: holidayName || undefined
        };
      });

      // Calculate aggregated numbers
      let presentDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let holidayDays = 0;
      let totalOtHours = 0;

      daysInfo.forEach(({ day, dayOfWeek, isWeekend }) => {
        const detail = dailyDetails[day];

        if (detail.status === 'Có đi làm') {
          presentDays++;
          if (dayOfWeek === 0) { // Sunday work is always OT by default
            if (detail.otFrom && detail.otTo) {
              totalOtHours += calculateOtHours(detail.otFrom, detail.otTo);
            } else {
              totalOtHours += 8; // Default to 8h of OT on Sunday if not specified
            }
          } else {
            if (detail.otFrom && detail.otTo) {
              totalOtHours += calculateOtHours(detail.otFrom, detail.otTo);
            }
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
      });

      result.push({
        employeeName: emp.name,
        role: emp.role,
        totalDays: totalDaysInMonth,
        presentDays,
        absentDays,
        leaveDays,
        holidayDays,
        totalOtHours,
        logs: empLogs,
        dailyDetails
      });
    });

    return result;
  }, [employees, timeLogs, selectedMonth, selectedYear, totalDaysInMonth, daysInfo]);

  const filteredReports = useMemo(() => {
    return monthlyReports.filter(r => 
      r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [monthlyReports, searchTerm]);

  const getDetailedRestDaysString = useCallback((report: EmployeeMonthlyReport): string => {
    const leaveList: string[] = [];
    const absentList: string[] = [];
    
    daysInfo.forEach(({ day, isWeekend }) => {
      const detail = report.dailyDetails[day];
      if (detail) {
        if (detail.status === 'Nghỉ phép') {
          leaveList.push(String(day).padStart(2, '0'));
        } else if (detail.status === 'Không đi làm' && !isWeekend) {
          absentList.push(String(day).padStart(2, '0'));
        }
      }
    });

    const parts: string[] = [];
    if (leaveList.length > 0) {
      parts.push(`Phép: ${leaveList.join(', ')}`);
    }
    if (absentList.length > 0) {
      parts.push(`Vắng: ${absentList.join(', ')}`);
    }
    
    if (parts.length === 0) return "-";
    return parts.join(' | ');
  }, [daysInfo]);

  // Leave Entitlement and Balance calculation according to Labor Law (1 day per month)
  const leaveReports = useMemo(() => {
    // Group YTD leave logs by employee name for fast lookup
    const ytdLeaveLogsByEmp = new Map<string, TimeLog[]>();
    for (const log of timeLogs) {
      if (log.status === 'Nghỉ phép') {
        const [y] = log.date.split('-');
        const logYear = parseInt(y, 10);
        if (logYear === selectedYear) {
          const empKey = log.employeeName.trim().toLowerCase();
          if (!ytdLeaveLogsByEmp.has(empKey)) {
            ytdLeaveLogsByEmp.set(empKey, []);
          }
          ytdLeaveLogsByEmp.get(empKey)!.push(log);
        }
      }
    }

    // Sort logs
    for (const logs of ytdLeaveLogsByEmp.values()) {
      logs.sort((a, b) => b.date.localeCompare(a.date));
    }

    return employees.map(emp => {
      const parsedReg = parseRegisteredDate(emp.registeredAt);
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

      const parsedLeft = emp.leftAt ? parseRegisteredDate(emp.leftAt) : null;
      if (parsedLeft) {
        if (selectedYear > parsedLeft.year) {
          monthsWorkedInSelectedYear = 0;
        } else if (selectedYear === parsedLeft.year) {
          const startMonth = selectedYear === regYear ? regMonth : 1;
          const endMonth = parsedLeft.month;
          monthsWorkedInSelectedYear = Math.max(0, endMonth - startMonth + 1);
        }
      }

      const empKey = emp.name.trim().toLowerCase();
      const ytdLeaveLogs = ytdLeaveLogsByEmp.get(empKey) || [];

      const initialCarryover = (() => {
        if (selectedYear !== 2026) return 0;
        if (emp.leaveCarryover !== undefined) return emp.leaveCarryover;
        const nameLower = emp.name.toLowerCase();
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
      const baseEntitlement = emp.leaveAllowance !== undefined 
        ? emp.leaveAllowance 
        : monthsWorkedInSelectedYear;

      // Excess before Tet and all after Tet are deducted from base entitlement
      const leaveRemaining = baseEntitlement - (excessBeforeTet + leaveUsedAfterTet);
      const leaveEntitlement = baseEntitlement + carryoverUsed;
      const leaveUsed = ytdLeaveLogs.length;

      return {
        employee: emp,
        registeredAtParsed: parsedReg,
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
    });
  }, [employees, timeLogs, selectedYear]);

  // Leave calculation according to Accountant Thanh Chau's chat chot (2025-2026)
  const accountantLeaveReports = useMemo(() => {
    // Group YTD leave logs by employee name for fast lookup
    const ytdLeaveLogsByEmp = new Map<string, TimeLog[]>();
    for (const log of timeLogs) {
      if (log.status === 'Nghỉ phép') {
        const [y, m] = log.date.split('-');
        const logYear = parseInt(y, 10);
        const logMonth = parseInt(m, 10);
        if (logYear === selectedYear && logMonth <= selectedMonth) {
          const empKey = log.employeeName.trim().toLowerCase();
          if (!ytdLeaveLogsByEmp.has(empKey)) {
            ytdLeaveLogsByEmp.set(empKey, []);
          }
          ytdLeaveLogsByEmp.get(empKey)!.push(log);
        }
      }
    }

    // Sort logs
    for (const logs of ytdLeaveLogsByEmp.values()) {
      logs.sort((a, b) => b.date.localeCompare(a.date));
    }

    const rules = [
      {
        key: 'vu',
        searchNames: ['vũ', 'vu'],
        displayName: 'Anh Vũ',
        category: 'Gộp phép 2025 & 2026',
        ruleDesc: 'Đã cộng gộp 12 ngày phép còn dư từ năm 2025 gối đầu và 6 ngày phép tích lũy của năm 2026. Sang năm sau (2027) sẽ xóa hết ngày nghỉ thừa gối đầu không cộng dồn nữa.',
        totalEntitled: 18,
        usedByChat: 0,
        remainingByChat: 18,
        chatQuote: 'a Vũ còn 12 ngày phép 2025 gối đầu và 6 ngày phép năm 2026.'
      },
      {
        key: 'dung',
        searchNames: ['dũng', 'dung'],
        displayName: 'Anh Dũng',
        category: 'Gộp phép 2025 & 2026',
        ruleDesc: 'Đã cộng gộp 10 ngày phép còn dư từ năm 2025 và 6 ngày phép tích lũy của năm 2026. Sang năm sau (2027) sẽ xóa hết ngày nghỉ thừa gối đầu.',
        totalEntitled: 16,
        usedByChat: 0,
        remainingByChat: 16,
        chatQuote: 'a Dũng còn 10 ngày phép 2025 gối đầu và 6 ngày phép năm 2026.'
      },
      {
        key: 'hao',
        searchNames: ['hảo', 'hao'],
        displayName: 'Anh Hảo',
        category: 'Gộp phép 2025 & 2026',
        ruleDesc: 'Đã cộng gộp 6 ngày phép còn dư từ năm 2025 và 6 ngày phép tích lũy của năm 2026. Sang năm sau (2027) sẽ xóa hết ngày nghỉ thừa gối đầu.',
        totalEntitled: 12,
        usedByChat: 0,
        remainingByChat: 12,
        chatQuote: 'a Hảo còn 6 ngày phép 2025 gối đầu và 6 ngày phép năm 2026.'
      },
      {
        key: 'thuan',
        searchNames: ['thuận', 'thuan'],
        displayName: 'Anh Thuận (Thuận Tom)',
        category: 'Tích lũy năm 2026 (YTD)',
        ruleDesc: 'Phép năm 2025 dư 2 ngày đã nghỉ hết trong tháng 6/2025 (còn 0). Phép năm 2026 tính đến tháng 7 tích lũy 7 ngày, đã nghỉ 1 ngày trong tháng nên còn 6 ngày phép. Tổng cộng lịch sử đã nghỉ 13 ngày (tính từ năm 2025 đến tháng 7/2026).',
        totalEntitled: 7, // Tích lũy 2026 đến tháng 7
        usedByChat: 1, // Đã dùng 1 ngày nghỉ trong năm 2026
        remainingByChat: 6,
        chatQuote: 'Tính theo năm 2026 thì đến tháng 7 anh có 7 ngày phép, đã nghỉ 1 ngày còn 6 ngày. Tính từ năm 2025 - 7/2026 là 13 ngày anh nghỉ.'
      },
      {
        key: 'nhi',
        searchNames: ['nhi'],
        displayName: 'Phạm Thị Anh Nhi',
        category: 'Đặc cách (Làm việc 1 năm)',
        ruleDesc: 'Đang học việc không được hưởng phép theo luật, nhưng do làm tròn 1 năm nên công ty ưu ái đặc cách cấp 6 ngày phép, đã nghỉ 2 ngày, còn lại 4 ngày phép.',
        totalEntitled: 6,
        usedByChat: 2, // 6 total - 4 remaining
        remainingByChat: 4,
        chatQuote: 'Nhi học việc nên theo luật không có ngày phép, nhưng làm được 1 năm nên công ty cho 6 ngày phép, em còn 4 ngày phép.'
      },
      {
        key: 'thuong',
        searchNames: ['thương', 'thuong'],
        displayName: 'Chị Thương',
        category: 'Tích lũy tỷ lệ (11 tháng)',
        ruleDesc: 'Thâm niên làm việc đạt 11 tháng, được tích lũy theo tỷ lệ 11 ngày phép năm, đã nghỉ 5 ngày, còn lại 6 ngày phép.',
        totalEntitled: 11,
        usedByChat: 5, // 11 total - 6 remaining
        remainingByChat: 6,
        chatQuote: 'chị Thương làm được 11 tháng thì có 11 phép, giờ còn 6 phép.'
      },
      {
        key: 'thuc',
        searchNames: ['thức', 'thuc'],
        displayName: 'Anh Thức',
        category: 'Tích lũy tỷ lệ (10 tháng)',
        ruleDesc: 'Thâm niên làm việc đạt 10 tháng, được tích lũy theo tỷ lệ 10 ngày phép năm, chưa sử dụng ngày nào, còn lại 10 ngày phép.',
        totalEntitled: 10,
        usedByChat: 0,
        remainingByChat: 10,
        chatQuote: 'a Thức làm được 10 tháng thì anh đang có 10 ngày phép.'
      }
    ];

    return rules.map(rule => {
      // Find matching employee in real DB
      const matchedEmp = employees.find(emp => {
        const empNameLower = emp.name.toLowerCase();
        return rule.searchNames.some(name => empNameLower.includes(name));
      });

      const empKey = matchedEmp ? matchedEmp.name.trim().toLowerCase() : '';
      const systemLeaveLogs = empKey ? (ytdLeaveLogsByEmp.get(empKey) || []) : [];
      const systemLeaveUsed = systemLeaveLogs.length;

      return {
        ...rule,
        matchedEmployee: matchedEmp,
        systemLeaveUsed,
        systemLeaveLogs,
        isMatched: !!matchedEmp
      };
    });
  }, [employees, timeLogs, selectedMonth, selectedYear]);

  // Overall Statistics summary
  const stats = useMemo(() => {
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLeave = 0;
    let totalHoliday = 0;
    let totalOtHours = 0;
    let totalLogs = 0;

    monthlyReports.forEach(r => {
      totalPresent += r.presentDays;
      totalAbsent += r.absentDays;
      totalLeave += r.leaveDays;
      totalHoliday += r.holidayDays;
      totalOtHours += r.totalOtHours;
      totalLogs += r.logs.length;
    });

    const activeWorkforce = employees.length;
    return {
      totalPresent,
      totalAbsent,
      totalLeave,
      totalHoliday,
      totalOtHours,
      totalLogs,
      activeWorkforce
    };
  }, [monthlyReports, employees]);

  // Chart Data: Attendance status statistics by day
  const chartData = useMemo(() => {
    const data = [];
    const monthStr = String(selectedMonth).padStart(2, '0');

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${selectedYear}-${monthStr}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
      const isWeekend = dayOfWeek === 0; // Sunday only

      let countPresent = 0;
      let countLeave = 0;
      let countAbsent = 0;
      let countHoliday = 0;

      monthlyReports.forEach(report => {
        const detail = report.dailyDetails[d];
        if (detail.status === 'Có đi làm') countPresent++;
        else if (detail.status === 'Nghỉ phép') countLeave++;
        else if (detail.status === 'Ngày lễ') countHoliday++;
        else if (detail.status === 'Không đi làm' && !isWeekend) countAbsent++;
      });

      // Only plot if there is activity, or weekdays/Saturdays
      if (!isWeekend || (countPresent + countLeave + countHoliday > 0)) {
        data.push({
          day: `N ${d}`,
          "Đi Làm": countPresent,
          "Nghỉ Phép": countLeave,
          "Nghỉ Lễ": countHoliday,
          "Vắng Mặt": countAbsent
        });
      }
    }
    return data;
  }, [monthlyReports, totalDaysInMonth, selectedMonth, selectedYear]);

  // Donut chart data calculation for overall monthly statistics
  const donutData = useMemo(() => {
    let present = 0;
    let leave = 0;
    let holiday = 0;
    let absent = 0;

    chartData.forEach(item => {
      present += item["Đi Làm"] || 0;
      leave += item["Nghỉ Phép"] || 0;
      holiday += item["Nghỉ Lễ"] || 0;
      absent += item["Vắng Mặt"] || 0;
    });

    const total = present + leave + holiday + absent;
    if (total === 0) return [];

    return [
      { name: "Đi Làm", value: present, color: "#10b981", percentage: ((present / total) * 100).toFixed(1) },
      { name: "Nghỉ Phép", value: leave, color: "#f59e0b", percentage: ((leave / total) * 100).toFixed(1) },
      { name: "Nghỉ Lễ", value: holiday, color: "#ec4899", percentage: ((holiday / total) * 100).toFixed(1) },
      { name: "Vắng Mặt", value: absent, color: "#ef4444", percentage: ((absent / total) * 100).toFixed(1) }
    ].filter(item => item.value > 0);
  }, [chartData]);

  const toggleExpand = (empName: string) => {
    setExpandedEmployeeName(expandedEmployeeName === empName ? null : empName);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Accountant role back to login banner */}
      {role === 'accountant' && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/15 border border-amber-100/50 dark:border-amber-900/30 rounded-[24px] p-5.5 shadow-sm animate-fadeIn">
          <div className="space-y-1">
            <h4 className="font-sans font-bold text-sm text-amber-950 dark:text-amber-200 flex items-center gap-2">
              <span className="p-1 bg-amber-100 dark:bg-amber-950/60 rounded-lg">👩‍💼</span>
              Bộ phận Kế toán (Chỉ Xem & In PDF)
            </h4>
            <p className="text-xs text-amber-800/90 dark:text-amber-350 leading-relaxed">
              Bạn đang ở chế độ xem báo cáo tổng hợp công & phép của toàn thể nhân sự. Bạn có thể xuất bản bảng tổng hợp thành file PDF hoặc in trực tiếp.
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('user_role');
              localStorage.removeItem('accountant_key');
              window.location.href = window.location.origin + window.location.pathname;
            }}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-full text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Quay lại đăng nhập
          </button>
        </div>
      )}

      {/* Share Link for Accountant */}
      {role === 'admin' && (
        <div id="share-section" className="bg-gradient-to-r from-indigo-50/70 to-sky-50/70 dark:from-indigo-950/30 dark:to-slate-900/30 border border-indigo-100/60 dark:border-indigo-900/40 rounded-[28px] p-5.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Share2 className="w-4 h-4" />
              </div>
              Liên Liên Kết Chia Sẻ Cho Bộ Phận Kế Toán
            </h4>
            <p className="text-xs text-indigo-700/90 dark:text-indigo-350 leading-relaxed">
              Hãy sao chép liên kết này và gửi cho bộ phận kế toán. Khi truy cập, họ sẽ được đưa vào <b>Chế độ Xem Báo Cáo Chấm Công</b> để theo dõi công nhật, tăng ca của toàn bộ nhân viên mà không có quyền thay đổi dữ liệu của bạn.
            </p>
          </div>
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold rounded-full text-xs shadow-md hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 active:scale-[0.98] cursor-pointer shrink-0"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Đã sao chép!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Sao chép liên kết
              </>
            )}
          </button>
        </div>
      )}

      {/* Sync Google Sheets Monthly Tabs Notification */}
      {role === 'admin' && (
        <div className="bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-100/60 dark:border-emerald-900/30 rounded-[28px] p-5.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="space-y-1">
            <h4 className="font-sans font-bold text-sm text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              Đồng bộ dữ liệu từ các sheet tháng (JANUARY, FEBRUARY...)
            </h4>
            <p className="text-xs text-emerald-700/90 dark:text-emerald-400 leading-relaxed">
              Nếu bạn vừa cập nhật dữ liệu trực tiếp trên file Google Sheets của mình (đặc biệt là các tháng của năm 2026), hãy chạy đồng bộ nâng cao để dữ liệu được chuyển đổi đầy đủ vào bảng lịch tổng hợp của hệ thống.
            </p>
          </div>
          <button
            onClick={() => {
              const event = new CustomEvent('trigger-advanced-grid-sync');
              window.dispatchEvent(event);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 animate-pulse" />
            Đồng bộ từ các sheet tháng ngay
          </button>
        </div>
      )}

      {/* Configuration and Date Filter Row */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800/80 shadow-md flex flex-col sm:flex-row gap-5 justify-between items-start sm:items-center transition-colors duration-300">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
            <CalendarIcon className="w-4.5 h-4.5" />
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 font-sans">Chọn Tháng Báo Cáo:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-extrabold cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 shadow-xs"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Tháng {i + 1}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-extrabold cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 shadow-xs"
          >
            {years.map(y => (
              <option key={y} value={y} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Năm {y}</option>
            ))}
          </select>
        </div>

        {/* PDF Export Button */}
        <div className="flex gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setShowPdfPreview(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-extrabold rounded-full text-xs shadow-md shadow-rose-100/50 hover:shadow-lg hover:shadow-rose-500/25 dark:shadow-none transition-all duration-300 active:scale-[0.98] cursor-pointer w-full sm:w-auto hover:scale-[1.02]"
          >
            <Printer className="w-4 h-4" />
            <span>Xuất Báo Cáo PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] p-5.5 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tổng nhân sự</span>
            <span className="text-xl font-bold text-slate-850 dark:text-slate-100 leading-tight block mt-0.5">{stats.activeWorkforce} nhân sự</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] p-5.5 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tổng ngày công</span>
            <span className="text-xl font-bold text-slate-850 dark:text-slate-100 leading-tight block mt-0.5">{stats.totalPresent} ngày công</span>
            {stats.totalHoliday > 0 && (
              <span className="block text-[10px] text-pink-600 dark:text-pink-400 font-bold mt-0.5">
                (+ {stats.totalHoliday} ngày nghỉ lễ Nhà nước)
              </span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] p-5.5 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tổng thời gian OT</span>
            <span className="text-xl font-bold text-slate-850 dark:text-slate-100 leading-tight block mt-0.5">{stats.totalOtHours.toFixed(1)} giờ</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] p-5.5 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tổng ngày vắng</span>
            <span className="text-xl font-bold text-slate-850 dark:text-slate-100 leading-tight block mt-0.5">{stats.totalAbsent} ngày vắng</span>
          </div>
        </div>
      </div>



      {/* Tab selection for Reports */}
      <div className="flex gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-950/60 rounded-full w-full max-w-2xl mx-auto shadow-sm transition-colors duration-300 border border-slate-200/50 dark:border-slate-850/60">
        <button
          onClick={() => {
            setSubTab('summary');
            setExpandedEmployeeName(null);
          }}
          className={`flex-1 py-2 px-4 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            subTab === 'summary'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          📊 Bảng Tổng Hợp Công & OT
        </button>
        <button
          onClick={() => {
            setSubTab('calendar');
            setExpandedEmployeeName(null);
          }}
          className={`flex-1 py-2 px-4 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            subTab === 'calendar'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          📅 Lịch Chi Tiết Nhân Viên
        </button>
        <button
          onClick={() => {
            setSubTab('leave');
            setExpandedEmployeeName(null);
          }}
          className={`flex-1 py-2 px-4 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            subTab === 'leave'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          ⚖️ Tính Ngày Phép (Luật)
        </button>
      </div>

      <AnimatePresence mode="wait">
        {subTab === 'leave' && (
          <motion.div
            key="leave"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.4 }}
            className="space-y-6"
          >
          {/* Calculation Mode Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl max-w-lg mx-auto border border-slate-200/50 dark:border-slate-800/80 shadow-inner">
            <button
              onClick={() => {
                setLeaveCalcMode('standard');
                setExpandedEmployeeName(null);
              }}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                leaveCalcMode === 'standard'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <span>📊</span> Tính Tự Động (Theo Luật)
            </button>
            <button
              onClick={() => {
                setLeaveCalcMode('accountant');
                setExpandedEmployeeName(null);
              }}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                leaveCalcMode === 'accountant'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <span>📑</span> Đối Chiếu Kế Toán
            </button>
          </div>

          {leaveCalcMode === 'standard' ? (
            <>
              {/* Law Introduction Panel */}
              <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/70 dark:from-amber-950/20 dark:to-orange-950/15 border border-amber-100/60 dark:border-amber-900/30 rounded-3xl p-5.5 shadow-sm">
            <h4 className="font-sans font-extrabold text-sm text-amber-950 dark:text-amber-200 flex items-center gap-2 mb-2">
              <span className="p-1 bg-amber-100 dark:bg-amber-950 rounded-lg">⚖️</span>
              Bộ Luật Lao Động: Quy định về Nghỉ phép hằng năm
            </h4>
            <div className="text-xs text-amber-800/90 dark:text-amber-350 leading-relaxed space-y-2">
              <p>
                Theo quy định tại <b>Khoản 1 Điều 113 Bộ luật Lao động 2019</b>, người lao động làm việc đủ 12 tháng cho một người sử dụng lao động thì được nghỉ hằng năm hưởng nguyên lương là <b>12 ngày làm việc</b>. Như vậy, tương đương bình quân mỗi nhân sự được tích lũy <b>1 ngày nghỉ phép cho mỗi tháng làm việc thực tế</b>.
              </p>
              <p>
                Công thức tự động thâm niên tích lũy phép năm {selectedYear} (tính đến hết Tháng {selectedMonth}): <code className="font-mono bg-amber-100/50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded font-bold text-amber-950 dark:text-amber-300">Số ngày phép được hưởng = Số tháng làm việc trong năm {selectedYear}</code>
              </p>
            </div>
          </div>

          {/* Leave reports Table & Detail list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[32px] shadow-md overflow-hidden transition-colors duration-300">
            <div className="p-6 border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
              <h3 className="font-sans font-bold text-base text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                Quản lý & Tra cứu Ngày nghỉ phép năm (YTD {selectedYear})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {!isTableLoaded ? (
                <div className="p-6 space-y-4">
                  {[1, 2].map((idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-800/40 last:border-0 animate-pulse">
                      <div className="flex items-center gap-3 w-full sm:w-1/3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-850" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                          <div className="h-3 bg-slate-150 dark:bg-slate-850/50 rounded w-1/2" />
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <div className="h-7 bg-slate-150 dark:bg-slate-850 rounded-full w-16" />
                        <div className="h-7 bg-slate-150 dark:bg-slate-850 rounded-full w-16" />
                        <div className="h-7 bg-slate-150 dark:bg-slate-850 rounded-full w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                leaveReports.map((report) => {
                  const isExpanded = expandedEmployeeName === `leave-${report.employee.name}`;
                  return (
                  <div key={report.employee.name} className="transition-colors hover:bg-slate-50/30 dark:hover:bg-slate-850/10">
                    {/* Header trigger */}
                    <div
                      onClick={() => setExpandedEmployeeName(isExpanded ? null : `leave-${report.employee.name}`)}
                      className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center font-bold text-amber-700 dark:text-amber-400 text-sm">
                          {report.employee.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{report.employee.name}</h4>
                          <p className="text-xs text-slate-450 dark:text-slate-500">
                            Chức vụ: <span className="font-semibold text-slate-600 dark:text-slate-450">{report.employee.role}</span> | Vào làm: <span className="font-mono text-slate-500 dark:text-slate-400">{report.employee.registeredAt || "N/A"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2.5 items-center text-xs font-bold">
                        <div className="bg-slate-50 dark:bg-slate-950/40 text-slate-650 dark:text-slate-350 px-3.5 py-1.5 rounded-2xl border border-slate-100/30 flex flex-col items-center min-w-22">
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">Được hưởng (A)</span>
                          <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{report.leaveEntitlement} ngày</span>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-3.5 py-1.5 rounded-2xl border border-amber-100/30 flex flex-col items-center min-w-22">
                          <span className="text-[9px] text-amber-455 dark:text-amber-550 uppercase">Đã nghỉ phép (B)</span>
                          <span className="text-sm font-extrabold text-amber-600 dark:text-amber-500">{report.leaveUsed} ngày</span>
                        </div>
                        <div className={`px-3.5 py-1.5 rounded-2xl flex flex-col items-center min-w-22 ${
                          report.leaveRemaining > 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/30'
                            : report.leaveRemaining === 0
                              ? 'bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-450 border border-slate-100/30'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100/30'
                        }`}>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">Còn lại (A-B)</span>
                          <span className="text-sm font-extrabold">{report.leaveRemaining} ngày</span>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500 ml-2" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500 ml-2" />
                        )}
                      </div>
                    </div>

                    {/* Expanded details (Leave logs for this employee YTD) */}
                    {isExpanded && (
                      <div className="px-5 pb-6 pt-2 bg-slate-50/40 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-fadeIn">
                        <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-100/40 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800 space-y-2">
                          <span className="font-bold text-slate-700 dark:text-slate-300 block">⚖️ Chi tiết tính toán & Reset phép sau Tết Nguyên Đán {selectedYear}:</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                            <div>
                              <p>• Quỹ phép cơ bản {selectedYear}: <strong className="text-slate-800 dark:text-slate-200">{report.baseEntitlement} ngày</strong></p>
                              <p>• Phép gối đầu 2025 nhận: <strong className="text-slate-800 dark:text-slate-200">{report.initialCarryover} ngày</strong></p>
                              <p className="text-amber-600 dark:text-amber-400">• Hạn sử dụng phép gối đầu: <strong className="font-extrabold">Trước Tết Ta (17/02/2026)</strong></p>
                            </div>
                            <div>
                              <p>• Đã dùng trước Tết Ta: <strong className="text-slate-800 dark:text-slate-200">{report.leaveUsedBeforeTet} ngày</strong> (trừ vào phép 2025)</p>
                              <p className="text-rose-500 font-bold">• Phép 2025 hết hạn (Reset về 0): {report.carryoverExpired} ngày</p>
                              <p>• Đã dùng từ sau Tết Ta: <strong className="text-slate-800 dark:text-slate-200">{report.leaveUsedAfterTet} ngày</strong> (trừ vào phép {selectedYear})</p>
                            </div>
                          </div>
                          <p className="pt-1 text-xs">
                            Theo quy định mới, <strong className="text-slate-800 dark:text-slate-200">không cộng dồn ngày phép gối đầu sang năm tiếp theo sau Tết Nguyên Đán</strong>. 
                            Tổng quỹ phép khả dụng thực tế sau reset là <strong className="text-indigo-600 dark:text-indigo-400">{report.leaveEntitlement} ngày</strong> (Phép năm {selectedYear} + Phép gối đầu đã dùng kịp trước Tết). 
                            Đã sử dụng tổng cộng <strong className="text-slate-800 dark:text-slate-200">{report.leaveUsed} ngày</strong>. 
                            Số phép còn lại khả dụng hiện tại là <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{report.leaveRemaining} ngày</strong>.
                          </p>
                        </div>

                        <div className="border border-slate-200/50 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40">
                          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 text-[10px] font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                            Lịch sử sử dụng nghỉ phép cả năm {selectedYear}
                          </div>
                          <div className="divide-y divide-slate-100 dark:divide-slate-850">
                            {report.ytdLeaveLogs.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                                Chưa có ngày nghỉ phép nào được ghi nhận trong cả năm {selectedYear}
                              </div>
                            ) : (
                              report.ytdLeaveLogs.map((log, index) => (
                                <div key={index} className="p-3 text-xs flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-[11px] font-bold">
                                      {log.date}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Lý do: Nghỉ phép năm hưởng lương</span>
                                  </div>
                                  {log.note && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded max-w-xs truncate" title={log.note}>
                                      "{log.note}"
                                    </span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          </div>
          </>
          ) : (
            <>
              {/* Accountant Chat Simulation Panel */}
              <div className="bg-slate-950 text-slate-100 rounded-3xl p-5.5 shadow-xl border border-slate-800 space-y-4 font-sans max-w-4xl mx-auto overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-400 font-mono ml-2">Hội thoại chốt phép: Bộ phận Kế toán & Ban quản lý</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-3 py-1 rounded-full border border-amber-500/20">
                    Trích dẫn Zalo/Messenger
                  </span>
                </div>

                <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar text-xs">
                  <div className="flex flex-col gap-1 max-w-[88%] bg-slate-900 border border-slate-800/50 rounded-2xl p-3.5 shadow-sm">
                    <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">👩‍💼 Kế toán <span className="font-normal text-slate-500 text-[9px] font-mono">16:45</span></span>
                    <p className="text-xs text-slate-200 leading-relaxed space-y-1">
                      <span>e gửi ngày phép của mn của năm 2025 nhá và sang năm sẽ ko gộp này phép nữa nhé mn ơi:</span><br />
                      <span className="pl-2 block">• a Vũ còn 12 ngày phép</span>
                      <span className="pl-2 block">• a Dũng còn 10 ngày phép</span>
                      <span className="pl-2 block">• a Hảo còn 6 ngày phép</span>
                      <span className="pl-2 block">• a Thuận tháng 6 này a nghỉ lun 2 ngày còn lại của anh là hết rùi nhé</span>
                      <span className="pl-2 block">• Nhi đáng lẽ e ko có nhưng chị vẫn tính cho e dc 6 ngày phép nha là e còn 4 ngày phép</span>
                      <span className="pl-2 block">• c Thương chưa làm dc 1 năm nên chưa có ạ</span>
                      <span className="pl-2 block">• a Thức a cũng chưa dc 1 năm nên chưa có ngày phép nhé</span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 max-w-[88%] bg-slate-900 border border-slate-800/50 rounded-2xl p-3.5 shadow-sm">
                    <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">👩‍💼 Kế toán <span className="font-normal text-slate-500 text-[9px] font-mono">16:55</span></span>
                    <p className="text-xs text-slate-200 leading-relaxed font-semibold text-amber-200">
                      e vừa check lại:<br />
                      <span className="pl-2 block">• chị Thương làm dc 11 tháng thì có 11 phép giờ còn 6 phép</span>
                      <span className="pl-2 block">• a Thức làm dc 10 tháng thì a đang có 10 ngày phép nha anh</span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 max-w-[88%] bg-slate-900 border border-slate-800/50 rounded-2xl p-3.5 shadow-sm">
                    <div className="border-l-2 border-indigo-500 pl-2 bg-slate-950/40 py-1 rounded mb-2 text-slate-400 text-[11px] italic">
                      <b>@Phạm Thị Anh Nhi:</b> Chị kế toán ơi, phép của em được tính sao á...
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">👩‍💼 Kế toán <span className="font-normal text-slate-500 text-[9px] font-mono">17:06</span></span>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      do e học việc nên tính theo luật e sẽ ko có ngày phép năm có lương nhưng do e cũng làm dc 1 năm rùi nên cty sẽ 6 ngày phép năm nha
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 max-w-[88%] bg-slate-900 border border-slate-800/50 rounded-2xl p-3.5 shadow-sm">
                    <div className="border-l-2 border-indigo-500 pl-2 bg-slate-950/40 py-1 rounded mb-2 text-slate-400 text-[11px] italic">
                      <b>@Thuận Tom:</b> A hỏi tý là nếu a off thêm 2 ngày trong tháng này thì a t...
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">👩‍💼 Kế toán <span className="font-normal text-slate-500 text-[9px] font-mono">17:09</span></span>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      dạ nếu tính theo năm 2026 thì tới hiện tại tháng 7 này thì a đang có 7 ngày phép nhưng a đã nghỉ 1 ngày trong tháng này thì còn 6 ngày tới tháng 7/2026 này nha anh. tính từ năm 2025 - 7/2026 là 13 ngày anh nghỉ á anh
                    </p>
                  </div>
                </div>
              </div>

              {/* Accountant Leave Ledger Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[32px] shadow-md overflow-hidden transition-colors duration-300">
                <div className="p-6 border-b border-slate-150 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-500/5 dark:bg-amber-950/10">
                  <div>
                    <h3 className="font-sans font-bold text-base text-slate-850 dark:text-slate-100 flex items-center gap-2">
                      <div className="p-1.5 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      Báo Cáo Đối Chiếu Phép Chốt Kế Toán (YTD {selectedYear})
                    </h3>
                    <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
                      So sánh dữ liệu chốt thủ công của Kế toán với Nhật ký chấm công thực tế trên hệ thống.
                    </p>
                  </div>
                  <div className="text-xs font-mono bg-white dark:bg-slate-950/80 px-3.5 py-1.5 rounded-full border border-slate-150 dark:border-slate-800 shadow-sm text-slate-500">
                    Tháng báo cáo: Tháng {selectedMonth}/{selectedYear}
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {!isTableLoaded ? (
                    <div className="p-6 space-y-4">
                      {[1, 2].map((idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-800/40 last:border-0 animate-pulse">
                          <div className="flex items-center gap-3 w-full sm:w-1/3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-850" />
                            <div className="space-y-2 flex-1">
                              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                              <div className="h-3 bg-slate-150 dark:bg-slate-850/50 rounded w-1/2" />
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <div className="h-7 bg-slate-150 dark:bg-slate-850 rounded-full w-16" />
                            <div className="h-7 bg-slate-150 dark:bg-slate-850 rounded-full w-16" />
                            <div className="h-7 bg-slate-150 dark:bg-slate-850 rounded-full w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    accountantLeaveReports.map((report) => {
                      const isExpanded = expandedEmployeeName === `accountant-leave-${report.key}`;
                      const discrepancy = report.usedByChat !== report.systemLeaveUsed;

                      return (
                      <div key={report.key} className="transition-colors hover:bg-slate-50/30 dark:hover:bg-slate-850/10">
                        {/* Header block */}
                        <div
                          onClick={() => setExpandedEmployeeName(isExpanded ? null : `accountant-leave-${report.key}`)}
                          className="p-5 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-100/60 dark:border-amber-900/40 flex items-center justify-center font-bold text-amber-700 dark:text-amber-400 text-sm">
                              {report.displayName.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{report.displayName}</h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350">
                                  {report.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                                {report.isMatched ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Khớp nhân sự: "{report.matchedEmployee?.name}"
                                  </span>
                                ) : (
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    Chưa tạo tài khoản hệ thống (Chỉ xem chốt)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2.5 items-center text-xs font-bold">
                            <div className="bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-450 px-3.5 py-1.5 rounded-2xl border border-slate-100/30 flex flex-col items-center min-w-22">
                              <span className="text-[8px] text-slate-400 dark:text-slate-550 uppercase">Cấp theo chốt</span>
                              <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{report.totalEntitled} ngày</span>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-3.5 py-1.5 rounded-2xl border border-amber-100/30 flex flex-col items-center min-w-22">
                              <span className="text-[8px] text-amber-455 dark:text-amber-550 uppercase">Đã nghỉ (Chốt)</span>
                              <span className="text-sm font-extrabold">{report.usedByChat} ngày</span>
                            </div>

                            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3.5 py-1.5 rounded-2xl border border-emerald-100/30 flex flex-col items-center min-w-22">
                              <span className="text-[8px] text-emerald-500 uppercase">Đã nghỉ (Hệ thống)</span>
                              <span className="text-sm font-extrabold">{report.systemLeaveUsed} ngày</span>
                            </div>

                            <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-3.5 py-1.5 rounded-2xl border border-indigo-100/30 flex flex-col items-center min-w-22">
                              <span className="text-[8px] text-indigo-400 uppercase">Còn lại (Chốt)</span>
                              <span className="text-sm font-extrabold">{report.remainingByChat} ngày</span>
                            </div>

                            {/* Verification status badge */}
                            <div className={`px-3 py-1.5 rounded-2xl font-bold flex items-center gap-1 text-xs min-w-28 justify-center ${
                              discrepancy
                                ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-100/40'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30'
                            }`}>
                              {discrepancy ? (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Lệch {Math.abs(report.usedByChat - report.systemLeaveUsed)} ngày</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Đã Khớp</span>
                                </>
                              )}
                            </div>

                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500 ml-1" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500 ml-1" />
                            )}
                          </div>
                        </div>

                        {/* Expandable info details */}
                        {isExpanded && (
                          <div className="px-5 pb-6 pt-2 bg-slate-50/40 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-fadeIn">
                            {/* Explanations */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-2">
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">💬 Đoạn chốt của Kế toán</span>
                                <p className="text-xs italic text-slate-600 dark:text-slate-300 leading-relaxed font-mono bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                                  "{report.chatQuote}"
                                </p>
                              </div>
                              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-2">
                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">📐 Phương án & Quy tắc Tính toán</span>
                                <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
                                  {report.ruleDesc}
                                </p>
                                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 pt-1.5 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-850">
                                  <span>Trạng thái quỹ phép chốt còn lại:</span>
                                  <span className="text-amber-600 dark:text-amber-400 font-extrabold">{report.remainingByChat} ngày khả dụng.</span>
                                </div>
                              </div>
                            </div>

                            {/* Real system logs comparison */}
                            <div className="border border-slate-200/50 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40">
                              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 text-[10px] font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider flex justify-between items-center">
                                <span>Nhật ký Chấm công thực tế trên Hệ thống (Tháng 1 - Tháng {selectedMonth}/{selectedYear})</span>
                                <span className="text-[11px] font-mono text-slate-500">Tìm thấy: {report.systemLeaveUsed} ngày nghỉ phép</span>
                              </div>
                              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                                {report.systemLeaveLogs.length === 0 ? (
                                  <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                                    Không tìm thấy ngày nghỉ phép (Nghỉ phép) nào của {report.displayName} được ghi nhận trên hệ thống trong khoảng thời gian này.
                                  </div>
                                ) : (
                                  report.systemLeaveLogs.map((log, idx) => (
                                    <div key={idx} className="p-3 text-xs flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-colors">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-[11px] font-bold">
                                          {log.date}
                                        </span>
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">Lý do: Nghỉ phép năm hưởng lương</span>
                                      </div>
                                      {log.note && (
                                        <span className="text-xs text-slate-550 dark:text-slate-450 italic bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded max-w-xs truncate">
                                          "{log.note}"
                                        </span>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              </div>
            </>
          )}
          </motion.div>
        )}

        {subTab === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.4 }}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[32px] p-6 shadow-md transition-colors duration-300 space-y-6"
          >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-150 dark:border-slate-800 pb-5">
            <div>
              <h3 className="font-sans font-bold text-base text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                Bảng Tổng Hợp Công, Nghỉ & Tăng Ca OT Nhân Sự
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
                Số liệu tổng hợp nhanh phục vụ kế toán tính lương cho Tháng {selectedMonth}/{selectedYear}.
              </p>
            </div>
            
            {/* Search Input */}
            <div className="w-full sm:w-64 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-850 dark:text-slate-150 font-semibold"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar rounded-2xl border border-slate-150 dark:border-slate-800/60 shadow-inner relative">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 font-extrabold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">
                  <th className="p-4 text-center w-12 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">STT</th>
                  <th className="p-4 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Nhân Viên</th>
                  <th className="p-4 text-center w-24 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Đi Làm (Công)</th>
                  <th className="p-4 text-center w-24 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Vắng Mặt</th>
                  <th className="p-4 text-center w-24 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Nghỉ Có Phép</th>
                  <th className="p-4 min-w-[150px] bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Chi Tiết Ngày Nghỉ</th>
                  <th className="p-4 text-center w-28 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Tăng Ca OT (Giờ)</th>
                  <th className="p-4 min-w-[220px] bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Chi Tiết Tăng Ca (OT)</th>
                  <th className="p-4 text-center w-20 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Nghỉ Lễ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {!isTableLoaded ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                        <span className="text-xs font-medium">Đang tổng hợp dữ liệu...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      Không tìm thấy nhân viên phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report, idx) => {
                    const leaveDetailsStr = getLeaveDaysString(report, totalDaysInMonth);
                    const restDetailsStr = getDetailedRestDaysString(report);
                    const otDetailsStr = getOtDaysString(report, totalDaysInMonth, selectedYear, selectedMonth);

                    return (
                      <tr 
                        key={report.employeeName} 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors border-b border-slate-100 dark:border-slate-800/40 last:border-0"
                      >
                        <td className="p-4 text-center font-bold text-slate-400 dark:text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-4 font-extrabold text-slate-900 dark:text-slate-100 text-sm">{report.employeeName}</td>
                        <td className="p-4 text-center font-black text-slate-900 dark:text-slate-100 text-sm">
                          {report.presentDays} <span className="text-[10px] text-slate-400 font-normal">công</span>
                        </td>
                        <td className="p-4 text-center text-rose-600 font-semibold">
                          {report.absentDays} <span className="text-[10px] text-slate-400 font-normal">ngày</span>
                        </td>
                        <td className="p-4 text-center font-bold text-amber-600 dark:text-amber-400">
                          {report.leaveDays} <span className="text-[10px] text-slate-400 font-normal">ngày</span>
                        </td>
                        <td className="p-4 text-left">
                          <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px] leading-relaxed block whitespace-normal break-words max-w-[220px]">
                            {restDetailsStr}
                          </span>
                        </td>
                        <td className="p-4 text-center text-violet-600 dark:text-violet-400 font-bold text-sm">
                          {report.totalOtHours.toFixed(1)}h
                        </td>
                        <td className="p-4 text-left">
                          <span className="text-purple-800 dark:text-purple-300 font-semibold text-[11px] leading-relaxed block whitespace-normal break-words max-w-[280px]">
                            {otDetailsStr}
                          </span>
                        </td>
                        <td className="p-4 text-center text-pink-600 dark:text-pink-400 font-semibold">
                          {report.holidayDays} <span className="text-[10px] text-slate-400 font-normal">ngày</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          </motion.div>
        )}

        {subTab === 'calendar' && (
          /* Detailed Employee Attendance Grid & Color Calendar */
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.4 }}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[32px] shadow-md overflow-hidden transition-colors duration-300"
          >
          <div className="p-6 border-b border-slate-150 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
            <h3 className="font-sans font-bold text-base text-slate-850 dark:text-slate-100 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              Bảng Chấm Công Chi Tiết Nhân Viên
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {!isTableLoaded ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-800/40 last:border-0 animate-pulse">
                    <div className="flex items-center gap-3 w-full sm:w-1/3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-850" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                        <div className="h-3 bg-slate-150 dark:bg-slate-850/50 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <div className="h-7 bg-slate-150 dark:bg-slate-850 rounded-full w-16" />
                      <div className="h-7 bg-slate-150 dark:bg-slate-850 rounded-full w-16" />
                      <div className="h-7 bg-slate-150 dark:bg-slate-850 rounded-full w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              monthlyReports.map((report) => {
                const isExpanded = expandedEmployeeName === report.employeeName;
                return (
                <div key={report.employeeName} className="transition-colors hover:bg-slate-50/30 dark:hover:bg-slate-850/10">
                  {/* Accordion Trigger Header */}
                  <div
                    onClick={() => toggleExpand(report.employeeName)}
                    className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-400 text-sm">
                        {report.employeeName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{report.employeeName}</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{report.role}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:gap-3 items-center text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-350">
                      <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-100/30 dark:border-emerald-900/30">
                        Đi làm: {report.presentDays} ngày
                      </span>
                      <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-100/30 dark:border-amber-900/30">
                        Nghỉ phép: {report.leaveDays} ngày
                      </span>
                      {report.holidayDays > 0 && (
                        <span className="bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 px-2.5 py-1 rounded-full border border-pink-100/30 dark:border-pink-900/30">
                          Nghỉ lễ: {report.holidayDays} ngày
                        </span>
                      )}
                      <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-full border border-purple-100/30 dark:border-purple-900/30">
                        OT: {report.totalOtHours.toFixed(1)} giờ
                      </span>
                      <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-100/30 dark:border-indigo-900/30">
                        Hiệu suất: {(() => {
                          const weekendsCount = Array.from({ length: totalDaysInMonth }, (_, i) => new Date(selectedYear, selectedMonth - 1, i + 1).getDay()).filter(day => day === 0 || day === 6).length;
                          const workdaysInMonth = totalDaysInMonth - weekendsCount - report.holidayDays;
                          return Math.round((report.presentDays / (workdaysInMonth > 0 ? workdaysInMonth : 1)) * 100) || 0;
                        })()}%
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500 ml-2" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500 ml-2" />
                      )}
                    </div>
                  </div>

                  {/* Color-Coded Calendar Grid Expander */}
                  {isExpanded && (
                    <div className="px-5 pb-6 pt-2 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      {/* Color legends */}
                      <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500 dark:text-slate-450 pt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-lg bg-emerald-500" />
                          <span>Có đi làm</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-lg bg-amber-500" />
                          <span>Nghỉ phép</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-lg bg-pink-500" />
                          <span>Ngày lễ nhà nước</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-lg bg-rose-500" />
                          <span>Không đi làm</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-lg bg-slate-300 dark:bg-slate-700" />
                          <span>Nghỉ cuối tuần</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/10 text-slate-350 dark:text-slate-650" />
                          <span>Chưa vào làm</span>
                        </div>
                      </div>

                      {/* Grid rendering */}
                      <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-31 gap-2 pt-2">
                        {Array.from({ length: totalDaysInMonth }, (_, i) => {
                          const day = i + 1;
                          const detail = report.dailyDetails[day];
                          const dayOfWeek = new Date(selectedYear, selectedMonth - 1, day).getDay();
                          const isWeekend = dayOfWeek === 0; // Sunday only

                          let colorClass = 'bg-slate-200 dark:bg-slate-850 text-slate-500 dark:text-slate-400'; // Weekend default (Sunday)
                          if (detail.status === 'Có đi làm') colorClass = 'bg-emerald-500 text-white';
                          else if (detail.status === 'Nghỉ phép') colorClass = 'bg-amber-500 text-white';
                          else if (detail.status === 'Ngày lễ') colorClass = 'bg-pink-500 text-white font-bold ring-2 ring-pink-200 dark:ring-pink-900/40';
                          else if (detail.status === 'Không đi làm' && !isWeekend) colorClass = 'bg-rose-500 text-white';
                          else if (detail.status === 'Không đi làm' && isWeekend) colorClass = 'bg-rose-500 text-white'; // If they log off on Sunday explicitly
                          else if (detail.status === 'Chưa vào làm') colorClass = 'bg-slate-50/50 dark:bg-slate-900/10 text-slate-300 dark:text-slate-700 border border-dashed border-slate-200 dark:border-slate-850/80';

                          const otStr = detail.otFrom && detail.otTo ? `OT: ${detail.otFrom}-${detail.otTo}` : '';
                          const holidaySuffix = detail.holidayName ? ` (${detail.holidayName})` : '';

                          return (
                            <div
                              key={day}
                              title={`${day}/${selectedMonth} - ${detail.status}${holidaySuffix}\n${otStr}\n${detail.note}`}
                              className={`aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer p-1 transition-all hover:scale-110 shadow-sm ${colorClass}`}
                            >
                              <span className="text-[10px] font-bold">{day}</span>
                              {detail.otFrom && detail.otTo && (
                                <span className="text-[7px] font-mono font-bold leading-none bg-indigo-900/30 dark:bg-black/30 px-1 py-0.5 rounded mt-0.5">
                                  OT
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Timeline History logs table */}
                      <div className="border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40 mt-4 animate-fadeIn">
                        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                          <span>Lịch Sử Chi Tiết Công Tác Tháng</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Tổng số: {report.logs.length} bản ghi</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto font-sans">
                          {report.logs.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                              Không có dữ liệu trong tháng này
                            </div>
                          ) : (
                            report.logs.map((log, index) => (
                              <div key={index} className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-colors">
                                <div className="flex flex-wrap gap-2.5 items-center">
                                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">{log.date}</span>
                                  <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${
                                    log.status === 'Có đi làm' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/30' : log.status === 'Nghỉ phép' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100/30' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100/30'
                                  }`}>
                                    {log.status}
                                  </span>
                                </div>
                                <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-500 dark:text-slate-400 px-0 sm:px-4">
                                  <div className="flex flex-wrap gap-2 items-center">
                                    {log.otFrom && log.otTo && (
                                      <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 border border-purple-100/20 dark:border-purple-900/20">
                                        <Clock className="w-3 h-3" />
                                        Tăng ca: {log.otFrom} - {log.otTo} ({calculateOtHours(log.otFrom, log.otTo).toFixed(1)}h)
                                      </span>
                                    )}
                                    {log.note && (
                                      <span className="text-slate-500 dark:text-slate-400 italic max-w-xs truncate" title={log.note}>
                                        "{log.note}"
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Edit & Delete Actions for Admin */}
                                {role === 'admin' && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      onClick={() => setEditingLog({ ...log })}
                                      className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                                      title="Sửa ngày công"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(log)}
                                      disabled={isDeleting}
                                      className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                      title="Xóa ngày công"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Pop-up Edit Modal */}
      {editingLog && (
        <div className="fixed inset-0 bg-slate-950/50 dark:bg-slate-950/85 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scaleIn transition-colors duration-350">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <h4 className="font-sans font-bold text-base text-slate-800 dark:text-slate-100">
                  Chỉnh Sửa Ngày Công
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{editingLog.employeeName}</p>
              </div>
              <button
                onClick={() => setEditingLog(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ngày chấm công</label>
                <input
                  type="date"
                  required
                  value={editingLog.date}
                  onChange={(e) => setEditingLog({ ...editingLog, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Trạng thái đi làm</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Có đi làm', 'Không đi làm', 'Nghỉ phép'].map((st) => (
                    <label key={st} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="editStatus"
                        checked={editingLog.status === st}
                        onChange={() => setEditingLog({ ...editingLog, status: st as any })}
                        className="peer sr-only"
                      />
                      <div className={`py-3 text-center rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                        editingLog.status === st
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800/80 text-indigo-750 dark:text-indigo-400 font-bold'
                          : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20'
                      }`}>
                        {st}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* OT Hours Section */}
              <div className="bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Thời gian tăng ca (OT)</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Chọn nếu có làm thêm giờ</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!(editingLog.otFrom || editingLog.otTo)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingLog({ ...editingLog, otFrom: '18:00', otTo: '21:00' });
                        } else {
                          setEditingLog({ ...editingLog, otFrom: '', otTo: '' });
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                  </label>
                </div>

                {(editingLog.otFrom || editingLog.otTo) && (
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 animate-fadeIn font-mono">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 font-sans">OT Từ</label>
                      <input
                        type="time"
                        value={editingLog.otFrom}
                        onChange={(e) => setEditingLog({ ...editingLog, otFrom: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none font-mono text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 font-sans">OT Đến</label>
                      <input
                        type="time"
                        value={editingLog.otTo}
                        onChange={(e) => setEditingLog({ ...editingLog, otTo: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none font-mono text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ghi chú hoặc lí do</label>
                <input
                  type="text"
                  value={editingLog.note}
                  onChange={(e) => setEditingLog({ ...editingLog, note: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                  placeholder="Ví dụ: Nghỉ phép năm, đi làm trễ do xe hỏng..."
                />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-full text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? "Đang đồng bộ..." : "Cập nhật dữ liệu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional PDF Report Preview Modal */}
      {showPdfPreview && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs z-50 overflow-y-auto p-4 md:p-8 flex items-start justify-center animate-fadeIn">
          <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-[1340px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800/80 overflow-hidden my-4">
            
            {/* Header / Control Bar (no-print) */}
            <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-600 dark:text-rose-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-100">Bản Xem Trước PDF Báo Cáo Chấm Công</h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Tháng {selectedMonth}/{selectedYear} - Thiết kế cho kế toán lưu trữ</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5 w-full sm:w-auto self-stretch sm:self-auto no-print">
                <button
                  onClick={() => setShowPdfPreview(false)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Đóng</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In / Lưu PDF</span>
                </button>
              </div>
            </div>

            {/* Print configuration tips (no-print) */}
            <div className="bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-100/40 dark:border-amber-900/20 px-6 py-3 text-[11px] text-amber-800 dark:text-amber-400 font-medium flex items-start gap-2 no-print">
              <span>💡</span>
              <p>
                <b>Hướng dẫn xuất PDF chất lượng cao:</b> Trong hộp thoại In hiện ra, hãy chọn điểm đến là <b>"Lưu dưới dạng PDF" (Save as PDF)</b>. Tại mục "Cài đặt khác", đảm bảo đã bật tùy chọn <b>"Đồ họa nền" (Background graphics)</b> và tắt "Tiêu đề và chân trang" (Headers and footers) để có bản báo cáo chuyên nghiệp, sạch sẽ và đẹp mắt nhất.
              </p>
            </div>

            {/* Scrollable Printable container & side-editor */}
            <div className="flex flex-col lg:flex-row bg-slate-100 dark:bg-slate-900/40 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-850">
              {/* Left Column: Side-editor (no-print) */}
              <div className="w-full lg:w-76 shrink-0 p-5.5 bg-white dark:bg-slate-950 no-print space-y-4">
                <div className="border-b border-slate-150 dark:border-slate-800 pb-3">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-rose-500" />
                    <span>Chỉnh sửa thông tin PDF</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Thay đổi nhanh tiêu đề, địa chỉ và thông tin liên lạc trên bản in</p>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Tên Đơn Vị / Công Ty</label>
                    <input
                      type="text"
                      value={pdfCompanyName}
                      onChange={(e) => handleUpdatePdfConfig('pdf_company_name', e.target.value, setPdfCompanyName)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Địa Chỉ Doanh Nghiệp</label>
                    <textarea
                      rows={3}
                      value={pdfAddress}
                      onChange={(e) => handleUpdatePdfConfig('pdf_address', e.target.value, setPdfAddress)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Hotline & Email</label>
                    <input
                      type="text"
                      value={pdfHotlineEmail}
                      onChange={(e) => handleUpdatePdfConfig('pdf_hotline_email', e.target.value, setPdfHotlineEmail)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Tiêu Đề Bản Báo Cáo</label>
                    <input
                      type="text"
                      value={pdfReportTitle}
                      onChange={(e) => handleUpdatePdfConfig('pdf_report_title', e.target.value, setPdfReportTitle)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Mã Số Tài Liệu (Doc Code)</label>
                    <input
                      type="text"
                      value={pdfDocumentCode}
                      onChange={(e) => handleUpdatePdfConfig('pdf_document_code', e.target.value, setPdfDocumentCode)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Dòng ngày tháng năm ký</label>
                    <input
                      type="text"
                      value={pdfDateString}
                      onChange={(e) => handleUpdatePdfConfig('pdf_date_string', e.target.value, setPdfDateString)}
                      placeholder="Ví dụ: Hà Nội, ngày 11 tháng 07 năm 2026"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Paper Representation */}
              <div className="flex-1 p-4 md:p-8 overflow-x-auto flex justify-center bg-slate-100 dark:bg-slate-900/40">
                {/* Paper representation (styled bg-white for screen, and print-report-container class for media query print) */}
                <div className="print-report-container w-full max-w-[297mm] min-h-[210mm] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-8 sm:p-10 shadow-md rounded-lg font-sans border border-slate-200 dark:border-slate-800 transition-colors">
                  
                  {/* Letterhead */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 dark:border-slate-800 pb-4">
                    <div>
                      <h4 className="font-extrabold text-[13px] tracking-wider text-slate-900 dark:text-white uppercase">{pdfCompanyName}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">{pdfAddress}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">{pdfHotlineEmail}</p>
                    </div>
                    <div className="text-right">
                      <h5 className="font-bold text-[11px] uppercase tracking-wider text-slate-900 dark:text-slate-200">MẪU BÁO CÁO CHUẨN</h5>
                      <p className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">Mã tài liệu: {pdfDocumentCode}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">Liên kết: Phòng Visual</p>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center my-8 space-y-1.5">
                    <h2 className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 dark:text-white uppercase">
                      {pdfReportTitle}
                    </h2>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                      Tháng {selectedMonth} năm {selectedYear}
                    </p>
                    <p className="text-[10px] italic text-slate-400 dark:text-slate-500">
                      (Phục vụ đối chiếu chấm công, tính lương và lưu trữ hồ sơ kế toán hằng tháng)
                    </p>
                  </div>

                {/* Report Metadata */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/40 p-4.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 mb-6">
                  <div className="space-y-1.5">
                    <p><b className="text-slate-900 dark:text-slate-200">Bộ phận:</b> Phòng Visual (Visual Department)</p>
                    <p><b className="text-slate-900 dark:text-slate-200">Kỳ báo cáo:</b> Tháng {selectedMonth}/{selectedYear}</p>
                    <p><b className="text-slate-900 dark:text-slate-200">Số lượng nhân sự:</b> {stats.activeWorkforce} nhân viên</p>
                  </div>
                  <div className="space-y-1.5">
                    <p><b className="text-slate-900 dark:text-slate-200">Ngày kết xuất:</b> {new Date().toLocaleDateString('vi-VN')} (Giờ Việt Nam)</p>
                    <p><b className="text-slate-900 dark:text-slate-200">Trạng thái:</b> Đã đồng bộ từ Google Sheets</p>
                    <p><b className="text-slate-900 dark:text-slate-200">Đơn vị tính:</b> Ngày công / Giờ (OT)</p>
                  </div>
                </div>

                {/* KPIs summary */}
                <div className="grid grid-cols-4 gap-3 text-center mb-8">
                  <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/20">
                    <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tổng công đi làm</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white mt-1 block">{stats.totalPresent} <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">công</span></span>
                  </div>
                  <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/20">
                    <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tổng ngày nghỉ phép</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white mt-1 block">{stats.totalLeave} <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">ngày</span></span>
                  </div>
                  <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/20">
                    <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tổng giờ tăng ca OT</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white mt-1 block">{stats.totalOtHours.toFixed(1)} <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">giờ</span></span>
                  </div>
                  <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/20">
                    <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tổng ngày vắng mặt</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white mt-1 block">{stats.totalAbsent} <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">ngày</span></span>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="mb-8 overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-800/80 relative">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">
                        <th className="p-2.5 text-center w-10 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">STT</th>
                        <th className="p-2.5 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">Họ và Tên</th>
                        <th className="p-2.5 text-center w-16 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">Đi làm (công)</th>
                        <th className="p-2.5 text-center w-16 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">Vắng mặt</th>
                        <th className="p-2.5 text-center w-14 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">Nghỉ phép</th>
                        <th className="p-2.5 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">Chi tiết ngày nghỉ</th>
                        <th className="p-2.5 text-center w-16 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">Tăng ca OT</th>
                        <th className="p-2.5 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">Chi tiết tăng ca (OT)</th>
                        <th className="p-2.5 text-center w-14 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">Nghỉ lễ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {monthlyReports.map((report, idx) => {
                        const restDetailsStr = getDetailedRestDaysString(report);
                        const otDetailsStr = getOtDaysString(report, totalDaysInMonth, selectedYear, selectedMonth);

                        return (
                          <tr 
                            key={report.employeeName} 
                            className="group hover:bg-slate-100 dark:hover:bg-white transition-all duration-150 border-b border-slate-100 dark:border-slate-800/40 last:border-0 cursor-pointer"
                          >
                            <td className="p-2.5 text-center font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-black font-mono transition-colors">{idx + 1}</td>
                            <td className="p-2.5 font-extrabold text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-black text-xs transition-colors">{report.employeeName}</td>
                            <td className="p-2.5 text-center font-black text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-black transition-colors">{report.presentDays}</td>
                            <td className="p-2.5 text-center text-rose-600 dark:text-rose-400 group-hover:text-rose-700 dark:group-hover:text-rose-800 font-semibold transition-colors">{report.absentDays}</td>
                            <td className="p-2.5 text-center font-bold text-amber-700 dark:text-amber-500 group-hover:text-amber-800 dark:group-hover:text-amber-700 transition-colors">{report.leaveDays}</td>
                            <td className="p-2.5 text-left text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-black font-medium text-[10px] whitespace-normal break-words max-w-[220px] transition-colors">{restDetailsStr}</td>
                            <td className="p-2.5 text-center text-violet-600 dark:text-violet-400 group-hover:text-violet-800 dark:group-hover:text-violet-950 font-bold transition-colors">{report.totalOtHours.toFixed(1)}h</td>
                            <td className="p-2.5 text-left text-purple-850 dark:text-purple-300 group-hover:text-purple-950 dark:group-hover:text-purple-950 font-semibold text-[10px] whitespace-normal break-words max-w-[280px] transition-colors">{otDetailsStr}</td>
                            <td className="p-2.5 text-center text-pink-700 dark:text-pink-400 group-hover:text-pink-900 dark:group-hover:text-pink-800 font-semibold transition-colors">{report.holidayDays}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Law / Explanatory section */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl mb-12 text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed space-y-1">
                  <p><b>Ghi chú quy chế tính toán:</b></p>
                  <p>- Tăng ca (OT) được tổng hợp tự động từ giờ check-in/check-out tăng ca đăng ký trên hệ thống của nhân viên.</p>
                  <p>- Dữ liệu được bảo mật và tự động ghi dấu hoạt động (Audit Logs) trên hệ thống khi xuất bản.</p>
                </div>

                {/* Signature Block */}
                <div className="mt-8 border-t border-slate-100 dark:border-slate-800/60 pt-6">
                  <div className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 pr-4">
                    <span>{pdfDateString}</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
          </div>
        </div>
      )}
    </div>
  );
}
