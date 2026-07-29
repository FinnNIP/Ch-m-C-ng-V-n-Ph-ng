import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Employee, TimeLog } from '../types';
import { addTimeLog, updateTimeLog, deleteTimeLog, saveDayAttendance } from '../sheets';
import { getVietnamHolidayName } from '../holidays';
import { ConfettiEffect } from './ConfettiEffect';
import { motion, AnimatePresence } from 'motion/react';
import { formatGuestName, getEmployeeDisplayName } from '../utils/nameUtils';
import { RandomLoader } from './RandomLoader';
import { 
  Clock, 
  CheckCircle2, 
  User, 
  Search, 
  AlertCircle, 
  CheckSquare, 
  FileSpreadsheet, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  Sparkles,
  CheckCircle,
  Info,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Users,
  Filter,
  Plus,
  X,
  Sliders
} from 'lucide-react';

interface AttendanceTabProps {
  accessToken: string;
  employees: Employee[];
  timeLogs: TimeLog[];
  onLogAdded: () => void;
  isLoading?: boolean;
}

export default function AttendanceTab({ accessToken, employees, timeLogs = [], onLogAdded, isLoading = false }: AttendanceTabProps) {
  const isAdmin = Boolean(accessToken && accessToken !== 'local');
  const [selectedEmpName, setSelectedEmpName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Form states
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [status, setStatus] = useState<'Có đi làm' | 'Không đi làm' | 'Nghỉ phép'>('Có đi làm');
  
  // OT states
  const [hasOt, setHasOt] = useState<boolean>(false);
  const [otFrom, setOtFrom] = useState<string>('18:00');
  const [otTo, setOtTo] = useState<string>('21:00');
  
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recentUpdates, setRecentUpdates] = useState<Set<string>>(new Set());
  const prevTimeLogsRef = useRef(timeLogs);

  useEffect(() => {
    if (timeLogs !== prevTimeLogsRef.current) {
      const newUpdates = new Set<string>();
      timeLogs.forEach(log => {
        const isNew = !prevTimeLogsRef.current.some(prev => 
          prev.employeeName === log.employeeName && 
          prev.date === log.date && 
          prev.status === log.status &&
          prev.otFrom === log.otFrom &&
          prev.otTo === log.otTo
        );
        if (isNew) {
          newUpdates.add(`${log.employeeName}-${log.date}`);
        }
      });
      prevTimeLogsRef.current = timeLogs;
      if (newUpdates.size > 0) {
        setRecentUpdates(newUpdates);
        const t = setTimeout(() => setRecentUpdates(new Set()), 3500);
        return () => clearTimeout(t);
      }
    }
  }, [timeLogs]);

  const selectedEmployee = employees.find(e => e.name === selectedEmpName);

  // Calendar states
  const [viewMode, setViewMode] = useState<'calendar' | 'form'>('calendar');
  const [viewMonth, setViewMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState<number>(() => new Date().getFullYear());
  const [calendarFilter, setCalendarFilter] = useState<string>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Batch/Company Mode states
  const [batchMode, setBatchMode] = useState<'individual' | 'company'>('individual');
  const [companyStatuses, setCompanyStatuses] = useState<{ [empName: string]: 'Có đi làm' | 'Không đi làm' | 'Nghỉ phép' }>({});
  const [companyNotes, setCompanyNotes] = useState<{ [empName: string]: string }>({});
  const [companyHasOt, setCompanyHasOt] = useState<{ [empName: string]: boolean }>({});
  const [companyOtFrom, setCompanyOtFrom] = useState<{ [empName: string]: string }>({});
  const [companyOtTo, setCompanyOtTo] = useState<{ [empName: string]: string }>({});
  const [isBatchSubmitting, setIsBatchSubmitting] = useState<boolean>(false);

  // Modal State for Batch Editing Row Detail
  const [editingEmployeeForBatch, setEditingEmployeeForBatch] = useState<string | null>(null);
  const [modalStatus, setModalStatus] = useState<'Có đi làm' | 'Không đi làm' | 'Nghỉ phép'>('Có đi làm');
  const [modalHasOt, setModalHasOt] = useState<boolean>(false);
  const [modalOtFrom, setModalOtFrom] = useState<string>('18:00');
  const [modalOtTo, setModalOtTo] = useState<string>('21:00');
  const [modalNote, setModalNote] = useState<string>('');

  // Custom Time Picker Modal State
  const [customTimePicker, setCustomTimePicker] = useState<{
    isOpen: boolean;
    empName: string;
    isDetailedModal: boolean;
    fromVal: string;
    toVal: string;
  } | null>(null);

  const [activeTimeField, setActiveTimeField] = useState<'from' | 'to'>('from');
  const [clockMode, setClockMode] = useState<'hours' | 'minutes'>('hours');

  const parseTimeStr = (timeStr: string) => {
    const parts = (timeStr || '18:00').split(':');
    return {
      hour: parts[0] || '18',
      minute: parts[1] || '00',
    };
  };

  const joinTimeStr = (hour: string, minute: string) => {
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  };

  const handleSaveModalConfig = () => {
    if (!editingEmployeeForBatch) return;
    setCompanyStatuses(prev => ({ ...prev, [editingEmployeeForBatch]: modalStatus }));
    setCompanyHasOt(prev => ({ ...prev, [editingEmployeeForBatch]: modalHasOt }));
    setCompanyOtFrom(prev => ({ ...prev, [editingEmployeeForBatch]: modalOtFrom }));
    setCompanyOtTo(prev => ({ ...prev, [editingEmployeeForBatch]: modalOtTo }));
    setCompanyNotes(prev => ({ ...prev, [editingEmployeeForBatch]: modalNote }));
    setEditingEmployeeForBatch(null);
  };

  // Pre-populate logging form based on existing log or defaults
  useEffect(() => {
    if (!date || !selectedEmpName) return;
    const existingLog = timeLogs.find(
      l => l.employeeName.trim().toLowerCase() === selectedEmpName.trim().toLowerCase() && l.date === date
    );

    if (existingLog) {
      setStatus(existingLog.status);
      if (existingLog.otFrom && existingLog.otTo) {
        setHasOt(true);
        setOtFrom(existingLog.otFrom);
        setOtTo(existingLog.otTo);
      } else {
        setHasOt(false);
      }
      setNote(existingLog.note || '');
    } else {
      // Default behavior
      const isSunday = new Date(date).getDay() === 0;
      setStatus('Có đi làm');
      if (isSunday) {
        setHasOt(true);
        setOtFrom('08:00');
        setOtTo('17:00');
      } else {
        setHasOt(false);
      }
      setNote('');
    }
  }, [date, selectedEmpName, timeLogs]);

  // Handle Sunday OT toggle when status changes manually
  useEffect(() => {
    if (!date) return;
    const isSunday = new Date(date).getDay() === 0;
    
    // If we're on Sunday and we don't have an existing log in database,
    // let's auto-enable OT if they select "Có đi làm"
    const existingLog = timeLogs.find(
      l => selectedEmpName && l.employeeName.trim().toLowerCase() === selectedEmpName.trim().toLowerCase() && l.date === date
    );
    
    if (!existingLog) {
      if (isSunday) {
        if (status === 'Có đi làm') {
          setHasOt(true);
          setOtFrom('08:00');
          setOtTo('17:00');
        } else {
          setHasOt(false);
        }
      } else {
        if (status !== 'Có đi làm') {
          setHasOt(false);
        }
      }
    }
  }, [date, status]);

  // Filtered employees list
  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pre-populate batch company states when date or timeLogs change
  useEffect(() => {
    const initialStatuses: typeof companyStatuses = {};
    const initialNotes: typeof companyNotes = {};
    const initialHasOt: typeof companyHasOt = {};
    const initialOtFrom: typeof companyOtFrom = {};
    const initialOtTo: typeof companyOtTo = {};

    employees.forEach(emp => {
      const log = timeLogs.find(
        l => l.employeeName.trim().toLowerCase() === emp.name.trim().toLowerCase() && l.date === date
      );
      if (log) {
        initialStatuses[emp.name] = log.status;
        initialNotes[emp.name] = log.note || '';
        initialHasOt[emp.name] = !!(log.otFrom && log.otTo);
        initialOtFrom[emp.name] = log.otFrom || '18:00';
        initialOtTo[emp.name] = log.otTo || '21:00';
      } else {
        initialStatuses[emp.name] = 'Có đi làm';
        initialNotes[emp.name] = '';
        initialHasOt[emp.name] = false;
        initialOtFrom[emp.name] = '18:00';
        initialOtTo[emp.name] = '21:00';
      }
    });

    setCompanyStatuses(initialStatuses);
    setCompanyNotes(initialNotes);
    setCompanyHasOt(initialHasOt);
    setCompanyOtFrom(initialOtFrom);
    setCompanyOtTo(initialOtTo);
  }, [date, employees, timeLogs]);

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBatchSubmitting(true);
    setFeedback(null);

    try {
      const updates = employees.map(emp => {
        const statusVal = companyStatuses[emp.name] || 'Có đi làm';
        const hasOtVal = companyHasOt[emp.name];
        const otFromVal = hasOtVal ? (companyOtFrom[emp.name] || '18:00') : '';
        const otToVal = hasOtVal ? (companyOtTo[emp.name] || '21:00') : '';
        const noteVal = companyNotes[emp.name] || '';

        return {
          employeeName: emp.name,
          status: statusVal,
          otFrom: otFromVal,
          otTo: otToVal,
          note: noteVal
        };
      });

      await saveDayAttendance(accessToken, date, updates, timeLogs);

      setFeedback({
        type: 'success',
        message: `Đã cập nhật công thành công cho toàn bộ công ty ngày ${date}!`
      });

      setShowConfetti(true);
      onLogAdded();
      setTimeout(() => {
        setIsDrawerOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: `Lỗi lưu chấm công cả ngày: ${err.message}`
      });
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  // Leave balance tracking states
  const [leaveSearch, setLeaveSearch] = useState<string>('');
  const [leaveCalcMode, setLeaveCalcMode] = useState<'accountant' | 'standard'>('accountant');
  const [expandedLeaveEmp, setExpandedLeaveEmp] = useState<string | null>(null);

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);

  // Helper to parse registered date format (e.g. "08/07/2026" or "2026-07-08")
  const parseRegisteredDate = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      if (dateStr.includes('/')) {
        const parts = dateStr.trim().split('/');
        return {
          day: parseInt(parts[0], 10),
          month: parseInt(parts[1], 10),
          year: parseInt(parts[2], 10)
        };
      } else if (dateStr.includes('-')) {
        const parts = dateStr.trim().split('-');
        return {
          year: parseInt(parts[0], 10),
          month: parseInt(parts[1], 10),
          day: parseInt(parts[2], 10)
        };
      }
    } catch {
      return null;
    }
    return null;
  };

  // Leave calculation according to Law (Standard Mode)
  const leaveReports = useMemo(() => {
    return employees.map(emp => {
      let monthsWorkedInSelectedYear = 12;
      const rDate = parseRegisteredDate(emp.registeredAt);

      if (rDate) {
        if (rDate.year > currentYear) {
          monthsWorkedInSelectedYear = 0;
        } else if (rDate.year === currentYear) {
          monthsWorkedInSelectedYear = Math.max(0, 12 - rDate.month + 1);
        }
      }

      const rLeft = emp.leftAt ? parseRegisteredDate(emp.leftAt) : null;
      if (rLeft) {
        if (rLeft.year < currentYear) {
          monthsWorkedInSelectedYear = 0;
        } else if (rLeft.year === currentYear) {
          const startMonth = rDate && rDate.year === currentYear ? rDate.month : 1;
          const endMonth = rLeft.month;
          monthsWorkedInSelectedYear = Math.max(0, endMonth - startMonth + 1);
        }
      }

      const initialCarryover = (() => {
        if (currentYear !== 2026) return 0;
        if (emp.leaveCarryover !== undefined) return emp.leaveCarryover;
        const nameLower = emp.name.toLowerCase();
        if (nameLower.includes('vũ') || nameLower.includes('vu')) return 12;
        if (nameLower.includes('dũng') || nameLower.includes('dung')) return 10;
        if (nameLower.includes('hảo') || nameLower.includes('hao')) return 6;
        return 0;
      })();

      const ytdLeaveLogs = timeLogs.filter(log => {
        const [y] = log.date.split('-');
        const logYear = parseInt(y, 10);
        return log.employeeName === emp.name && log.status === 'Nghỉ phép' && logYear === currentYear;
      }).sort((a, b) => b.date.localeCompare(a.date));

      // Divide logs by Tet 2026 boundary (Feb 17, 2026)
      const beforeTetLogs = ytdLeaveLogs.filter(log => {
        if (currentYear !== 2026) return false;
        return log.date < '2026-02-17';
      });
      const onOrAfterTetLogs = ytdLeaveLogs.filter(log => {
        if (currentYear !== 2026) return true;
        return log.date >= '2026-02-17';
      });

      const leaveUsedBeforeTet = beforeTetLogs.length;
      const leaveUsedAfterTet = onOrAfterTetLogs.length;

      // 2025 carryover is consumed by leave before Tet
      const carryoverUsed = Math.min(initialCarryover, leaveUsedBeforeTet);
      const carryoverExpired = initialCarryover - carryoverUsed; // Forfeited after Tet
      const excessBeforeTet = Math.max(0, leaveUsedBeforeTet - initialCarryover);

      // Base entitlement for currentYear
      const baseEntitlement = emp.leaveAllowance !== undefined 
        ? emp.leaveAllowance 
        : monthsWorkedInSelectedYear;

      // Excess before Tet and all after Tet are deducted from base entitlement
      const leaveRemaining = baseEntitlement - (excessBeforeTet + leaveUsedAfterTet);
      const leaveEntitlement = baseEntitlement + carryoverUsed;
      const leaveUsed = ytdLeaveLogs.length;

      return {
        employee: emp,
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
  }, [employees, timeLogs, currentYear]);

  // Leave calculation according to Accountant Thanh Chau (Accountant Mode)
  const accountantLeaveReports = useMemo(() => {
    const rules = [
      {
        key: 'vu',
        searchNames: ['vũ', 'vu'],
        displayName: 'Anh Vũ',
        category: 'Còn từ năm 2025',
        ruleDesc: 'Còn tồn 12 ngày phép từ năm 2025 chuyển tiếp qua năm 2026. Kế toán lưu ý không tự động gộp phép gối đầu gộp chung.',
        totalEntitled: 12,
        usedByChat: 0,
        remainingByChat: 12,
        chatQuote: 'a Vũ còn 12 ngày phép. Sang năm không gộp phép nữa.'
      },
      {
        key: 'dung',
        searchNames: ['dũng', 'dung'],
        displayName: 'Anh Dũng',
        category: 'Còn từ năm 2025',
        ruleDesc: 'Còn dư 10 ngày phép từ năm 2025 chuyển qua 2026.',
        totalEntitled: 10,
        usedByChat: 0,
        remainingByChat: 10,
        chatQuote: 'a Dũng còn 10 ngày phép.'
      },
      {
        key: 'hao',
        searchNames: ['hảo', 'hao'],
        displayName: 'Anh Hảo',
        category: 'Còn từ năm 2025',
        ruleDesc: 'Còn dư 6 ngày phép từ năm 2025 chuyển qua 2026.',
        totalEntitled: 6,
        usedByChat: 0,
        remainingByChat: 6,
        chatQuote: 'a Hảo còn 6 ngày phép.'
      },
      {
        key: 'thuan',
        searchNames: ['thuận', 'thuan'],
        displayName: 'Anh Thuận (Thuận Tom)',
        category: 'Tích lũy năm 2026 (YTD)',
        ruleDesc: 'Phép năm 2025 dư 2 ngày đã nghỉ hết trong tháng 6/2025 (còn 0). Phép năm 2026 tính đến tháng 7 tích lũy 7 ngày, đã nghỉ 1 ngày trong tháng nên còn 6 ngày phép. Tổng cộng lịch sử đã nghỉ 13 ngày (tính từ năm 2025 đến tháng 7/2026).',
        totalEntitled: 7,
        usedByChat: 1,
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
        usedByChat: 2,
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
        usedByChat: 5,
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
      const matchedEmp = employees.find(emp => {
        const empNameLower = emp.name.toLowerCase();
        return rule.searchNames.some(name => empNameLower.includes(name));
      });

      const systemLeaveLogs = matchedEmp ? timeLogs.filter(log => {
        const [y] = log.date.split('-');
        const logYear = parseInt(y, 10);
        return log.employeeName === matchedEmp.name && log.status === 'Nghỉ phép' && logYear === currentYear;
      }).sort((a, b) => b.date.localeCompare(a.date)) : [];

      const systemLeaveUsed = systemLeaveLogs.length;

      return {
        ...rule,
        matchedEmployee: matchedEmp,
        systemLeaveUsed,
        systemLeaveLogs,
        isMatched: !!matchedEmp
      };
    });
  }, [employees, timeLogs, currentYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) {
      alert("Vui lòng chọn nhân viên.");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const existingLog = timeLogs.find(
        l => l.employeeName.trim().toLowerCase() === selectedEmployee.name.trim().toLowerCase() && l.date === date
      );

      const logData: TimeLog = {
        employeeName: selectedEmployee.name,
        date: date,
        status: status,
        otFrom: hasOt ? otFrom : '',
        otTo: hasOt ? otTo : '',
        note: note.trim()
      };

      if (existingLog && existingLog.rowIndex) {
        logData.rowIndex = existingLog.rowIndex;
        await updateTimeLog(accessToken, logData);
        setFeedback({
          type: 'success',
          message: `Đã cập nhật nhật ký thành công cho ${selectedEmployee.name} ngày ${date}!`
        });
      } else {
        await addTimeLog(accessToken, logData);
        setFeedback({
          type: 'success',
          message: `Ghi nhận thành công cho nhân viên ${selectedEmployee.name} ngày ${date}!`
        });
      }

      setShowConfetti(true);
      onLogAdded();
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: `Lỗi đồng bộ dữ liệu với Google Sheet: ${err.message}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async () => {
    if (!selectedEmployee || !date) return;
    const existingLog = timeLogs.find(
      l => l.employeeName.trim().toLowerCase() === selectedEmployee.name.trim().toLowerCase() && l.date === date
    );
    if (!existingLog || !existingLog.rowIndex) {
      alert("Không có ghi nhận đặc biệt nào để xóa cho ngày này.");
      return;
    }

    if (!confirm(`Xóa ghi nhận công của nhân viên ${selectedEmployee.name} ngày ${date}? Trạng thái của ngày này sẽ quay về mặc định theo lịch.`)) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await deleteTimeLog(accessToken, existingLog.rowIndex);
      
      setFeedback({
        type: 'success',
        message: `Đã xóa thành công và khôi phục trạng thái mặc định cho ${selectedEmployee.name} ngày ${date}!`
      });

      setNote('');
      setHasOt(false);
      setShowConfetti(true);
      onLogAdded();
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: `Lỗi khi xóa nhật ký chấm công: ${err.message}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- CALENDAR LOGIC START ---
  const handlePrevMonth = () => {
    setViewMonth(prev => {
      if (prev === 1) {
        setViewYear(y => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setViewMonth(prev => {
      if (prev === 12) {
        setViewYear(y => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  // Helper to determine the status of an employee on a given date
  const getEmployeeStatusOnDate = (empName: string, dateStr: string, dayOfWeek: number) => {
    const log = timeLogs.find(
      l => l.employeeName.trim().toLowerCase() === empName.trim().toLowerCase() && l.date === dateStr
    );
    const holidayName = getVietnamHolidayName(dateStr);

    if (log) {
      return {
        status: log.status,
        hasOt: !!(log.otFrom && log.otTo),
        otFrom: log.otFrom,
        otTo: log.otTo,
        note: log.note,
        isCustom: true
      };
    }

    if (holidayName) {
      return {
        status: 'Ngày lễ' as const,
        holidayName,
        isCustom: false
      };
    }

    if (dayOfWeek === 0) { // Sunday
      return {
        status: 'Nghỉ cuối tuần' as const,
        isCustom: false
      };
    }

    return {
      status: 'Có đi làm' as const,
      isCustom: false
    };
  };

  // Compute calendar days for Mon-Sun week layout
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0 is Sunday, 1 is Monday...
    const firstDayIndex = firstDay === 0 ? 6 : firstDay - 1; // Translate so Mon is index 0, Sun is index 6
    const totalDays = new Date(viewYear, viewMonth, 0).getDate();
    
    const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
    const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
    const totalDaysPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
    
    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      dateStr: string;
      isToday: boolean;
      dayOfWeek: number;
    }> = [];
    
    // 1. Prev month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = totalDaysPrevMonth - i;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        day: dayNum,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
        dateStr,
        isToday: false,
        dayOfWeek: new Date(prevYear, prevMonth - 1, dayNum).getDay()
      });
    }
    
    // 2. Current month days
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        dateStr,
        isToday: dateStr === todayStr,
        dayOfWeek: new Date(viewYear, viewMonth - 1, d).getDay()
      });
    }
    
    // 3. Next month padding days to fill grid
    const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1;
    const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear;
    const totalCells = days.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= remainingCells; d++) {
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
        dateStr,
        isToday: false,
        dayOfWeek: new Date(nextYear, nextMonth - 1, d).getDay()
      });
    }
    
    return days;
  }, [viewMonth, viewYear]);
  // --- CALENDAR LOGIC END ---

  return (
    <div className="space-y-8 relative">
      <ConfettiEffect isActive={showConfetti} onComplete={() => setShowConfetti(false)} />
      {/* Visual Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-[24px] border border-slate-150/40 dark:border-slate-800/80 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <Calendar className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-base text-slate-850 dark:text-slate-100">Lịch Trình Chấm Công Nhanh</h2>
            <p className="text-xs text-slate-450 dark:text-slate-500">Theo dõi toàn diện ngày công và cài đặt ngoại lệ nghỉ lễ, phép năm dễ dàng.</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'calendar' ? (
          <motion.div
            key="calendar-view"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.4 }}
            className="relative w-full"
          >
          {/* Spacious Monthly Calendar Grid (Full Width) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-150/80 dark:border-slate-800/80 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] transition-colors duration-300 flex flex-col w-full relative">
            
            {/* Calendar Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5 mb-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-150 dark:border-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
                <span className="font-sans font-extrabold text-base text-slate-850 dark:text-slate-100 min-w-36 text-center select-none">
                  Tháng {String(viewMonth).padStart(2, '0')} / {viewYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-150 dark:border-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Calendar filter */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-500" />
                  Xem theo:
                </span>
                <div className="relative">
                  <select
                    value={calendarFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCalendarFilter(val);
                      if (val !== 'all') {
                        setSelectedEmpName(val);
                      }
                    }}
                    className="appearance-none pl-3.5 pr-8 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 cursor-pointer transition-all"
                  >
                    <option value="all">👥 Tất cả nhân sự</option>
                    {employees.map(e => (
                      <option key={e.name} value={e.name}>👤 {e.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-450 dark:text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Calendar Grid Header (Mon to Sun) */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 text-center text-[10px] sm:text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-2 select-none">
              <div>Thứ 2</div>
              <div>Thứ 3</div>
              <div>Thứ 4</div>
              <div>Thứ 5</div>
              <div>Thứ 6</div>
              <div>Thứ 7</div>
              <div className="text-rose-500">Chủ Nhật</div>
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 flex-1 min-h-[400px] sm:min-h-[520px]">
              {calendarDays.map((cell, idx) => {
                const isSelected = cell.dateStr === date;
                const isSun = cell.dayOfWeek === 0;
                const holidayName = getVietnamHolidayName(cell.dateStr);

                // Styling classes for cell background
                let bgClass = 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850';
                let textClass = 'text-slate-800 dark:text-slate-150';

                if (!cell.isCurrentMonth) {
                  bgClass = 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-100/40 dark:border-slate-900/10';
                  textClass = 'text-slate-350 dark:text-slate-650';
                } else if (holidayName) {
                  bgClass = 'bg-pink-500/5 dark:bg-pink-500/10 border-pink-200/50 dark:border-pink-950/40';
                  textClass = 'text-pink-600 dark:text-pink-400 font-bold';
                } else if (isSun) {
                  bgClass = 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-150/40 dark:border-slate-850/60';
                  textClass = 'text-slate-500 dark:text-slate-400';
                }

                if (cell.isToday) {
                  bgClass += ' ring-2 ring-indigo-500 dark:ring-indigo-400 ring-offset-2 dark:ring-offset-slate-900';
                }

                if (isSelected) {
                  bgClass += ' border-indigo-500 dark:border-indigo-400 shadow-md bg-indigo-50/15 dark:bg-indigo-950/15';
                }

                // Gather details to display
                return (
                  <motion.div
                    key={idx}
                    animate={selectedEmployee && recentUpdates.has(`${selectedEmployee.name}-${cell.dateStr}`) ? {
                      scale: [1, 1.05, 1],
                      boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 15px rgba(16, 185, 129, 0.6)", "0px 0px 0px rgba(0,0,0,0)"],
                    } : {}}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    onClick={() => {
                      setDate(cell.dateStr);
                      setFeedback(null);
                      setIsDrawerOpen(true);
                    }}
                    className={`min-h-[85px] sm:min-h-[110px] p-1 sm:p-2.5 border rounded-2xl flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#6366f1] dark:hover:shadow-[4px_4px_0px_0px_#4f46e5] hover:border-indigo-500/50 dark:hover:border-indigo-400/50 cursor-pointer relative active:translate-y-0 active:shadow-none ${bgClass}`}
                  >
                    {/* Header of cell: Day number & Holiday info */}
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold font-mono ${textClass} ${cell.isToday ? 'bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center font-sans shadow-sm' : ''}`}>
                        {cell.day}
                      </span>
                      {holidayName && cell.isCurrentMonth && (
                        <span className="text-[10px] bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 px-1 py-0.2 rounded font-sans font-bold" title={holidayName}>
                          🇻🇳 Lễ
                        </span>
                      )}
                    </div>

                    {/* Body of cell: Status markers */}
                    <div className="mt-1 flex-1 flex flex-col justify-end gap-1 overflow-hidden select-none">
                      {calendarFilter === 'all' ? (
                        /* "All Employees" View: Show exceptions */
                        (() => {
                          const exceptions: Array<{ name: string; status: string; hasOt: boolean }> = [];
                          employees.forEach(emp => {
                            const detail = getEmployeeStatusOnDate(emp.name, cell.dateStr, cell.dayOfWeek);
                            if (cell.isCurrentMonth) {
                              if (holidayName) {
                                if (detail.status === 'Có đi làm') {
                                  exceptions.push({ name: emp.name, status: 'Làm Lễ', hasOt: detail.hasOt });
                                }
                              } else if (isSun) {
                                if (detail.status === 'Có đi làm') {
                                  exceptions.push({ name: emp.name, status: 'Làm CN', hasOt: true });
                                }
                              } else {
                                if (detail.status === 'Không đi làm') {
                                  exceptions.push({ name: emp.name, status: 'Vắng', hasOt: false });
                                } else if (detail.status === 'Nghỉ phép') {
                                  exceptions.push({ name: emp.name, status: 'Phép', hasOt: false });
                                } else if (detail.hasOt) {
                                  exceptions.push({ name: emp.name, status: 'OT', hasOt: true });
                                }
                              }
                            }
                          });

                          if (exceptions.length > 0) {
                            return (
                              <div className="flex flex-col gap-0.5 max-h-[80px] overflow-y-auto scrollbar-thin">
                                {exceptions.map((ex, exIdx) => {
                                  let color = 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-450';
                                  if (ex.status === 'Phép') color = 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400';
                                  if (ex.status === 'OT' || ex.status === 'Làm CN' || ex.status === 'Làm Lễ') color = 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100/30';

                                  return (
                                    <div key={exIdx} className={`text-[9px] leading-tight font-sans font-bold px-1.5 py-0.5 rounded truncate ${color}`}>
                                      {ex.name.split(' ').pop()}: {ex.status}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          } else if (cell.isCurrentMonth) {
                            if (holidayName) {
                              return <div className="text-[9px] text-pink-500/70 font-semibold text-center italic py-0.5">Nghỉ lễ toàn cty</div>;
                            }
                            if (isSun) {
                              return <div className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold text-center py-0.5">Nghỉ cuối tuần</div>;
                            }
                            return (
                              <div className="text-[9px] text-emerald-500 dark:text-emerald-450/70 font-bold flex items-center justify-center gap-1 py-1 bg-emerald-500/5 dark:bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                                <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>Đi làm đủ</span>
                              </div>
                            );
                          }
                          return null;
                        })()
                      ) : (
                        /* "Single Employee" View: Show full status details for this specific employee */
                        (() => {
                          if (!cell.isCurrentMonth) return null;
                          const detail = getEmployeeStatusOnDate(calendarFilter, cell.dateStr, cell.dayOfWeek);
                          
                          let label = 'Đi làm';
                          let color = 'bg-emerald-500 text-white border-emerald-600/10';
                          
                          if (detail.status === 'Nghỉ phép') {
                            label = 'Nghỉ phép (P)';
                            color = 'bg-amber-500 text-white border-amber-600/10';
                          } else if (detail.status === 'Không đi làm') {
                            if (holidayName) {
                              label = 'Nghỉ lễ';
                              color = 'bg-pink-500 text-white border-pink-600/10';
                            } else if (isSun) {
                              label = 'Nghỉ CN';
                              color = 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-450 border-slate-200/50 dark:border-slate-750';
                            } else {
                              label = 'Vắng mặt';
                              color = 'bg-rose-500 text-white border-rose-600/10';
                            }
                          } else if (detail.status === 'Ngày lễ') {
                            label = 'Ngày lễ';
                            color = 'bg-pink-500 text-white border-pink-600/10';
                          } else if (detail.status === 'Nghỉ cuối tuần') {
                            label = 'Nghỉ CN';
                            color = 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-450 border-slate-200/50 dark:border-slate-750';
                          }

                          return (
                            <div className="space-y-1">
                              <div className={`text-[9px] font-extrabold text-center py-1 rounded-lg border shadow-sm ${color}`}>
                                {label}
                              </div>
                              {detail.hasOt && (
                                <div className="text-[8px] font-sans font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/40 text-center py-0.5 rounded truncate">
                                  ⚡ OT: {detail.otFrom}-{detail.otTo}
                                </div>
                              )}
                              {detail.note && (
                                <div className="text-[7.5px] font-mono italic text-slate-400 dark:text-slate-500 max-w-full truncate text-center" title={detail.note}>
                                  "{detail.note}"
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Legend for Single Employee View */}
            {calendarFilter !== 'all' && (
              <div className="flex flex-wrap gap-4 items-center justify-center border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4 text-[10px] font-bold text-slate-450 uppercase">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span> Có đi làm</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block"></span> Nghỉ phép</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block"></span> Vắng mặt</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-pink-500 rounded-full inline-block"></span> Ngày lễ</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full inline-block"></span> Nghỉ Chủ Nhật</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 rounded-full inline-block"></span> Tăng ca (OT)</span>
              </div>
            )}
          </div>

          {/* Centered Wide Modal Window for Daily Company Attendance (Fast Check-in) */}
          <AnimatePresence>
            {isDrawerOpen && (
              <div className="fixed inset-0 no-swipe z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 md:p-8">
                {/* Backdrop overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsDrawerOpen(false)}
                  className="fixed inset-0 no-swipe bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md cursor-pointer"
                />

                {/* Wide Centered Dialog Panel */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 20 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                  className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] border border-slate-150/80 dark:border-slate-800/80 flex flex-col z-10 transition-colors duration-300 overflow-hidden max-h-[90vh]"
                >
                  {/* Header */}
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-indigo-600 dark:text-indigo-400">
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-sans font-extrabold text-base text-slate-800 dark:text-slate-100">
                          Bảng Chấm Công Nhanh Cả Phòng
                        </h3>
                        <p className="text-[11px] text-slate-450 dark:text-slate-500 font-medium mt-0.5">
                          Ngày chấm công: {new Date(date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body - Scrollable content */}
                  <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    {/* Notice Block & Filter Row */}
                    <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                      <div className="flex-1 p-4 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-xs text-emerald-800 dark:text-emerald-350 leading-relaxed">
                        <span className="font-extrabold block text-emerald-700 dark:text-emerald-400 mb-0.5">👥 Chốt Nhanh Chấm Công Cả Ngày:</span>
                        Mặc định mọi người là <b className="text-emerald-600 dark:text-emerald-400">Có đi làm</b>. Bạn chỉ cần sửa trạng thái hoặc tăng ca cho những người cần thiết bên dưới, sau đó nhấn nút lưu ở góc dưới.
                      </div>

                      {/* Search & Day Helper Indicators */}
                      <div className="flex flex-col sm:flex-row gap-2 shrink-0 sm:items-center">
                        {/* Day indicator banner */}
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-850 rounded-2xl flex flex-col justify-center min-w-[160px]">
                          {(() => {
                            const holidayName = getVietnamHolidayName(date);
                            const isSunday = new Date(date).getDay() === 0;
                            return (
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Loại ngày</span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {holidayName ? `🇻🇳 Lễ: ${holidayName}` : isSunday ? "✨ Chủ Nhật (Nghỉ)" : "📅 Ngày trong tuần"}
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Search Input inside the wide modal */}
                        <div className="relative min-w-[200px]">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Tìm nhân viên..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 transition-all"
                          />
                          {searchTerm && (
                            <button
                              type="button"
                              onClick={() => setSearchTerm('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-450 hover:text-slate-700 dark:hover:text-slate-300 rounded-md transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleBatchSubmit} className="space-y-6">
                      {/* Employee List Container */}
                      <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredEmployees.length === 0 ? (
                          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs italic bg-slate-50/50 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-800/50 rounded-2xl">
                            Không tìm thấy nhân viên nào khớp với từ khóa tìm kiếm.
                          </div>
                        ) : (
                          filteredEmployees.map(emp => {
                            const empStatus = companyStatuses[emp.name] || 'Có đi làm';
                            const empHasOt = !!companyHasOt[emp.name];
                            const empNote = companyNotes[emp.name] || '';

                            return (
                              <motion.div
                                key={emp.name}
                                animate={recentUpdates.has(`${emp.name}-${date}`) ? {
                                  scale: [1, 1.02, 1],
                                  boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 15px rgba(16, 185, 129, 0.4)", "0px 0px 0px rgba(0,0,0,0)"],
                                  backgroundColor: ["transparent", "rgba(16, 185, 129, 0.1)", "transparent"]
                                } : {}}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                className="p-4 bg-slate-50/40 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-950/60 hover:border-slate-200/80 dark:hover:border-slate-800"
                              >
                                {/* Left & Center-Left: Grouped together to keep them close and compact */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6 min-w-0 flex-1">
                                  {/* Profile Details */}
                                  <div className="flex items-center gap-3 min-w-[180px] max-w-[240px] shrink-0">
                                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl font-extrabold text-[11px] flex items-center justify-center border border-indigo-100/30 dark:border-indigo-900/10 shrink-0">
                                      {emp.name.split(' ').pop()?.substring(0, 2).toUpperCase() || 'NV'}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 block truncate">{getEmployeeDisplayName(emp.name, isAdmin, false, emp.displayName)}</span>
                                      <span className="text-[10px] text-slate-450 dark:text-slate-500 block font-sans truncate">{emp.role}</span>
                                    </div>
                                  </div>

                                  {/* 3-State Status Toggle (Right next to details!) */}
                                  <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm text-[10px] font-bold self-start sm:self-auto shrink-0">
                                    {[
                                      { label: 'Có đi làm', value: 'Có đi làm' as const, activeClass: 'bg-emerald-500 text-white dark:bg-emerald-600 shadow-sm' },
                                      { label: 'Vắng mặt', value: 'Không đi làm' as const, activeClass: 'bg-rose-500 text-white dark:bg-rose-600 shadow-sm' },
                                      { label: 'Nghỉ phép', value: 'Nghỉ phép' as const, activeClass: 'bg-amber-500 text-white dark:bg-amber-600 shadow-sm' }
                                    ].map(opt => {
                                      const isActive = empStatus === opt.value;
                                      return (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() => {
                                            setCompanyStatuses(prev => ({ ...prev, [emp.name]: opt.value }));
                                          }}
                                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                            isActive
                                              ? `${opt.activeClass} font-extrabold`
                                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                          }`}
                                        >
                                          {opt.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Right: OT and Notes Inputs side-by-side */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-[10px] w-full lg:w-[48%] xl:w-[45%] shrink-0">
                                  {/* OT Checkbox and time ranges */}
                                  <div className="flex items-center gap-2.5 shrink-0 bg-white dark:bg-slate-900 px-3 py-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-11 w-full sm:w-auto">
                                    <label className="flex items-center gap-2 cursor-pointer font-extrabold text-[11px] text-slate-700 dark:text-slate-200 select-none">
                                      <div className="relative">
                                        <input
                                          type="checkbox"
                                          checked={empHasOt}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            setCompanyHasOt(prev => ({ ...prev, [emp.name]: checked }));
                                            if (checked) {
                                              setCustomTimePicker({
                                                isOpen: true,
                                                empName: emp.name,
                                                isDetailedModal: false,
                                                fromVal: companyOtFrom[emp.name] || '18:00',
                                                toVal: companyOtTo[emp.name] || '21:00'
                                              });
                                            }
                                          }}
                                          className="sr-only"
                                        />
                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                                          empHasOt
                                            ? 'border-indigo-500 bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-500/30 scale-105'
                                            : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 hover:border-indigo-400 dark:hover:border-indigo-400'
                                        }`}>
                                          {empHasOt && (
                                            <motion.svg
                                              initial={{ scale: 0, rotate: -15 }}
                                              animate={{ scale: 1, rotate: 0 }}
                                              className="w-3 h-3 stroke-[3.5] stroke-current"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <polyline points="20 6 9 17 4 12" />
                                            </motion.svg>
                                          )}
                                        </div>
                                      </div>
                                      <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">Tăng ca (OT)</span>
                                    </label>

                                    {empHasOt && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCustomTimePicker({
                                            isOpen: true,
                                            empName: emp.name,
                                            isDetailedModal: false,
                                            fromVal: companyOtFrom[emp.name] || '18:00',
                                            toVal: companyOtTo[emp.name] || '21:00'
                                          });
                                        }}
                                        className="ml-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-xl font-mono font-extrabold text-[10.5px] flex items-center gap-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-sm shrink-0 border border-indigo-400/20"
                                        title="Bấm để chỉnh sửa giờ tăng ca"
                                      >
                                        <span>{companyOtFrom[emp.name] || '18:00'}</span>
                                        <span className="text-[9px] text-indigo-200 font-sans font-normal mx-0.5">đến</span>
                                        <span>{companyOtTo[emp.name] || '21:00'}</span>
                                        <Clock className="w-3.5 h-3.5 ml-0.5" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Note input */}
                                  <input
                                    type="text"
                                    placeholder="Ghi chú nhanh (ví dụ: Phép năm, Đi muộn, Dự án gấp...)"
                                    value={empNote}
                                    onChange={(e) => {
                                      setCompanyNotes(prev => ({ ...prev, [emp.name]: e.target.value }));
                                    }}
                                    className="flex-1 px-3 py-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                                  />
                                </div>
                              </motion.div>
                            );
                          })
                        )}
                      </div>

                      {/* Feedbacks if any */}
                      {feedback && (
                        <div className={`p-3.5 rounded-2xl border text-xs font-semibold ${
                          feedback.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
                        }`}>
                          {feedback.message}
                        </div>
                      )}

                      {/* Modal Footer Controls */}
                      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                        {/* Quick Group Preset Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const resetStatuses: typeof companyStatuses = {};
                              const resetHasOt: typeof companyHasOt = {};
                              const resetNotes: typeof companyNotes = {};
                              employees.forEach(emp => {
                                resetStatuses[emp.name] = 'Có đi làm';
                                resetHasOt[emp.name] = false;
                                resetNotes[emp.name] = '';
                              });
                              setCompanyStatuses(resetStatuses);
                              setCompanyHasOt(resetHasOt);
                              setCompanyNotes(resetNotes);
                              setFeedback({
                                type: 'success',
                                message: 'Đã đặt trạng thái "Có đi làm" cho toàn phòng. Bấm "Lưu Chấm Công Cả Ngày" để hoàn tất!'
                              });
                             }}
                            className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-200/50 dark:border-emerald-900/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span>🟢 Đặt đi làm đủ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const resetStatuses: typeof companyStatuses = {};
                              const resetHasOt: typeof companyHasOt = {};
                              const resetNotes: typeof companyNotes = {};
                              employees.forEach(emp => {
                                resetStatuses[emp.name] = 'Không đi làm';
                                resetHasOt[emp.name] = false;
                                resetNotes[emp.name] = '';
                              });
                              setCompanyStatuses(resetStatuses);
                              setCompanyHasOt(resetHasOt);
                              setCompanyNotes(resetNotes);
                              setFeedback({
                                type: 'success',
                                message: 'Đã đặt trạng thái "Vắng mặt" cho toàn phòng. Bấm "Lưu Chấm Công Cả Ngày" để hoàn tất!'
                              });
                             }}
                            className="flex-1 sm:flex-initial px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-200/50 dark:border-rose-900/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span>🔴 Vắng cả phòng</span>
                          </button>
                        </div>

                        {/* Submit Actions */}
                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => setIsDrawerOpen(false)}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 rounded-full text-xs font-extrabold transition-all cursor-pointer"
                          >
                            Hủy bỏ
                          </button>
                          <button
                            type="submit"
                            disabled={isBatchSubmitting}
                            className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-full text-xs font-extrabold shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                          >
                            {isBatchSubmitting ? "Đang lưu..." : "Lưu Chấm Công Cả Ngày"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Detailed Popup Modal for Quick Edit Row in Batch Mode */}
          <AnimatePresence>
            {editingEmployeeForBatch && (
              <div className="fixed inset-0 no-swipe z-[100] overflow-y-auto flex items-center justify-center p-4">
                {/* Backdrop overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setEditingEmployeeForBatch(null)}
                  className="fixed inset-0 no-swipe bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm cursor-pointer"
                />

                {/* Modal Container */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                  className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-100 dark:border-slate-800/80 overflow-hidden z-10 p-6 space-y-5 flex flex-col font-sans transition-colors duration-300"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 leading-tight">
                          Chỉnh sửa chi tiết: {editingEmployeeForBatch}
                        </h4>
                        <span className="text-[10px] text-slate-450 dark:text-slate-500 font-medium block mt-0.5">
                          Bộ phận: {employees.find(e => e.name === editingEmployeeForBatch)?.role || "Thành viên"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingEmployeeForBatch(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-4 text-xs">
                    {/* Status Select */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Trạng thái chấm công</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'Có đi làm' as const, label: 'Có đi làm', color: 'peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-600 peer-checked:text-white hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40' },
                          { value: 'Không đi làm' as const, label: 'Vắng mặt', color: 'peer-checked:bg-rose-500 dark:peer-checked:bg-rose-600 peer-checked:text-white hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-700 dark:text-rose-450 border-rose-100 dark:border-rose-800/40' },
                          { value: 'Nghỉ phép' as const, label: 'Nghỉ phép', color: 'peer-checked:bg-amber-500 dark:peer-checked:bg-amber-600 peer-checked:text-white hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40' }
                        ].map((item) => (
                          <label key={item.value} className="relative cursor-pointer select-none">
                            <input
                              type="radio"
                              name="modalBatchStatus"
                              value={item.value}
                              checked={modalStatus === item.value}
                              onChange={() => setModalStatus(item.value)}
                              className="peer sr-only"
                            />
                            <div className={`w-full py-2 text-center rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${item.color}`}>
                              {item.label}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* OT Section */}
                    <div className="bg-slate-50/60 dark:bg-slate-950/40 p-3.5 rounded-[20px] border border-slate-100/80 dark:border-slate-800/55 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-500 dark:text-indigo-400">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 block">Tăng ca (OT)</span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 block">Thời gian làm thêm giờ</span>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={modalHasOt}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setModalHasOt(checked);
                              if (checked) {
                                setCustomTimePicker({
                                  isOpen: true,
                                  empName: editingEmployeeForBatch || 'Nhân sự',
                                  isDetailedModal: true,
                                  fromVal: modalOtFrom || '18:00',
                                  toVal: modalOtTo || '21:00'
                                });
                               }
                             }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                        </label>
                      </div>

                      {modalHasOt && (
                        <div className="space-y-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 animate-fadeIn">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-1.5">Giờ làm thêm đã chọn</span>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomTimePicker({
                                  isOpen: true,
                                  empName: editingEmployeeForBatch || 'Nhân sự',
                                  isDetailedModal: true,
                                  fromVal: modalOtFrom || '18:00',
                                  toVal: modalOtTo || '21:00'
                                });
                               }
                               }
                            >
                              <span>{modalOtFrom}</span>
                              <span className="text-xs text-indigo-400 font-sans font-bold">đến</span>
                              <span>{modalOtTo}</span>
                              <Clock className="w-4 h-4 ml-1 opacity-75" />
                            </button>
                          </div>

                          {/* OT Preset Ranges */}
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Phím nhanh giờ OT</span>
                            <div className="flex flex-wrap gap-1 max-h-[75px] overflow-y-auto pr-0.5">
                              {[
                                { label: 'Tối (3h)', from: '18:00', to: '21:00' },
                                { label: 'Tối (4h)', from: '18:00', to: '22:00' },
                                { label: 'Tối (5h)', from: '18:00', to: '23:00' },
                                { label: 'CN cả ngày', from: '08:00', to: '17:00' },
                                { label: 'CN sáng', from: '08:00', to: '12:00' },
                                { label: 'CN chiều', from: '13:30', to: '17:30' }
                              ].map((preset, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setModalOtFrom(preset.from);
                                    setModalOtTo(preset.to);
                                  }}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100/85 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100/30 dark:border-indigo-900/20 text-[9px] font-bold rounded-md transition-all cursor-pointer"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes Section */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Ghi chú hoặc lí do riêng</label>
                      <input
                        type="text"
                        placeholder="Ghi chú lí do, phép năm, công việc tăng ca..."
                        value={modalNote}
                        onChange={(e) => setModalNote(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                      />

                      {/* Notes Preset Buttons */}
                      <div className="mt-2">
                        <span className="block text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">Gợi ý ghi chú nhanh</span>
                        <div className="flex flex-wrap gap-1 max-h-[75px] overflow-y-auto pr-0.5">
                          {[
                            'Trực máy / Làm việc muộn',
                            'Nghỉ phép năm',
                            'Nghỉ ốm (Có phép)',
                            'Nghỉ việc riêng',
                            'Dự án gấp',
                            'Đi muộn',
                            'Về sớm'
                          ].map((suggestNote, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setModalNote(suggestNote)}
                              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800/40 text-[9px] font-bold rounded-md transition-all cursor-pointer"
                            >
                              {suggestNote}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setEditingEmployeeForBatch(null)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-full text-xs font-bold transition-all cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveModalConfig}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-full text-xs font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Cập nhật
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Custom Modern Time Picker Modal (NO Native Clock Pickers) */}
          <AnimatePresence>
            {customTimePicker && customTimePicker.isOpen && (() => {
              const fromParts = parseTimeStr(customTimePicker.fromVal);
              const toParts = parseTimeStr(customTimePicker.toVal);

              const activeVal = activeTimeField === 'from' ? customTimePicker.fromVal : customTimePicker.toVal;
              const activeParts = parseTimeStr(activeVal);

              const updateActiveValue = (newHr: string | null, newMin: string | null) => {
                setCustomTimePicker(prev => {
                  if (!prev) return null;
                  const currentVal = activeTimeField === 'from' ? prev.fromVal : prev.toVal;
                  const parts = parseTimeStr(currentVal);
                  const hr = newHr !== null ? newHr : parts.hour;
                  const min = newMin !== null ? newMin : parts.minute;
                  const newVal = joinTimeStr(hr, min);
                  return activeTimeField === 'from' ? { ...prev, fromVal: newVal } : { ...prev, toVal: newVal };
                });
               };

              const handleHourInputChange = (val: string) => {
                const clean = val.replace(/[^0-9]/g, '');
                if (clean.length === 0) {
                  updateActiveValue('00', null);
                  return;
                }
                let hrNum = parseInt(clean, 10);
                if (hrNum > 23) hrNum = 23;
                const hrStr = String(hrNum).padStart(2, '0');
                updateActiveValue(hrStr, null);
                
                if (clean.length >= 2) {
                  setTimeout(() => {
                    document.getElementById('time-picker-minute-input')?.focus();
                    setClockMode('minutes');
                  }, 50);
                }
              };

              const handleMinuteInputChange = (val: string) => {
                const clean = val.replace(/[^0-9]/g, '');
                if (clean.length === 0) {
                  updateActiveValue(null, '00');
                  return;
                }
                let minNum = parseInt(clean, 10);
                if (minNum > 59) minNum = 59;
                const minStr = String(minNum).padStart(2, '0');
                updateActiveValue(null, minStr);
              };

              const incrementHour = () => {
                let hrNum = parseInt(activeParts.hour, 10);
                hrNum = (hrNum + 1) % 24;
                updateActiveValue(String(hrNum).padStart(2, '0'), null);
              };

              const decrementHour = () => {
                let hrNum = parseInt(activeParts.hour, 10);
                hrNum = (hrNum - 1 + 24) % 24;
                updateActiveValue(String(hrNum).padStart(2, '0'), null);
              };

              const incrementMinute = () => {
                let minNum = parseInt(activeParts.minute, 10);
                minNum = (minNum + 5) % 60;
                updateActiveValue(null, String(minNum).padStart(2, '0'));
              };

              const decrementMinute = () => {
                let minNum = parseInt(activeParts.minute, 10);
                minNum = (minNum - 5 + 60) % 60;
                updateActiveValue(null, String(minNum).padStart(2, '0'));
              };

              const handlePresetClick = (from: string, to: string) => {
                setCustomTimePicker(prev => prev ? { ...prev, fromVal: from, toVal: to } : null);
              };

              const handleSaveTime = () => {
                if (!customTimePicker) return;
                const { empName, isDetailedModal, fromVal, toVal } = customTimePicker;
                if (isDetailedModal) {
                  setModalOtFrom(fromVal);
                  setModalOtTo(toVal);
                } else {
                  setCompanyOtFrom(prev => ({ ...prev, [empName]: fromVal }));
                  setCompanyOtTo(prev => ({ ...prev, [empName]: toVal }));
                }
                setCustomTimePicker(null);
              };

              const isPm = parseInt(activeParts.hour, 10) >= 12;

              const toggleAmPm = (targetPm: boolean) => {
                let hrNum = parseInt(activeParts.hour, 10);
                if (targetPm && hrNum < 12) {
                  hrNum += 12;
                } else if (!targetPm && hrNum >= 12) {
                  hrNum -= 12;
                }
                updateActiveValue(String(hrNum).padStart(2, '0'), null);
              };

              const handleClockNumberClick = (num: number) => {
                if (clockMode === 'hours') {
                  let targetHr = num === 12 ? 0 : num;
                  if (isPm) {
                    targetHr = num === 12 ? 12 : num + 12;
                  }
                  updateActiveValue(String(targetHr).padStart(2, '0'), null);
                  // Auto switch to minutes mode for convenience
                  setTimeout(() => setClockMode('minutes'), 300);
                } else {
                  updateActiveValue(null, String(num).padStart(2, '0'));
                }
              };

              const activeHourNum = parseInt(activeParts.hour, 10);
              const activeMinuteNum = parseInt(activeParts.minute, 10);
              const handRotation = clockMode === 'hours' 
                ? (activeHourNum % 12) * 30 
                : activeMinuteNum * 6;

              const getClockNumbers = () => {
                if (clockMode === 'hours') {
                  return Array.from({ length: 12 }, (_, i) => {
                    const val = i === 0 ? 12 : i;
                    const valStr = String(val);
                    const angle = (i * 30 - 90) * (Math.PI / 180);
                    const x = 50 + 38 * Math.cos(angle);
                    const y = 50 + 38 * Math.sin(angle);
                    const isSelected = (activeHourNum % 12) === (val % 12);
                    return { val, valStr, x, y, isSelected };
                  });
                 }
                  return Array.from({ length: 12 }, (_, i) => {
                    const val = i * 5;
                    const valStr = String(val).padStart(2, '0');
                    const angle = (i * 30 - 90) * (Math.PI / 180);
                    const x = 50 + 38 * Math.cos(angle);
                    const y = 50 + 38 * Math.sin(angle);
                    const isSelected = activeMinuteNum === val;
                    return { val, valStr, x, y, isSelected };
                  });
              };

              const clockNumbers = getClockNumbers();

              return (
                <div className="fixed inset-0 no-swipe z-[150] overflow-y-auto flex items-center justify-center p-4">
                  {/* Backdrop Overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setCustomTimePicker(null)}
                    className="fixed inset-0 no-swipe bg-slate-950/70 dark:bg-slate-950/90 backdrop-blur-md cursor-pointer"
                  />

                  {/* Picker Container */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-150 dark:border-slate-800/80 p-5 sm:p-7 space-y-6 flex flex-col font-sans transition-colors duration-300 z-10"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100 leading-tight">
                            Thiết Lập Giờ Tăng Ca
                          </h4>
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-extrabold block mt-0.5 uppercase tracking-wider">
                            Nhân sự: {customTimePicker.empName}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomTimePicker(null)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Dual Active Tabs for Pickers */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTimeField('from');
                          setClockMode('hours');
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          activeTimeField === 'from'
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-850 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                            : 'bg-slate-50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-850 text-slate-500 dark:text-slate-450 hover:bg-slate-100/50 dark:hover:bg-slate-800/35'
                        }`}
                      >
                        <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Giờ Bắt Đầu (Từ)</span>
                        <span className="text-xl font-black font-mono tracking-tight block">
                          {customTimePicker.fromVal}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTimeField('to');
                          setClockMode('hours');
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          activeTimeField === 'to'
                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-850 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                            : 'bg-slate-50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-850 text-slate-500 dark:text-slate-450 hover:bg-slate-100/50 dark:hover:bg-slate-800/35'
                        }`}
                      >
                        <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Giờ Kết Thúc (Đến)</span>
                        <span className="text-xl font-black font-mono tracking-tight block">
                          {customTimePicker.toVal}
                        </span>
                      </button>
                    </div>

                    {/* Editor Split Column layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      
                      {/* Left Column: Direct Digital Inputs */}
                      <div className="flex flex-col space-y-4 bg-slate-50/55 dark:bg-slate-950/35 p-4 rounded-3xl border border-slate-100 dark:border-slate-850">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Chỉnh sửa trực tiếp</span>
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded-md font-bold uppercase">Bàn Phím</span>
                        </div>

                        {/* Huge Digits Grid */}
                        <div className="flex items-center justify-center space-x-3.5 py-2">
                          
                          {/* Hours digital card */}
                          <div className="flex flex-col items-center space-y-1">
                            <button
                              type="button"
                              onClick={incrementHour}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-150/40 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            
                            <input
                              type="text"
                              maxLength={2}
                              value={activeParts.hour}
                              onChange={(e) => handleHourInputChange(e.target.value)}
                              onFocus={() => setClockMode('hours')}
                              className={`w-20 py-2 text-center text-4xl sm:text-5xl font-black font-mono bg-white dark:bg-slate-900 border rounded-2xl shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                                clockMode === 'hours'
                                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/10'
                                  : 'border-slate-200 dark:border-slate-800 text-slate-755 dark:text-slate-200'
                              }`}
                            />

                            <button
                              type="button"
                              onClick={decrementHour}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-150/40 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Giờ</span>
                          </div>

                          {/* Pulsing colon separator */}
                          <span className="text-3xl font-black text-slate-350 dark:text-slate-600 animate-pulse">:</span>

                          {/* Minutes digital card */}
                          <div className="flex flex-col items-center space-y-1">
                            <button
                              type="button"
                              onClick={incrementMinute}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-150/40 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>

                            <input
                              id="time-picker-minute-input"
                              type="text"
                              maxLength={2}
                              value={activeParts.minute}
                              onChange={(e) => handleMinuteInputChange(e.target.value)}
                              onFocus={() => setClockMode('minutes')}
                              className={`w-20 py-2 text-center text-4xl sm:text-5xl font-black font-mono bg-white dark:bg-slate-900 border rounded-2xl shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                                clockMode === 'minutes'
                                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/10'
                                  : 'border-slate-200 dark:border-slate-800 text-slate-755 dark:text-slate-200'
                              }`}
                            />

                            <button
                              type="button"
                              onClick={decrementMinute}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-150/40 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Phút</span>
                          </div>
                        </div>

                        {/* AM / PM Segmented Control */}
                        <div className="pt-1.5 border-t border-slate-150/50 dark:border-slate-850/50">
                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-150/50 dark:bg-slate-900 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                            <button
                              type="button"
                              onClick={() => toggleAmPm(false)}
                              className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                                !isPm
                                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                              }`}
                            >
                              Sáng (AM)
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleAmPm(true)}
                              className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                                isPm
                                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                              }`}
                            >
                              Chiều / Tối (PM)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Beautiful Interactive Analog Clock Face */}
                      <div className="flex flex-col items-center space-y-4 bg-slate-50/55 dark:bg-slate-950/35 p-4 rounded-3xl border border-slate-100 dark:border-slate-850">
                        <div className="w-full flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">
                            Chế độ: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{clockMode === 'hours' ? 'Ghi Giờ' : 'Ghi Phút'}</span>
                          </span>
                          <div className="flex bg-slate-150/55 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200/35 dark:border-slate-800/40">
                            <button
                              type="button"
                              onClick={() => setClockMode('hours')}
                              className={`px-2 py-1 text-[9px] font-bold rounded-md cursor-pointer transition-all ${clockMode === 'hours' ? 'bg-indigo-500 text-white shadow-xs' : 'text-slate-450'}`}
                            >
                              Giờ
                            </button>
                            <button
                              type="button"
                              onClick={() => setClockMode('minutes')}
                              className={`px-2 py-1 text-[9px] font-bold rounded-md cursor-pointer transition-all ${clockMode === 'minutes' ? 'bg-indigo-500 text-white shadow-xs' : 'text-slate-450'}`}
                            >
                              Phút
                            </button>
                          </div>
                        </div>

                        {/* Interactive Clock Circle */}
                        <div className="relative w-48 h-48 rounded-full bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 shadow-inner flex items-center justify-center">
                          
                          {/* Center point pin */}
                          <div className="absolute w-2 h-2 rounded-full bg-indigo-500 z-20 shadow-sm" />

                          {/* Clock indicator hand */}
                          <div
                            style={{ transform: `rotate(${handRotation}deg)` }}
                            className="absolute inset-x-0 bottom-1/2 top-0 flex flex-col items-center justify-end origin-bottom pointer-events-none z-10 transition-transform duration-300 ease-out"
                          >
                            <div className="w-0.5 bg-indigo-500 h-16 rounded-full" />
                            <div className="absolute top-3 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center animate-pulse" />
                          </div>

                          {/* Clock dial numbers */}
                          {clockNumbers.map(({ val, valStr, x, y, isSelected }) => {
                            const displayVal = clockMode === 'hours' ? val : valStr;
                            return (
                              <button
                                key={String(val)}
                                type="button"
                                onClick={() => handleClockNumberClick(val)}
                                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                                className={`absolute w-7 h-7 text-xs font-mono font-black flex items-center justify-center rounded-full transition-all cursor-pointer z-20 ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-md scale-110 border border-indigo-400 dark:bg-indigo-500'
                                    : 'text-slate-550 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400'
                                }`}
                              >
                                {displayVal}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    {/* Presets row for speedy configs */}
                    <div className="bg-slate-50/40 dark:bg-slate-950/20 p-3.5 rounded-2xl border border-slate-100/60 dark:border-slate-850/60">
                      <span className="block text-[10.5px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Áp dụng nhanh khung giờ phổ biến</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Tối (3h): 18:00 - 21:00', from: '18:00', to: '21:00' },
                          { label: 'Tối (4h): 18:00 - 22:00', from: '18:00', to: '22:00' },
                          { label: 'Tối (5h): 18:00 - 23:00', from: '18:00', to: '23:00' },
                          { label: 'CN cả ngày: 08:00 - 17:00', from: '08:00', to: '17:00' },
                          { label: 'CN sáng: 08:00 - 12:00', from: '08:00', to: '12:00' },
                          { label: 'CN chiều: 13:30 - 17:30', from: '13:30', to: '17:30' }
                        ].map((preset, idx) => {
                          const isMatch = customTimePicker.fromVal === preset.from && customTimePicker.toVal === preset.to;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handlePresetClick(preset.from, preset.to)}
                              className={`px-3 py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                                isMatch
                                  ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm font-extrabold'
                                  : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-300 border-slate-200/60 dark:border-slate-800'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                      <button
                        type="button"
                        onClick={() => setCustomTimePicker(null)}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200/85 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-full text-xs sm:text-sm font-extrabold transition-all cursor-pointer text-center"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveTime}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-full text-xs sm:text-sm font-extrabold shadow-md transition-all active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-1.5"
                      >
                        Đồng ý & Áp dụng
                      </button>
                    </div>
                  </motion.div>
                </div>
              );
            })()}
          </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="form-view"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.4 }}
            id="attendance-section"
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
          {/* 1. Employee Selector Panel */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800/80 shadow-md flex flex-col h-[550px] transition-colors duration-300">
            <h3 className="font-sans font-bold text-base text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                <User className="w-5 h-5" />
              </div>
              Bước 1: Chọn Nhân Viên Chấm Công
            </h3>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc chức vụ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/70 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-all"
              />
            </div>

            {/* Employee List Scrollable */}
            <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800/60 rounded-2xl divide-y divide-slate-50 dark:divide-slate-800 pr-1">
              {filteredEmployees.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                  Không tìm thấy nhân viên nào
                </div>
              ) : (
                filteredEmployees.map((emp) => (
                  <button
                    key={emp.name}
                    onClick={() => {
                      setSelectedEmpName(emp.name);
                      setFeedback(null);
                    }}
                    className={`w-full text-left p-3 flex items-center gap-3 transition-all rounded-xl cursor-pointer ${
                      selectedEmpName === emp.name
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-850/40'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-sm flex-shrink-0">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-850 dark:text-slate-200">{getEmployeeDisplayName(emp.name, isAdmin, false, emp.displayName)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{emp.role}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 2. Log Fields Form Panel */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800/80 shadow-md flex flex-col justify-between min-h-[550px] transition-colors duration-300">
            <div>
              <h3 className="font-sans font-bold text-base text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <CheckSquare className="w-5 h-5" />
                </div>
                Bước 2: Ghi Nhận Trạng Thái Công & Tăng Ca
              </h3>

              {!selectedEmployee ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-[24px] bg-slate-50 dark:bg-slate-950/30 min-h-[350px]">
                  <AlertCircle className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-700 animate-pulse" />
                  <p className="text-sm font-medium text-center max-w-xs leading-relaxed">Vui lòng chọn nhân viên ở danh sách bên trái trước khi ghi nhận công</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Simplified policy info banner */}
                  <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed animate-fadeIn">
                    <span className="font-bold flex items-center gap-1.5 mb-1 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Hệ thống Chấm công Tự động hóa Đơn giản:
                    </span>
                    Tất cả nhân viên mặc định được coi là <b>Có đi làm</b> từ Thứ Hai đến Thứ Bảy. Bạn <b>KHÔNG cần</b> phải vào chấm công "Có đi làm" mỗi ngày nữa! Chỉ cần ghi nhận khi có ngoại lệ: <b>Nghỉ phép</b>, <b>Không đi làm (Vắng)</b>, <b>Tăng ca (OT)</b>, hoặc <b>Làm việc ngày Chủ Nhật (Mặc định là OT)</b>.
                  </div>

                  {/* Employee Header Info */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 rounded-[20px] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Nhân viên đang ghi công</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedEmployee.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Chức vụ</span>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-full border border-indigo-100/30 dark:border-indigo-900/30">{selectedEmployee.role}</span>
                    </div>
                  </div>

                  {/* Day / Date Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ngày Chấm Công</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors font-mono"
                    />
                    {(() => {
                      const holidayName = getVietnamHolidayName(date);
                      const isSunday = new Date(date).getDay() === 0;
                      
                      return (
                        <div className="space-y-2 mt-2">
                          {holidayName && (
                            <div className="text-xs bg-pink-50 dark:bg-pink-950/50 border border-pink-100 dark:border-pink-900/40 text-pink-700 dark:text-pink-300 px-4 py-3 rounded-2xl font-sans font-medium flex items-start gap-2.5 animate-fadeIn">
                              <span className="animate-bounce mt-0.5">🇻🇳</span>
                              <span>Lịch nghỉ lễ Nhà nước: <b>{holidayName}</b>. Nếu nhân viên nghỉ, hãy chọn "Không đi làm" (hệ thống tự động chuyển sang trạng thái "Ngày lễ"). Nếu đi làm, tính tăng ca phù hợp!</span>
                            </div>
                          )}
                          {isSunday && (
                            <div className="text-xs bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100/30 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-4 py-3 rounded-2xl font-sans font-medium flex items-start gap-2.5 animate-fadeIn">
                              <span className="animate-bounce mt-0.5">✨</span>
                              <span><b>Ngày Chủ Nhật:</b> Chủ Nhật mặc định là ngày nghỉ cuối tuần. Nếu chọn <b>"Có đi làm"</b>, hệ thống sẽ <b>tự động bật tăng ca (OT) từ 08:00 đến 17:00</b> cho bạn!</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Status Radio Choice */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Trạng thái đi làm</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'Có đi làm', color: 'peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-600 peer-checked:text-white hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40' },
                        { value: 'Không đi làm', color: 'peer-checked:bg-rose-500 dark:peer-checked:bg-rose-600 peer-checked:text-white hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800/40' },
                        { value: 'Nghỉ phép', color: 'peer-checked:bg-amber-500 dark:peer-checked:bg-amber-600 peer-checked:text-white hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40' }
                      ].map((item) => (
                        <label key={item.value} className="relative cursor-pointer">
                          <input
                            type="radio"
                            name="attendanceStatus"
                            value={item.value}
                            checked={status === item.value}
                            onChange={() => setStatus(item.value as any)}
                            className="peer sr-only"
                          />
                          <div className={`w-full py-3.5 text-center rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${item.color}`}>
                            {item.value}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* OT Hours Section */}
                  <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4.5 rounded-[24px] border border-slate-100 dark:border-slate-800/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-500 dark:text-indigo-400">
                          <Clock className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 block">Thời gian tăng ca (OT)</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Chọn nếu nhân viên có làm thêm giờ (OT) hôm nay</span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasOt}
                          onChange={(e) => setHasOt(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>

                    {hasOt && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 animate-fadeIn font-mono">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider mb-1.5 font-sans">OT từ mấy giờ</label>
                          <input
                            type="time"
                            value={otFrom}
                            onChange={(e) => setOtFrom(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider mb-1.5 font-sans">OT đến mấy giờ</label>
                          <input
                            type="time"
                            value={otTo}
                            onChange={(e) => setOtTo(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Note Text Box */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ghi chú hoặc lí do</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Đi làm trễ vì kẹt xe, OT hỗ trợ sự kiện, phép năm..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                    />
                  </div>

                  {/* Submission Result Feedback */}
                  {feedback && (
                    <div className={`p-4 rounded-2xl border text-xs ${
                      feedback.type === 'success' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-400" />
                        <span className="font-semibold">{feedback.message}</span>
                      </div>
                    </div>
                  )}

                  {/* Submit Buttons */}
                  <div className="flex justify-end gap-3 pt-2">
                    {selectedEmployee && timeLogs.some(l => l.employeeName.trim().toLowerCase() === selectedEmployee.name.trim().toLowerCase() && l.date === date) && (
                      <button
                        type="button"
                        onClick={handleDeleteLog}
                        disabled={isSubmitting}
                        className="px-5 py-3 bg-rose-500/10 hover:bg-rose-500/20 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 rounded-full text-sm font-bold border border-rose-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa Ghi Nhận
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-7 py-3 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-full text-sm font-bold shadow-md shadow-indigo-155 dark:shadow-none transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                    >
                      {isSubmitting ? "Đang lưu trữ..." : "Lưu Nhật Ký Công"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* 3. Leave balance tracking table for everyone */}
      <div className="lg:col-span-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[32px] shadow-md overflow-hidden transition-colors duration-300">
        <div className="p-6 border-b border-slate-150 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/5 to-indigo-500/5 dark:from-amber-950/10 dark:to-indigo-950/10">
          <div>
            <h3 className="font-sans font-bold text-base text-slate-850 dark:text-slate-100 flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              📊 Bảng Tra Cứu Số Ngày Nghỉ Phép Năm (Mọi người)
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
              Tra cứu nhanh quỹ phép năm, số ngày đã nghỉ phép và quỹ phép còn lại thực tế của toàn bộ nhân sự.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl max-w-xs border border-slate-200/50 dark:border-slate-800/80 shadow-inner text-xs font-bold">
            <button
              onClick={() => {
                setLeaveCalcMode('accountant');
                setExpandedLeaveEmp(null);
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl transition-all duration-300 cursor-pointer ${
                leaveCalcMode === 'accountant'
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-200/40 dark:border-amber-900/30 font-bold scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-900/40'
              }`}
            >
              📑 Kế Toán Chốt
            </button>
            <button
              onClick={() => {
                setLeaveCalcMode('standard');
                setExpandedLeaveEmp(null);
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl transition-all duration-300 cursor-pointer ${
                leaveCalcMode === 'standard'
                  ? 'bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-950/20 dark:to-sky-950/20 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-200/40 dark:border-indigo-900/30 font-bold scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-900/40'
              }`}
            >
              ⚖️ Theo Luật
            </button>
          </div>
        </div>

        {/* Search input for Leave balance table */}
        <div className="p-5 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Tìm kiếm nhân viên tra phép..."
              value={leaveSearch}
              onChange={(e) => setLeaveSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            * Nhấp vào từng nhân viên để xem giải trình chi tiết & lịch sử phép năm
          </div>
        </div>

        {/* Accountant calculation list */}
        {leaveCalcMode === 'accountant' ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {accountantLeaveReports.filter(report => report.isMatched && report.displayName.toLowerCase().includes(leaveSearch.toLowerCase())).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Chưa có nhân viên nào trong danh sách hoặc không tìm thấy kết quả phù hợp
              </div>
            ) : (
              accountantLeaveReports
                .filter(report => report.isMatched && report.displayName.toLowerCase().includes(leaveSearch.toLowerCase()))
                .map((report) => {
                  const isExpanded = expandedLeaveEmp === `acc-${report.key}`;
                  return (
                    <div key={report.key} className="transition-colors hover:bg-slate-50/30 dark:hover:bg-slate-850/10">
                      <div
                        onClick={() => setExpandedLeaveEmp(isExpanded ? null : `acc-${report.key}`)}
                        className="p-4.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-100/60 dark:border-amber-900/40 flex items-center justify-center font-bold text-amber-700 dark:text-amber-400 text-xs shrink-0">
                            {report.displayName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{isAdmin ? report.displayName : getEmployeeDisplayName(report.displayName, isAdmin, false, report.matchedEmployee?.displayName)}</h4>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {report.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              {report.isMatched ? `✓ Tài khoản: ${isAdmin ? report.matchedEmployee?.name : getEmployeeDisplayName(report.matchedEmployee?.name || '', isAdmin, false, report.matchedEmployee?.displayName)}` : "Chưa tạo tài khoản hệ thống"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center text-xs font-bold w-full md:w-auto justify-between md:justify-end">
                          <div className="bg-slate-50 dark:bg-slate-950/40 text-slate-650 dark:text-slate-350 px-2.5 py-1 rounded-xl border border-slate-100/30 flex flex-col items-center min-w-16">
                            <span className="text-[8px] text-slate-400 uppercase">Cấp phép</span>
                            <span className="text-xs font-extrabold">{report.totalEntitled} ngày</span>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-xl border border-amber-100/30 flex flex-col items-center min-w-16">
                            <span className="text-[8px] text-amber-500 uppercase">Đã dùng</span>
                            <span className="text-xs font-extrabold">{report.usedByChat} ngày</span>
                          </div>
                          <div className={`px-2.5 py-1 rounded-xl flex flex-col items-center min-w-16 ${
                            report.remainingByChat > 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/30'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100/30'
                          }`}>
                            <span className="text-[8px] text-slate-400 uppercase">Còn lại</span>
                            <span className="text-xs font-extrabold">{report.remainingByChat} ngày</span>
                          </div>

                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500 ml-1 hidden md:block" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 ml-1 hidden md:block" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1.5 bg-slate-50/40 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 space-y-3.5 animate-fadeIn">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-sm">
                              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block mb-1">💬 Đoạn chốt của Kế toán</span>
                              <p className="text-xs italic text-slate-650 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                                "{report.chatQuote}"
                              </p>
                            </div>
                            <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-1.5">
                              <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block">📐 Quy tắc & Giải trình</span>
                              <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed">
                                {report.ruleDesc}
                              </p>
                              <div className="text-[10px] font-bold text-slate-500 border-t border-slate-100 dark:border-slate-850 pt-1.5">
                                Quỹ phép còn lại sẵn sàng sử dụng: <strong className="text-amber-600 dark:text-amber-450">{report.remainingByChat} ngày</strong>.
                              </div>
                            </div>
                          </div>

                          {/* Real system logs */}
                          <div className="border border-slate-200/50 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                            <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950/60 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center border-b border-slate-100 dark:border-slate-850">
                              <span>Nhật ký Chấm công thực tế trong năm {currentYear}</span>
                              <span>Đã nghỉ trên hệ thống: {report.systemLeaveUsed} ngày</span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                              {report.systemLeaveLogs.length === 0 ? (
                                <div className="p-3 text-center text-slate-400 italic">
                                  Chưa ghi nhận ngày nghỉ phép năm nào trên hệ thống.
                                </div>
                              ) : (
                                report.systemLeaveLogs.map((log, idx) => (
                                  <div key={idx} className="p-2.5 flex justify-between items-center">
                                    <span className="font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-[10px]">
                                      {log.date}
                                    </span>
                                    <span className="text-slate-500 max-w-xs truncate italic">
                                      {log.note ? `"${log.note}"` : "Nghỉ phép năm hưởng nguyên lương"}
                                    </span>
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
        ) : (
          /* Standard calculation list (According to Law) */
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {leaveReports.filter(report => report.employee.name.toLowerCase().includes(leaveSearch.toLowerCase())).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Chưa có nhân viên nào trong danh sách hoặc không tìm thấy kết quả phù hợp
              </div>
            ) : (
              leaveReports
                .filter(report => report.employee.name.toLowerCase().includes(leaveSearch.toLowerCase()))
                .map((report) => {
                  const isExpanded = expandedLeaveEmp === `std-${report.employee.name}`;
                  return (
                    <div key={report.employee.name} className="transition-colors hover:bg-slate-50/30 dark:hover:bg-slate-850/10">
                      <div
                        onClick={() => setExpandedLeaveEmp(isExpanded ? null : `std-${report.employee.name}`)}
                        className="p-4.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100/60 dark:border-indigo-900/40 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-400 text-xs shrink-0">
                            {report.employee.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{getEmployeeDisplayName(report.employee.name, isAdmin, false, report.employee.displayName)}</h4>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              Thâm niên: <span className="font-semibold">{report.employee.role}</span> | Vào làm: <span className="font-mono">{report.employee.registeredAt || "N/A"}</span>
                              {report.employee.leftAt && (
                                <> | Rời khỏi: <span className="font-mono text-rose-500">{report.employee.leftAt}</span></>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center text-xs font-bold w-full md:w-auto justify-between md:justify-end">
                          <div className="bg-slate-50 dark:bg-slate-950/40 text-slate-650 dark:text-slate-350 px-2.5 py-1 rounded-xl border border-slate-100/30 flex flex-col items-center min-w-16">
                            <span className="text-[8px] text-slate-400 uppercase">Tích lũy</span>
                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{report.leaveEntitlement} ngày</span>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-xl border border-amber-100/30 flex flex-col items-center min-w-16">
                            <span className="text-[8px] text-amber-500 uppercase">Đã dùng</span>
                            <span className="text-xs font-extrabold">{report.leaveUsed} ngày</span>
                          </div>
                          <div className={`px-2.5 py-1 rounded-xl flex flex-col items-center min-w-16 ${
                            report.leaveRemaining > 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/30'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100/30'
                          }`}>
                            <span className="text-[8px] text-slate-400 uppercase">Còn lại</span>
                            <span className="text-xs font-extrabold">{report.leaveRemaining} ngày</span>
                          </div>

                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500 ml-1 hidden md:block" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 ml-1 hidden md:block" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1.5 bg-slate-50/40 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 space-y-3.5 animate-fadeIn">
                          <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm leading-relaxed space-y-2">
                            <span className="font-bold text-slate-750 dark:text-slate-300 block mb-1 flex items-center gap-1">
                              <span>⚖️ Chi tiết tính toán & Reset phép sau Tết Nguyên Đán {currentYear}:</span>
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                              <div>
                                <p>• Quỹ phép cơ bản {currentYear}: <strong className="text-slate-800 dark:text-slate-200">{report.baseEntitlement} ngày</strong></p>
                                <p>• Phép gối đầu 2025 nhận: <strong className="text-slate-800 dark:text-slate-200">{report.initialCarryover} ngày</strong></p>
                                <p className="text-amber-600 dark:text-amber-400">• Hạn sử dụng phép gối đầu: <strong className="font-extrabold">Trước Tết Ta (17/02/2026)</strong></p>
                              </div>
                              <div>
                                <p>• Đã dùng trước Tết Ta: <strong className="text-slate-800 dark:text-slate-200">{report.leaveUsedBeforeTet} ngày</strong> (trừ vào phép 2025)</p>
                                <p className="text-rose-500 font-bold">• Phép 2025 hết hạn (Reset về 0): {report.carryoverExpired} ngày</p>
                                <p>• Đã dùng từ sau Tết Ta: <strong className="text-slate-800 dark:text-slate-200">{report.leaveUsedAfterTet} ngày</strong> (trừ vào phép {currentYear})</p>
                              </div>
                            </div>
                            <p className="pt-1.5 text-xs">
                              Theo quy định mới, <strong className="text-slate-800 dark:text-slate-200">không cộng dồn ngày phép gối đầu sang năm tiếp theo sau Tết Nguyên Đán</strong>. 
                              Tổng quỹ phép khả dụng thực tế sau reset là <strong className="text-indigo-600 dark:text-indigo-400">{report.leaveEntitlement} ngày</strong> (Phép năm {currentYear} + Phép gối đầu đã dùng kịp trước Tết). 
                              Đã sử dụng tổng cộng <strong className="text-slate-800 dark:text-slate-200">{report.leaveUsed} ngày</strong>. 
                              Số phép còn lại khả dụng hiện tại là <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{report.leaveRemaining} ngày</strong>.
                            </p>
                          </div>

                          {/* Leave history logs */}
                          <div className="border border-slate-200/50 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                            <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950/60 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center border-b border-slate-100 dark:border-slate-850">
                              <span>Chi tiết lịch sử nghỉ phép YTD {currentYear}</span>
                              <span>Tìm thấy: {report.leaveUsed} ngày</span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                              {report.ytdLeaveLogs.length === 0 ? (
                                <div className="p-3 text-center text-slate-400 italic">
                                  Chưa ghi nhận ngày nghỉ phép năm nào trên hệ thống.
                                </div>
                              ) : (
                                report.ytdLeaveLogs.map((log, idx) => (
                                  <div key={idx} className="p-2.5 flex justify-between items-center">
                                    <span className="font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-[10px]">
                                      {log.date}
                                    </span>
                                    <span className="text-slate-500 max-w-xs truncate italic">
                                      {log.note ? `"${log.note}"` : "Nghỉ phép năm hưởng nguyên lương"}
                                    </span>
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
        )}
      </div>
    </div>
  );
}

