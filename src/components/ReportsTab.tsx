import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Employee,
  TimeLog,
  EmployeeMonthlyReport,
  DailyStatus,
} from "../types";
import { updateTimeLog, deleteTimeLog } from "../sheets";
import { getVietnamHolidayName } from "../holidays";
import {
  parseRegisteredDate,
  recalculateAnnualLeave,
} from "../utils/leaveUtils";
import {
  getExportName,
  getEmployeeDisplayName,
  getDisplayNameFromList,
} from "../utils/nameUtils";
import { RandomLoader } from "./RandomLoader";
import { playConfirmSound, playTabSound } from "../sound";
import * as htmlToImage from "html-to-image";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Line,
} from "recharts";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Sliders,
  Edit2,
  Trash2,
  Share2,
  Copy,
  Check,
  Printer,
  FileText,
  Eye,
  Sun,
  Moon,
  X,
  LogOut,
  Search,
  RefreshCw,
  Coins,
  TrendingUp,
  Calculator,
  Settings,
  Download,
} from "lucide-react";

interface ReportsTabProps {
  accessToken: string;
  employees: Employee[];
  timeLogs: TimeLog[];
  onLogUpdated: () => void;
  role?: "admin" | "accountant";
  isLoading?: boolean;
}

// Helper to calculate OT hours from 'otFrom' and 'otTo'
function getLeaveDaysString(
  report: EmployeeMonthlyReport,
  totalDays: number,
): string {
  const leaveDaysList: number[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const detail = report.dailyDetails[d];
    if (detail && detail.status === "Nghỉ phép") {
      leaveDaysList.push(d);
    }
  }
  if (leaveDaysList.length === 0) return "-";
  return leaveDaysList.map((d) => `${String(d).padStart(2, "0")}`).join(", ");
}

function getOtDaysString(
  report: EmployeeMonthlyReport,
  totalDays: number,
  year: number,
  month: number,
): string {
  const otList: string[] = [];
  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  for (let d = 1; d <= totalDays; d++) {
    const detail = report.dailyDetails[d];
    if (detail && detail.otFrom && detail.otTo) {
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = dateObj.getDay();
      const dayName = weekdays[dayOfWeek];
      otList.push(
        `${dayName} ${String(d).padStart(2, "0")} (${detail.otFrom}-${detail.otTo})`,
      );
    }
  }
  if (otList.length === 0) return "-";
  return otList.join(", ");
}

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

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}
function intersectTime(s1: number, e1: number, s2: number, e2: number) {
  const start = Math.max(s1, s2);
  const end = Math.min(e1, e2);
  if (start < end) {
    return {
      start,
      end,
      hours: (end - start) / 60,
      str: `${minutesToTime(start)} - ${minutesToTime(end)}`,
    };
  }
  return null;
}
function splitOtHours(from: string, to: string) {
  if (!from || !to)
    return { dayStr: "", dayHours: 0, nightStr: "", nightHours: 0 };
  let startMin = parseTimeToMinutes(from);
  let endMin = parseTimeToMinutes(to);
  if (endMin < startMin) {
    endMin += 24 * 60;
  }
  const day1 = intersectTime(startMin, endMin, 360, 1320);
  const night1 = intersectTime(startMin, endMin, 0, 360);
  const night2 = intersectTime(startMin, endMin, 1320, 1800);
  const day2 = intersectTime(startMin, endMin, 1800, 2760);
  const days = [day1, day2].filter(Boolean);
  const nights = [night1, night2].filter(Boolean);
  return {
    dayStr: days.map((d) => d?.str).join(", "),
    dayHours: days.reduce((sum, d) => sum + (d?.hours || 0), 0),
    nightStr: nights.map((d) => d?.str).join(", "),
    nightHours: nights.reduce((sum, d) => sum + (d?.hours || 0), 0),
  };
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

const ReportsTab = React.memo(function ReportsTab({
  accessToken,
  employees,
  timeLogs,
  onLogUpdated,
  role = "admin",
  isLoading = false,
}: ReportsTabProps) {
  const isAdmin = role === "admin";
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    now.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [expandedEmployeeName, setExpandedEmployeeName] = useState<
    string | null
  >(null);
  const [subTab, setSubTab] = useState<"summary" | "calendar" | "leave">(
    "summary",
  );
  const [leaveCalcMode, setLeaveCalcMode] = useState<"standard" | "accountant">(
    "standard",
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterDepartment, setFilterDepartment] = useState<string>("Tất cả");
  const [calendarView, setCalendarView] = useState<"grid" | "list">("grid");

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
  const reportRef = useRef<HTMLDivElement>(null);
  const hiddenReportRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [selectedOtEmployee, setSelectedOtEmployee] = useState<string | null>(
    null,
  );
  const [isExportingOtPng, setIsExportingOtPng] = useState(false);
  const [isExportingOtExcel, setIsExportingOtExcel] = useState(false);
  const [otReasons, setOtReasons] = useState<Record<string, string>>({});
  const otModalRef = useRef<HTMLDivElement>(null);

  
  

  const handleDownloadPng = useCallback(async () => {
    const targetNode = reportRef.current || hiddenReportRef.current;
    if (!targetNode) return;
    setIsDownloadingPng(true);
    try {
      // Temporarily remove .dark to capture beautiful light-mode visual output
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark) {
        document.documentElement.classList.remove("dark");
      }

      // Wait a brief microtask for layout & style recalculations
      await new Promise((resolve) => setTimeout(resolve, 300));

      const blob = await htmlToImage.toBlob(targetNode, {
        quality: 1.0,
        pixelRatio: 2, // High DPI scaling for crisp display text
        backgroundColor: "#ffffff",
        cacheBust: true,
        filter: (node: Element) => {
          if (node.classList && node.classList.contains("no-print")) {
            return false;
          }
          return true;
        },
      });

      // Restore dark mode if it was originally active
      if (isDark) {
        document.documentElement.classList.add("dark");
      }

      if (!blob) {
        throw new Error("Không thể tạo dữ liệu ảnh PNG.");
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `Bao_Cao_Cham_Cong_Thang_${selectedMonth}_${selectedYear}.png`;
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 10000);
    } catch (err) {
      console.error("Error generating PNG:", err);
      alert("Không thể xuất ảnh PNG. Vui lòng tải lại trang và thử lại.");
    } finally {
      setIsDownloadingPng(false);
    }
  }, [selectedMonth, selectedYear]);

  const handleDownloadPdf = useCallback(async () => {
    const targetNode = reportRef.current || hiddenReportRef.current;
    if (!targetNode) return;

    try {
      // Temporarily remove .dark to capture beautiful light-mode visual output
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark) {
        document.documentElement.classList.remove("dark");
      }

      // Wait a brief microtask for layout & style recalculations
      await new Promise((resolve) => setTimeout(resolve, 300));

      const dataUrl = await htmlToImage.toPng(targetNode, {
        quality: 1.0,
        pixelRatio: 2.5, // High DPI scaling for extremely crisp PDF texts
        backgroundColor: "#ffffff",
        cacheBust: true,
        filter: (node: Element) => {
          if (node.classList && node.classList.contains("no-print")) {
            return false;
          }
          return true;
        },
      });

      // Restore dark mode if it was originally active
      if (isDark) {
        document.documentElement.classList.add("dark");
      }

      // Import jsPDF dynamically to keep bundle light
      const { jsPDF } = await import("jspdf");

      // Setup landscape A4 document (297 x 210 mm)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, 297, 210, undefined, "FAST");
      pdf.save(`Bao_Cao_Cham_Cong_Thang_${selectedMonth}_${selectedYear}.pdf`);
    } catch (err) {
      console.error("Error generating PDF via jsPDF:", err);
      alert("Có lỗi khi tạo PDF. Vui lòng thử lại.");
    } finally {
    }
  }, [selectedMonth, selectedYear]);

  // States for PDF Letterhead Customization (Persistent)
  const [pdfCompanyName, setPdfCompanyName] = useState(() => {
    const saved = localStorage.getItem("pdf_company_name");
    if (!saved) {
      localStorage.setItem("pdf_company_name", "EGYPT");
      return "EGYPT";
    }
    return saved;
  });
  const [pdfAddress, setPdfAddress] = useState(() => {
    const saved = localStorage.getItem("pdf_address");
    if (
      !saved ||
      saved === "Địa chỉ: Tòa nhà Sông Đà, Phạm Hùng, Mỹ Đình, Hà Nội"
    ) {
      localStorage.setItem(
        "pdf_address",
        "Địa chỉ: 41 Hoa Đào Phường Cầu Kiệu",
      );
      return "Địa chỉ: 41 Hoa Đào Phường Cầu Kiệu";
    }
    return saved;
  });
  const [pdfHotlineEmail, setPdfHotlineEmail] = useState(() => {
    const saved = localStorage.getItem("pdf_hotline_email");
    if (
      !saved ||
      saved === "Hotline: 024.123.4567 | Email: contact@company.com"
    ) {
      localStorage.setItem(
        "pdf_hotline_email",
        "Hotline: 0909488487 | Email: dddung487@gmail.com",
      );
      return "Hotline: 0909488487 | Email: dddung487@gmail.com";
    }
    return saved;
  });
  const [pdfReportTitle, setPdfReportTitle] = useState(
    () =>
      localStorage.getItem("pdf_report_title") ||
      "BẢNG TỔNG HỢP CÔNG & PHÉP NHÂN SỰ",
  );
  const [pdfDocumentCode, setPdfDocumentCode] = useState(
    () => localStorage.getItem("pdf_document_code") || "QT-NS-09",
  );
  const [pdfSigner1, setPdfSigner1] = useState(
    () => localStorage.getItem("pdf_signer1") || "Bộ phận Nhân sự",
  );
  const [pdfSigner2, setPdfSigner2] = useState(
    () => localStorage.getItem("pdf_signer2") || "Ban Tài chính - Kế toán",
  );
  const [pdfSigner3, setPdfSigner3] = useState(
    () => localStorage.getItem("pdf_signer3") || "Đại diện pháp luật",
  );
  const [pdfLocation, setPdfLocation] = useState(
    () => localStorage.getItem("pdf_location") || "",
  );
  const [pdfDateString, setPdfDateString] = useState(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `ngày ${day} tháng ${month} năm ${year}`;
  });

  const handleUpdatePdfConfig = (
    key: string,
    value: string,
    setter: (val: string) => void,
  ) => {
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
      `Bạn có chắc chắn muốn xóa lịch sử chấm công của ${log.employeeName} ngày ${log.date}?`,
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
    const monthStr = String(selectedMonth).padStart(2, "0");
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${selectedYear}-${monthStr}-${String(d).padStart(2, "0")}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
      const isWeekend = dayOfWeek === 0; // Sunday only
      const holidayName = getVietnamHolidayName(dateStr);
      info.push({
        day: d,
        dateStr,
        dayOfWeek,
        isWeekend,
        holidayName,
      });
    }
    return info;
  }, [selectedMonth, selectedYear, totalDaysInMonth]);

  // Aggregate monthly report for all employees
  const monthlyReports = useMemo((): EmployeeMonthlyReport[] => {
    const result: EmployeeMonthlyReport[] = [];

    // Filter logs for selected month and year
    const monthlyLogs = timeLogs.filter((log) => {
      const [y, m] = log.date.split("-");
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

    employees.forEach((emp) => {
      const empKey = emp.name.trim().toLowerCase();
      const empLogs = monthlyLogsByEmp.get(empKey) || [];

      // Pre-index empLogs by date for O(1) fast lookup
      const empLogsByDate = new Map<string, TimeLog>();
      for (const log of empLogs) {
        empLogsByDate.set(log.date, log);
      }

      // Initialize daily status calendar grid
      const dailyDetails: { [day: number]: DailyStatus } = {};

      daysInfo.forEach(
        ({ day, dateStr, dayOfWeek, isWeekend, holidayName }) => {
          const dayLog = empLogsByDate.get(dateStr);

          let status: DailyStatus["status"] = holidayName
            ? "Ngày lễ"
            : isWeekend
              ? "Nghỉ cuối tuần"
              : "Có đi làm";
          let otFrom = "";
          let otTo = "";
          let note = holidayName || "";

          const isBeforeStart = emp.registeredAt
            ? isDateBeforeRegistered(
                selectedYear,
                selectedMonth,
                day,
                emp.registeredAt,
              )
            : false;
          const isAfterResigned = emp.leftAt
            ? isDateAfterLeft(selectedYear, selectedMonth, day, emp.leftAt)
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

          dailyDetails[day] = {
            date: dateStr,
            status,
            otFrom,
            otTo,
            note,
            holidayName: holidayName || undefined,
          };
        },
      );

      // Calculate aggregated numbers
      let presentDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let holidayDays = 0;
      let totalOtHours = 0;

      daysInfo.forEach(({ day, dayOfWeek, isWeekend }) => {
        const detail = dailyDetails[day];

        if (detail.status === "Có đi làm") {
          presentDays++;
          if (dayOfWeek === 0) {
            // Sunday work is always OT by default
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
        } else if (detail.status === "Không đi làm") {
          if (!isWeekend) {
            absentDays++;
          }
        } else if (detail.status === "Nghỉ phép") {
          leaveDays++;
          presentDays++; // Approved leave is counted as workday ("vẫn tính công")
        } else if (detail.status === "Ngày lễ" || detail.status === "Nghỉ lễ") {
          holidayDays++;
          presentDays++; // Lễ Nhà nước vẫn được tính là 1 ngày công
        }
      });

      result.push({
        employeeName: emp.name,
        role: emp.role,
        department: emp.department,
        totalDays: totalDaysInMonth,
        presentDays,
        absentDays,
        leaveDays,
        holidayDays,
        totalOtHours,
        logs: empLogs,
        dailyDetails,
      });
    });

    return result;
  }, [
    employees,
    timeLogs,
    selectedMonth,
    selectedYear,
    totalDaysInMonth,
    daysInfo,
  ]);

  const filteredReports = useMemo(() => {
    return monthlyReports.filter((r) => {
      const emp = employees.find((e) => e.name === r.employeeName);
      const matchSearch =
        r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.department &&
          r.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp?.displayName &&
          emp.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDept =
        filterDepartment === "Tất cả" ||
        r.department === filterDepartment ||
        (!r.department && filterDepartment === "Chưa phân bổ");
      return matchSearch && matchDept;
    });
  }, [monthlyReports, searchTerm, filterDepartment, employees]);

  
  const handleExportAllOtExcel = useCallback(async () => {
    try {
      setIsExportingOtExcel(true);
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Bang Cham Cong Tang Ca");
      
      // Setup columns
      worksheet.getColumn(1).width = 6;   // STT
      worksheet.getColumn(2).width = 25;  // Ho va ten
      worksheet.getColumn(3).width = 15;  // Ngay/Thang/Nam
      worksheet.getColumn(4).width = 6;   // Thu
      worksheet.getColumn(5).width = 15;  // 6h00 - 22h00
      worksheet.getColumn(6).width = 8;   // So gio
      worksheet.getColumn(7).width = 15;  // 22h00 - 06h00
      worksheet.getColumn(8).width = 8;   // So gio
      worksheet.getColumn(9).width = 30;  // Ly do tang ca

      // Title
      worksheet.mergeCells("A1:I1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = `BẢNG CHẤM CÔNG TĂNG CA CHI TIẾT - THÁNG ${String(selectedMonth).padStart(2, "0")}/${selectedYear}`;
      titleCell.font = { name: "Times New Roman", size: 16, bold: true };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getRow(1).height = 36;

      // Headers (Row 3 and 4)
      worksheet.mergeCells("A3:A4");
      worksheet.getCell("A3").value = "STT";
      worksheet.mergeCells("B3:B4");
      worksheet.getCell("B3").value = "Họ và tên";
      worksheet.mergeCells("C3:C4");
      worksheet.getCell("C3").value = "Ngày/Tháng/Năm";
      worksheet.mergeCells("D3:D4");
      worksheet.getCell("D3").value = "Thứ";
      
      worksheet.mergeCells("E3:H3");
      worksheet.getCell("E3").value = "Thời gian tăng ca";
      
      worksheet.getCell("E4").value = "6h00 - 22h00";
      worksheet.getCell("F4").value = "Số giờ";
      worksheet.getCell("G4").value = "22h00 - 06h00";
      worksheet.getCell("H4").value = "Số giờ";

      worksheet.mergeCells("I3:I4");
      worksheet.getCell("I3").value = "Lý do tăng ca";

      const headerStyle = {
        font: { name: "Times New Roman", size: 11, bold: true },
        alignment: { vertical: "middle" as const, horizontal: "center" as const, wrapText: true },
        fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF2F2F2" } },
        border: {
          top: { style: "thin" as const },
          left: { style: "thin" as const },
          bottom: { style: "thin" as const },
          right: { style: "thin" as const }
        }
      };

      for (let R = 3; R <= 4; R++) {
        worksheet.getRow(R).eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if (colNumber <= 9) {
            cell.style = headerStyle;
          }
        });
      }

      // Add data
      let stt = 1;
      let currentRow = 5;
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

      const otFilteredEmployees = filteredReports.filter((emp) => {
        if (filterDepartment !== "Tất cả" && emp.department !== filterDepartment) return false;
        return true;
      });

      otFilteredEmployees.forEach((report) => {
        for (let d = 1; d <= daysInMonth; d++) {
          const detail = report.dailyDetails[d];
          if (detail && detail.otFrom && detail.otTo) {
            const dateObj = new Date(selectedYear, selectedMonth - 1, d);
            const dayOfWeek = dateObj.getDay();
            const splitInfo = splitOtHours(detail.otFrom, detail.otTo);

            const row = worksheet.getRow(currentRow);
            row.height = 24;
            
            row.getCell(1).value = stt++;
            row.getCell(2).value = getDisplayNameFromList(report.employeeName, !!accessToken, employees);
            row.getCell(3).value = `${String(d).padStart(2, "0")}/${String(selectedMonth).padStart(2, "0")}/${selectedYear}`;
            row.getCell(4).value = dayOfWeek === 0 ? "CN" : dayOfWeek === 6 ? "7" : String(dayOfWeek + 1);
            row.getCell(5).value = splitInfo.dayStr || "";
            row.getCell(6).value = splitInfo.dayHours > 0 ? splitInfo.dayHours : "";
            row.getCell(7).value = splitInfo.nightStr || "";
            row.getCell(8).value = splitInfo.nightHours > 0 ? splitInfo.nightHours : "";
            row.getCell(9).value = detail.note || "";

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              if (colNumber <= 9) {
                cell.font = { name: "Times New Roman", size: 11 };
                cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
                cell.border = {
                  top: { style: "thin" as const },
                  left: { style: "thin" as const },
                  bottom: { style: "thin" as const },
                  right: { style: "thin" as const }
                };
              }
            });
            // Left align name and reason
            row.getCell(2).alignment = { vertical: "middle" as const, horizontal: "left" as const, wrapText: true };
            row.getCell(9).alignment = { vertical: "middle" as const, horizontal: "left" as const, wrapText: true };

            currentRow++;
          }
        }
      });

      // Export
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Bang_Cham_Cong_Tang_Ca_Thang_${selectedMonth}_${selectedYear}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export all OT Excel:", err);
      alert("Có lỗi khi xuất Excel. Vui lòng thử lại.");
    } finally {
      setIsExportingOtExcel(false);
    }
  }, [selectedMonth, selectedYear, filteredReports, filterDepartment, employees, accessToken]);

  const handleExportOtExcel = useCallback(async () => {
    if (!selectedOtEmployee) return;
    try {
      setIsExportingOtExcel(true);
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Phiếu Tăng Ca");

      // Cấu hình bảng
      worksheet.properties.defaultRowHeight = 24;
      worksheet.views = [{ showGridLines: true }];

      // Lấy tên gọi của nhân viên (ví dụ: "Đ Dũng" -> "DŨNG", "Huy Thức" -> "THỨC")
      const cleanName = selectedOtEmployee.trim();
      const nameParts = cleanName.split(/\s+/);
      const callName = nameParts[nameParts.length - 1].toUpperCase();

      // Tiêu đề A1:J1 (merge 10 cột)
      worksheet.mergeCells("A1:J1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = `PHIẾU TĂNG CA CỦA ${callName} THÁNG ${String(selectedMonth).padStart(2, "0")}/${selectedYear}`;
      titleCell.font = { name: "Times New Roman", size: 16, bold: true };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getRow(1).height = 36;

      // Độ rộng cột
      worksheet.getColumn(1).width = 6;   // STT
      worksheet.getColumn(2).width = 15;  // Ngày/Tháng/Năm
      worksheet.getColumn(3).width = 6;   // Thứ
      worksheet.getColumn(4).width = 15;  // 6h00 - 22h00
      worksheet.getColumn(5).width = 8;   // Số giờ
      worksheet.getColumn(6).width = 15;  // 22h00 - 06h00
      worksheet.getColumn(7).width = 8;   // Số giờ
      worksheet.getColumn(8).width = 17;  // Lý do tăng ca (merge H + I)
      worksheet.getColumn(9).width = 17;  // Lý do tăng ca (merge H + I)
      worksheet.getColumn(10).width = 14; // Tổng giờ OT

      // Headers Hàng 3 & 4
      worksheet.mergeCells("A3:A4");
      worksheet.getCell("A3").value = "STT";
      worksheet.mergeCells("B3:B4");
      worksheet.getCell("B3").value = "Ngày/Tháng/Năm";
      worksheet.mergeCells("C3:C4");
      worksheet.getCell("C3").value = "Thứ";
      worksheet.mergeCells("D3:G3");
      worksheet.getCell("D3").value = "Thời gian tăng ca";
      worksheet.mergeCells("H3:I4");
      worksheet.getCell("H3").value = "Lý do tăng ca";
      worksheet.mergeCells("J3:J4");
      worksheet.getCell("J3").value = "Tổng giờ OT";

      worksheet.getCell("D4").value = "6h00 - 22h00";
      worksheet.getCell("E4").value = "Số giờ";
      worksheet.getCell("F4").value = "22h00 - 06h00";
      worksheet.getCell("G4").value = "Số giờ";

      for (let R = 3; R <= 4; R++) {
        worksheet.getRow(R).height = 24;
        for (let C = 1; C <= 10; C++) {
          const cell = worksheet.getRow(R).getCell(C);
          cell.font = { name: "Times New Roman", size: 11, bold: true };
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          cell.border = {
            top: { style: "thin" as const },
            left: { style: "thin" as const },
            bottom: { style: "thin" as const },
            right: { style: "thin" as const },
          };
        }
      }

      const report = monthlyReports.find(r => r.employeeName === selectedOtEmployee);
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

      let rowIdx = 5;
      let totalDayHours = 0;
      let totalNightHours = 0;
      let totalWeekendDayHours = 0;
      let totalWeekendNightHours = 0;
      let totalHolidayDayHours = 0;
      let totalHolidayNightHours = 0;

      const formatHours = (h: number) => {
        if (!h || h <= 0) return "";
        return Number.isInteger(h) ? h : String(h).replace(".", ",");
      };

      for (let d = 1; d <= daysInMonth; d++) {
        if (report && report.dailyDetails[d] && report.dailyDetails[d].otFrom && report.dailyDetails[d].otTo) {
          const detail = report.dailyDetails[d];
          const splitInfo = splitOtHours(detail.otFrom, detail.otTo);
          const sumOt = splitInfo.dayHours + splitInfo.nightHours;

          if (sumOt > 0) {
            const dateObj = new Date(selectedYear, selectedMonth - 1, d);
            const dayOfWeek = dateObj.getDay();
            const dayStr = dayOfWeek === 0 ? "CN" : String(dayOfWeek + 1);

            let reason = otReasons[`${selectedOtEmployee}-${d}`] !== undefined 
              ? otReasons[`${selectedOtEmployee}-${d}`] 
              : (detail.note || "");

            if (dayOfWeek === 0 || dayOfWeek === 6) {
              totalWeekendDayHours += splitInfo.dayHours;
              totalWeekendNightHours += splitInfo.nightHours;
            } else {
              totalDayHours += splitInfo.dayHours;
              totalNightHours += splitInfo.nightHours;
            }

            const row = worksheet.getRow(rowIdx);
            row.height = 24;

            row.getCell(1).value = d; // STT ghi theo ngày như mẫu user gửi
            row.getCell(2).value = `${String(d).padStart(2, "0")}/${String(selectedMonth).padStart(2, "0")}/${selectedYear}`;
            row.getCell(3).value = dayStr;
            row.getCell(4).value = splitInfo.dayStr || "";
            row.getCell(5).value = formatHours(splitInfo.dayHours);
            row.getCell(6).value = splitInfo.nightStr || "";
            row.getCell(7).value = formatHours(splitInfo.nightHours);

            // Merge cột H và I cho Lý do tăng ca
            worksheet.mergeCells(`H${rowIdx}:I${rowIdx}`);
            row.getCell(8).value = reason;

            row.getCell(10).value = formatHours(sumOt);

            for (let C = 1; C <= 10; C++) {
              const cell = row.getCell(C);
              cell.font = { name: "Times New Roman", size: 11 };
              cell.alignment = { vertical: "middle", horizontal: C === 8 ? "left" : "center", wrapText: true };
              cell.border = {
                top: { style: "thin" as const },
                left: { style: "thin" as const },
                bottom: { style: "thin" as const },
                right: { style: "thin" as const },
              };
            }

            rowIdx++;
          }
        }
      }

      // Footer tổng kết
      const summaryStartRow = rowIdx;
      worksheet.getRow(summaryStartRow).height = 24;
      worksheet.getRow(summaryStartRow + 1).height = 24;
      worksheet.getRow(summaryStartRow + 2).height = 24;

      // Hàng 1 của Footer:
      worksheet.mergeCells(`A${summaryStartRow}:C${summaryStartRow + 1}`);
      const sumTitle = worksheet.getCell(`A${summaryStartRow}`);
      sumTitle.value = "Tổng Kết Số Giờ Tăng Ca";
      sumTitle.font = { name: "Times New Roman", size: 11, bold: true };
      sumTitle.alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells(`D${summaryStartRow}:E${summaryStartRow}`);
      worksheet.getCell(`D${summaryStartRow}`).value = "thường";

      worksheet.mergeCells(`F${summaryStartRow}:G${summaryStartRow}`);
      worksheet.getCell(`F${summaryStartRow}`).value = "cuối tuần";

      worksheet.mergeCells(`H${summaryStartRow}:I${summaryStartRow}`);
      worksheet.getCell(`H${summaryStartRow}`).value = "Tết";

      // Hàng 2 của Footer:
      const subHeaderRow = summaryStartRow + 1;
      worksheet.getCell(`D${subHeaderRow}`).value = "6h-22h";
      worksheet.getCell(`E${subHeaderRow}`).value = "22h-6h";
      worksheet.getCell(`F${subHeaderRow}`).value = "6h-22h";
      worksheet.getCell(`G${subHeaderRow}`).value = "22h-6h";
      worksheet.getCell(`H${subHeaderRow}`).value = "6h-22h";
      worksheet.getCell(`I${subHeaderRow}`).value = "22h-6h";

      // Hàng 3 của Footer:
      const valRow = summaryStartRow + 2;
      worksheet.mergeCells(`A${valRow}:C${valRow}`);
      worksheet.getCell(`A${valRow}`).value = "Tổng Số Giờ OT";
      worksheet.getCell(`A${valRow}`).font = { name: "Times New Roman", size: 11, bold: true };
      worksheet.getCell(`A${valRow}`).alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getCell(`D${valRow}`).value = formatHours(totalDayHours) || 0;
      worksheet.getCell(`E${valRow}`).value = formatHours(totalNightHours) || 0;
      worksheet.getCell(`F${valRow}`).value = formatHours(totalWeekendDayHours) || 0;
      worksheet.getCell(`G${valRow}`).value = formatHours(totalWeekendNightHours) || 0;
      worksheet.getCell(`H${valRow}`).value = formatHours(totalHolidayDayHours) || 0;
      worksheet.getCell(`I${valRow}`).value = formatHours(totalHolidayNightHours) || 0;

      // Cột J: Tổng tất cả số giờ OT, merge 3 dòng
      worksheet.mergeCells(`J${summaryStartRow}:J${valRow}`);
      const totalAll = totalDayHours + totalNightHours + totalWeekendDayHours + totalWeekendNightHours + totalHolidayDayHours + totalHolidayNightHours;
      const totalCell = worksheet.getCell(`J${summaryStartRow}`);
      totalCell.value = formatHours(totalAll) || 0;
      totalCell.font = { name: "Times New Roman", size: 11, bold: true };
      totalCell.alignment = { vertical: "middle", horizontal: "center" };

      // Tô màu nền xanh navy và border cho footer
      for (let R = summaryStartRow; R <= valRow; R++) {
        for (let C = 1; C <= 10; C++) {
          const cell = worksheet.getRow(R).getCell(C);
          cell.font = { name: "Times New Roman", size: 11, bold: true };
          cell.border = {
            top: { style: "thin" as const },
            left: { style: "thin" as const },
            bottom: { style: "thin" as const },
            right: { style: "thin" as const },
          };
          if ((R === summaryStartRow || R === subHeaderRow) && C >= 4 && C <= 9) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF203764" } };
            cell.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
          }
          if (R === valRow && C >= 4 && C <= 9) {
            cell.alignment = { vertical: "middle", horizontal: "center" };
          }
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Phieu_Tang_Ca_${callName}_${String(selectedMonth).padStart(2, "0")}_${selectedYear}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export OT Excel:", err);
    } finally {
      setIsExportingOtExcel(false);
    }
  }, [selectedOtEmployee, selectedMonth, selectedYear, monthlyReports, otReasons]);

  const handleExportOtPng = useCallback(async () => {
    if (!otModalRef.current || !selectedOtEmployee) return;
    try {
      setIsExportingOtPng(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const dataUrl = await htmlToImage.toPng(otModalRef.current, {
        quality: 1.0,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const cleanName = selectedOtEmployee.trim();
      const nameParts = cleanName.split(/\s+/);
      const callName = nameParts[nameParts.length - 1].toUpperCase();
      const link = document.createElement("a");
      link.download = `Phieu_Tang_Ca_${callName}_${String(selectedMonth).padStart(2, "0")}_${selectedYear}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export OT PNG:", err);
    } finally {
      setIsExportingOtPng(false);
    }
  }, [selectedOtEmployee, selectedMonth, selectedYear]);

  const groupedFilteredReports = useMemo(() => {
    const groups: Record<string, typeof filteredReports> = {};
    filteredReports.forEach((r) => {
      const dept = r.department || "Chưa phân bổ";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredReports]);

  const getDetailedRestDaysString = useCallback(
    (report: EmployeeMonthlyReport): string => {
      const leaveList: string[] = [];
      const absentList: string[] = [];
      const holidayList: string[] = [];

      daysInfo.forEach(({ day, isWeekend }) => {
        const detail = report.dailyDetails[day];
        if (detail) {
          if (detail.status === "Nghỉ phép") {
            leaveList.push(String(day).padStart(2, "0"));
          } else if (detail.status === "Không đi làm" && !isWeekend) {
            absentList.push(String(day).padStart(2, "0"));
          } else if (detail.status === "Nghỉ lễ") {
            holidayList.push(String(day).padStart(2, "0"));
          }
        }
      });

      const parts: string[] = [];
      if (leaveList.length > 0) {
        parts.push(`Phép: ${leaveList.join(", ")}`);
      }
      if (absentList.length > 0) {
        parts.push(`Vắng: ${absentList.join(", ")}`);
      }
      if (holidayList.length > 0) {
        parts.push(`Lễ: ${holidayList.join(", ")}`);
      }

      if (parts.length === 0) return "-";
      return parts.join(" | ");
    },
    [daysInfo],
  );

  const handleDownloadExcel = useCallback(
    async (deptToExport: string = "Tất cả") => {
      try {
        const reportsToExport = monthlyReports
          .filter((report) => {
            if (deptToExport === "Tất cả") return true;
            if (deptToExport === "Chưa phân bổ") return !report.department;
            return report.department === deptToExport;
          })
          .filter((report) => {
            if (searchTerm) {
              const searchLower = searchTerm.toLowerCase();
              return (
                report.employeeName.toLowerCase().includes(searchLower) ||
                report.role.toLowerCase().includes(searchLower)
              );
            }
            return true;
          });

        const ExcelJS = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Báo Cáo Công Phép");

        const companyHeader = pdfCompanyName || "CÔNG TY SẢN XUẤT";
        const addressHeader =
          pdfAddress || "Địa chỉ: 41 Hoa Đào Phường Cầu Kiệu";
        const leaveTitle = `BÁO CÁO CHẤM CÔNG & PHÉP - THÁNG ${selectedMonth}/${selectedYear}`;

        // 1. Add Company Name
        const row1 = worksheet.addRow([companyHeader]);
        row1.getCell(1).font = {
          name: "Arial",
          size: 12,
          bold: true,
          color: { argb: "1E293B" },
        };

        // 2. Add Address
        const row2 = worksheet.addRow([addressHeader]);
        row2.getCell(1).font = {
          name: "Arial",
          size: 9,
          italic: true,
          color: { argb: "64748B" },
        };

        // 3. Add Empty Row
        worksheet.addRow([]);

        // 4. Add Title Row (Merged cells across columns A to J)
        worksheet.mergeCells("A4:J4");
        const titleCell = worksheet.getCell("A4");
        titleCell.value = leaveTitle;
        titleCell.font = {
          name: "Arial",
          size: 15,
          bold: true,
          color: { argb: "312E81" },
        }; // Indigo-900
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(4).height = 36;

        // 5. Add Empty Row
        worksheet.addRow([]);

        // 6. Add Headers Row manually
        const headers = [
          "STT",
          "Nhân Viên",
          "Chức Vụ",
          "Bộ Phận",
          "Đi Làm (Công)",
          "Vắng Mặt (Ngày)",
          "Nghỉ Có Phép (Ngày)",
          "Chi Tiết Ngày Nghỉ",
          "Tăng Ca OT (Giờ)",
          "Chi Tiết Tăng Ca",
          "Nghỉ Lễ (Ngày)",
        ];
        const headerRow = worksheet.addRow(headers);
        headerRow.height = 28;

        // Style the header cells
        headerRow.eachCell((cell) => {
          cell.font = {
            name: "Arial",
            size: 10,
            bold: true,
            color: { argb: "FFFFFF" },
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "4F46E5" }, // Indigo 600
          };
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          cell.border = {
            top: { style: "medium", color: { argb: "312E81" } },
            left: { style: "thin" as const, color: { argb: "CBD5E1" } },
            bottom: { style: "medium", color: { argb: "312E81" } },
            right: { style: "thin" as const, color: { argb: "CBD5E1" } },
          };
        });

        // Define Column widths
        const colWidths = [8, 25, 20, 18, 16, 16, 18, 32, 18, 45, 16];
        colWidths.forEach((width, index) => {
          worksheet.getColumn(index + 1).width = width;
        });

        // Add Data rows
        reportsToExport.forEach((report, idx) => {
          const leaveDetailsStr = getDetailedRestDaysString(report);
          const otDetailsStr = getOtDaysString(
            report,
            totalDaysInMonth,
            selectedYear,
            selectedMonth,
          );

          const dataRow = worksheet.addRow([
            idx + 1,
            getDisplayNameFromList(report.employeeName, false, employees, true),
            report.role,
            report.department || "-",
            report.presentDays,
            report.absentDays,
            report.leaveDays,
            leaveDetailsStr || "-",
            parseFloat(report.totalOtHours.toFixed(1)),
            otDetailsStr || "-",
            report.holidayDays,
          ]);

          dataRow.height = 24;

          const isEven = idx % 2 === 0;
          const rowBgColor = isEven ? "F8FAFC" : "FFFFFF"; // Slate-50 vs White

          dataRow.eachCell((cell, colNumber) => {
            cell.font = { name: "Arial", size: 10, color: { argb: "334155" } };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: rowBgColor },
            };
            cell.border = {
              top: { style: "thin" as const, color: { argb: "E2E8F0" } },
              left: { style: "thin" as const, color: { argb: "E2E8F0" } },
              bottom: { style: "thin" as const, color: { argb: "E2E8F0" } },
              right: { style: "thin" as const, color: { argb: "E2E8F0" } },
            };

            if (colNumber === 1) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
              cell.font = {
                name: "Arial",
                size: 10,
                bold: true,
                color: { argb: "64748B" },
              };
            } else if (colNumber === 2) {
              cell.alignment = { horizontal: "left", vertical: "middle" };
              cell.font = {
                name: "Arial",
                size: 10,
                bold: true,
                color: { argb: "1E293B" },
              };
            } else if (colNumber === 3) {
              cell.alignment = { horizontal: "left", vertical: "middle" };
            } else if (colNumber === 4) {
              cell.alignment = { horizontal: "left", vertical: "middle" };
            } else if (colNumber === 5) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
              cell.font = {
                name: "Arial",
                size: 10,
                bold: true,
                color: { argb: "059669" },
              }; // Emerald 600
            } else if (colNumber === 6) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
              if (report.absentDays > 0) {
                cell.font = {
                  name: "Arial",
                  size: 10,
                  bold: true,
                  color: { argb: "DC2626" },
                }; // Rose 600
              }
            } else if (colNumber === 7) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
              if (report.leaveDays > 0) {
                cell.font = {
                  name: "Arial",
                  size: 10,
                  bold: true,
                  color: { argb: "D97706" },
                }; // Amber 600
              }
            } else if (colNumber === 8) {
              cell.alignment = {
                horizontal: "left",
                vertical: "middle",
                wrapText: true,
              };
            } else if (colNumber === 9) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
              if (report.totalOtHours > 0) {
                cell.font = {
                  name: "Arial",
                  size: 10,
                  bold: true,
                  color: { argb: "4F46E5" },
                }; // Indigo 600
              }
            } else if (colNumber === 10) {
              cell.alignment = {
                horizontal: "left",
                vertical: "middle",
                wrapText: true,
              };
            } else if (colNumber === 11) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
              if (report.holidayDays > 0) {
                cell.font = {
                  name: "Arial",
                  size: 10,
                  bold: true,
                  color: { argb: "DB2777" },
                }; // Pink 600
              }
            }
          });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Bao_Cao_Cham_Cong_Thang_${selectedMonth}_${selectedYear}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Error exporting excel:", err);
        alert("Có lỗi khi xuất file Excel. Vui lòng thử lại.");
      } finally {
      }
    },
    [
      monthlyReports,
      searchTerm,
      selectedMonth,
      selectedYear,
      totalDaysInMonth,
      getDetailedRestDaysString,
      getOtDaysString,
      pdfCompanyName,
      pdfAddress,
    ],
  );

  // Leave Entitlement and Balance calculation according to Labor Law (1 day per month)
  const leaveReports = useMemo(() => {
    return employees.map((emp) => {
      const calc = recalculateAnnualLeave(
        emp,
        timeLogs,
        selectedYear,
        selectedMonth,
      );
      return {
        employee: emp,
        registeredAtParsed: parseRegisteredDate(emp.registeredAt),
        ...calc,
      };
    });
  }, [employees, timeLogs, selectedYear, selectedMonth]);

  // Leave calculation according to Accountant Thanh Chau's chat chot (2025-2026)
  const accountantLeaveReports = useMemo(() => {
    return employees.map((emp) => {
      const calc = recalculateAnnualLeave(
        emp,
        timeLogs,
        selectedYear,
        selectedMonth,
      );

      return {
        key: emp.name,
        displayName: getEmployeeDisplayName(
          emp.name,
          isAdmin,
          false,
          emp.displayName,
        ), // Using standard name
        category: calc.initialCarryover > 0 ? "Có phép gối đầu" : "Phép chuẩn",
        ruleDesc:
          calc.initialCarryover > 0
            ? `Phép gối đầu: ${calc.initialCarryover} ngày. Phép năm nay: ${calc.baseEntitlement} ngày. Tổng cộng: ${calc.initialCarryover + calc.baseEntitlement} ngày.`
            : `Phép năm nay: ${calc.baseEntitlement} ngày.`,
        totalEntitled: calc.leaveEntitlement,
        usedByChat: calc.leaveUsed, // we trust the system now
        remainingByChat: calc.leaveRemaining,
        chatQuote: "",
        matchedEmployee: emp,
        systemLeaveUsed: calc.leaveUsed,
        systemLeaveLogs: calc.ytdLeaveLogs,
        isMatched: true,
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

    monthlyReports.forEach((r) => {
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
      activeWorkforce,
    };
  }, [monthlyReports, employees]);

  // Chart Data: Attendance status statistics by day
  const chartData = useMemo(() => {
    const data = [];
    const monthStr = String(selectedMonth).padStart(2, "0");

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${selectedYear}-${monthStr}-${String(d).padStart(2, "0")}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
      const isWeekend = dayOfWeek === 0; // Sunday only

      let countPresent = 0;
      let countLeave = 0;
      let countAbsent = 0;
      let countHoliday = 0;

      monthlyReports.forEach((report) => {
        const detail = report.dailyDetails[d];
        if (detail.status === "Có đi làm") countPresent++;
        else if (detail.status === "Nghỉ phép") countLeave++;
        else if (detail.status === "Ngày lễ") countHoliday++;
        else if (detail.status === "Không đi làm" && !isWeekend) countAbsent++;
      });

      // Only plot if there is activity, or weekdays/Saturdays
      if (!isWeekend || countPresent + countLeave + countHoliday > 0) {
        data.push({
          day: `N ${d}`,
          "Đi Làm": countPresent,
          "Nghỉ Phép": countLeave,
          "Nghỉ Lễ": countHoliday,
          "Vắng Mặt": countAbsent,
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

    chartData.forEach((item) => {
      present += item["Đi Làm"] || 0;
      leave += item["Nghỉ Phép"] || 0;
      holiday += item["Nghỉ Lễ"] || 0;
      absent += item["Vắng Mặt"] || 0;
    });

    const total = present + leave + holiday + absent;
    if (total === 0) return [];

    return [
      {
        name: "Đi Làm",
        value: present,
        color: "#10b981",
        percentage: ((present / total) * 100).toFixed(1),
      },
      {
        name: "Nghỉ Phép",
        value: leave,
        color: "#f59e0b",
        percentage: ((leave / total) * 100).toFixed(1),
      },
      {
        name: "Nghỉ Lễ",
        value: holiday,
        color: "#ec4899",
        percentage: ((holiday / total) * 100).toFixed(1),
      },
      {
        name: "Vắng Mặt",
        value: absent,
        color: "#ef4444",
        percentage: ((absent / total) * 100).toFixed(1),
      },
    ].filter((item) => item.value > 0);
  }, [chartData]);

  const toggleExpand = (empName: string) => {
    setExpandedEmployeeName(expandedEmployeeName === empName ? null : empName);
  };

  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((emp) => {
      if (emp.department) depts.add(emp.department);
    });
    return ["Tất cả", ...Array.from(depts), "Chưa phân bổ"];
  }, [employees]);

  // Dedicated OT stats for Material Design 3 cards
  const otStats = useMemo(() => {
    let totalOtHours = 0;
    let dayOtHours = 0;
    let nightOtHours = 0;
    let employeesWithOt = 0;
    let totalSessions = 0;

    filteredReports.forEach((report) => {
      let hasOt = false;
      for (let d = 1; d <= totalDaysInMonth; d++) {
        const detail = report.dailyDetails[d];
        if (detail && detail.otFrom && detail.otTo) {
          hasOt = true;
          totalSessions++;
          const splitInfo = splitOtHours(detail.otFrom, detail.otTo);
          dayOtHours += splitInfo.dayHours;
          nightOtHours += splitInfo.nightHours;
          totalOtHours += (splitInfo.dayHours + splitInfo.nightHours);
        }
      }
      if (hasOt) employeesWithOt++;
    });

    return { totalOtHours, dayOtHours, nightOtHours, employeesWithOt, totalSessions };
  }, [filteredReports, totalDaysInMonth]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Accountant role banner */}
      {role === "accountant" && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900/40 border border-amber-500/20 dark:border-amber-700/30 rounded-[28px] p-4 sm:p-5 shadow-sm backdrop-blur-md flex items-center justify-between gap-2 sm:p-3 sm:gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2 sm:p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-sans font-bold text-sm text-slate-900 dark:text-amber-100">
                  Bộ phận Kế toán & Quản lý Nhân sự
                </h4>
                <span className="px-2.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full font-extrabold uppercase tracking-wider">
                  Chế độ Xem & Xuất Báo Cáo
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-amber-200/80 leading-relaxed">
                Bạn đang ở trung tâm tổng hợp công, quỹ phép và giờ tăng ca OT.
                Chọn tháng/năm bên dưới để xuất file Excel hoặc xem bản in
                PDF/PNG.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Share Link for Accountant */}
      {role === "admin" && (
        <div
          id="share-section"
          className="bg-gradient-to-r from-indigo-50/70 to-sky-50/70 dark:from-indigo-950/30 dark:to-slate-900/30 border border-indigo-100/60 dark:border-indigo-900/40 rounded-[28px] p-4 sm:p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 sm:p-3 sm:gap-4 shadow-sm animate-fadeIn"
        >
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Share2 className="w-4 h-4" />
              </div>
              Liên Liên Kết Chia Sẻ Cho Bộ Phận Kế Toán
            </h4>
            <p className="text-xs text-indigo-700/90 dark:text-indigo-350 leading-relaxed">
              Hãy sao chép liên kết này và gửi cho bộ phận kế toán. Khi truy
              cập, họ sẽ được đưa vào <b>Chế độ Xem Báo Cáo Chấm Công</b> để
              theo dõi công nhật, tăng ca của toàn bộ nhân viên mà không có
              quyền thay đổi dữ liệu của bạn.
            </p>
          </div>
          <button
            onClick={(e) => {
              playConfirmSound();
              handleCopyShareLink();
            }}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold rounded-full text-xs shadow-md hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 active:scale-[0.98] cursor-pointer shrink-0"
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
      {role === "admin" && (
        <div className="bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-100/60 dark:border-emerald-900/30 rounded-[28px] p-4 sm:p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 sm:p-3 sm:gap-4 shadow-sm animate-fadeIn">
          <div className="space-y-1">
            <h4 className="font-sans font-bold text-sm text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              Đồng bộ dữ liệu từ các sheet tháng (JANUARY, FEBRUARY...)
            </h4>
            <p className="text-xs text-emerald-700/90 dark:text-emerald-400 leading-relaxed">
              Nếu bạn vừa cập nhật dữ liệu trực tiếp trên file Google Sheets của
              mình (đặc biệt là các tháng của năm 2026), hãy chạy đồng bộ nâng
              cao để dữ liệu được chuyển đổi đầy đủ vào bảng lịch tổng hợp của
              hệ thống.
            </p>
          </div>
          <button
            onClick={() => {
              const event = new CustomEvent("trigger-advanced-grid-sync");
              window.dispatchEvent(event);
            }}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 animate-pulse" />
            Đồng bộ từ các sheet tháng ngay
          </button>
        </div>
      )}

      {/* Configuration and Date Filter Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-[28px] border border-slate-100 dark:border-slate-800/80 shadow-md flex flex-col sm:flex-row gap-2 sm:p-3 sm:gap-4 sm:p-5 justify-between items-start sm:items-center transition-colors duration-300"
      >
        <div className="flex flex-wrap gap-2 sm:p-3 items-center">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
            <CalendarIcon className="w-4.5 h-4.5" />
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 font-sans">
            Chọn Tháng Báo Cáo:
          </span>
          <select
            value={selectedMonth}
            onChange={(e) => {
              playTabSound();
              setSelectedMonth(Number(e.target.value));
            }}
            className="px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-extrabold cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 shadow-xs transition-colors"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option
                key={i + 1}
                value={i + 1}
                className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
              >
                Tháng {i + 1}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-extrabold cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 shadow-xs transition-colors"
          >
            {years.map((y) => (
              <option
                key={y}
                value={y}
                className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
              >
                Năm {y}
              </option>
            ))}
          </select>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-1.5 sm:p-2.5 w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              playConfirmSound();
              handleDownloadPng();
            }}
            disabled={isDownloadingPng}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 disabled:from-slate-400 disabled:to-slate-500 text-white font-extrabold rounded-full text-xs shadow-md shadow-indigo-100/50 hover:shadow-lg hover:shadow-indigo-500/25 dark:shadow-none transition-all cursor-pointer w-full sm:w-auto"
          >
            {isDownloadingPng ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isDownloadingPng ? "Đang tạo..." : "Tải Dạng PNG"}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              playConfirmSound();
              setShowPdfPreview(true);
            }}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-extrabold rounded-full text-xs shadow-md shadow-rose-100/50 hover:shadow-lg hover:shadow-rose-500/25 dark:shadow-none transition-all cursor-pointer w-full sm:w-auto"
          >
            <Printer className="w-4 h-4" />
            <span>Xem & Tải Báo Cáo (PDF/Excel)</span>
          </motion.button>
        </div>
      </motion.div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] p-4 sm:p-4 sm:p-6 shadow-sm flex items-center gap-2 sm:p-3 sm:gap-4 transition-colors duration-300">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Tổng nhân sự
            </span>
            <span className="text-xl font-bold text-slate-850 dark:text-slate-100 leading-tight block mt-0.5">
              {stats.activeWorkforce} nhân sự
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] p-4 sm:p-4 sm:p-6 shadow-sm flex items-center gap-2 sm:p-3 sm:gap-4 transition-colors duration-300">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Tổng ngày công
            </span>
            <span className="text-xl font-bold text-slate-850 dark:text-slate-100 leading-tight block mt-0.5">
              {stats.totalPresent} ngày công
            </span>
            {stats.totalHoliday > 0 && (
              <span className="block text-[10px] text-pink-600 dark:text-pink-400 font-bold mt-0.5">
                (Bao gồm {stats.totalHoliday} ngày nghỉ lễ Nhà nước)
              </span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] p-4 sm:p-4 sm:p-6 shadow-sm flex items-center gap-2 sm:p-3 sm:gap-4 transition-colors duration-300">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Tổng thời gian OT
            </span>
            <span className="text-xl font-bold text-slate-850 dark:text-slate-100 leading-tight block mt-0.5">
              {stats.totalOtHours.toFixed(1)} giờ
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] p-4 sm:p-4 sm:p-6 shadow-sm flex items-center gap-2 sm:p-3 sm:gap-4 transition-colors duration-300">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Tổng ngày vắng
            </span>
            <span className="text-xl font-bold text-slate-850 dark:text-slate-100 leading-tight block mt-0.5">
              {stats.totalAbsent} ngày vắng
            </span>
          </div>
        </div>
      </div>

      {/* Tab selection for Reports */}
      <div className="flex gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-950/60 rounded-full w-full max-w-2xl mx-auto shadow-sm transition-colors duration-300 border border-slate-200/50 dark:border-slate-850/60">
        <button
          onClick={() => {
            setSubTab("summary");
            setExpandedEmployeeName(null);
          }}
          className={`flex-1 py-2 px-4 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            subTab === "summary"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          📊 Bảng Tổng Hợp Công & OT
        </button>
        <button
          onClick={() => {
            setSubTab("ot");
            setExpandedEmployeeName(null);
          }}
          className={`flex-1 py-2 px-4 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            subTab === "ot"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Chi Tiết Tăng Ca
        </button>
        <button
          onClick={() => {
            setSubTab("calendar");
            setExpandedEmployeeName(null);
          }}
          className={`flex-1 py-2 px-4 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            subTab === "calendar"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          📅 Lịch Chi Tiết Nhân Viên
        </button>
        <button
          onClick={() => {
            setSubTab("leave");
            setExpandedEmployeeName(null);
          }}
          className={`flex-1 py-2 px-4 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            subTab === "leave"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          ⚖️ Tính Ngày Phép (Luật)
        </button>
      </div>

      <AnimatePresence mode="wait">
        {subTab === "ot" && (
          <motion.div
            key="ot"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.4 }}
            className="space-y-6"
          >
            {/* Material Design 3 Overview Cards for OT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/50 rounded-[24px] p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                    Tổng Giờ Tăng Ca
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-indigo-950 dark:text-white">
                    {otStats.totalOtHours.toFixed(1)} <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">giờ</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Tổng thời gian làm thêm tháng {selectedMonth}/{selectedYear}
                  </p>
                </div>
              </div>

              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/50 rounded-[24px] p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
                    Ca Ngày (6h - 22h)
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-xs">
                    <Sun className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {otStats.dayOtHours.toFixed(1)} <span className="text-xs font-bold text-sky-600 dark:text-sky-400">giờ</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Khung giờ chuẩn ban ngày
                  </p>
                </div>
              </div>

              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/50 rounded-[24px] p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                    Ca Đêm (22h - 6h)
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-xs">
                    <Moon className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {otStats.nightOtHours.toFixed(1)} <span className="text-xs font-bold text-purple-600 dark:text-purple-400">giờ</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Phụ cấp làm thêm đêm
                  </p>
                </div>
              </div>

              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/50 rounded-[24px] p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    Nhân Sự Tăng Ca
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {otStats.employeesWithOt} <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">nhân viên</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Tổng {otStats.totalSessions} lượt ca tăng ca
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Table & Cards Container */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-[24px] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-150 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    Bảng Chấm Công Tăng Ca Chi Tiết
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Tháng {selectedMonth}/{selectedYear}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportAllOtExcel}
                    disabled={isExportingOtExcel}
                    className={`flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold text-sm hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors ${isExportingOtExcel ? "opacity-70 cursor-wait" : ""}`}
                  >
                    {isExportingOtExcel ? (
                      <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isExportingOtExcel ? "Đang tải..." : "Xuất Excel"}
                  </button>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto print:overflow-visible">
                <table className="w-full text-sm text-left border-collapse min-w-[900px] print:min-w-0">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      <th
                        rowSpan={2}
                        className="p-3 border-r border-slate-200 dark:border-slate-800 text-center w-12"
                      >
                        STT
                      </th>
                      <th
                        rowSpan={2}
                        className="p-3 border-r border-slate-200 dark:border-slate-800"
                      >
                        Họ và tên
                      </th>
                      <th
                        rowSpan={2}
                        className="p-3 border-r border-slate-200 dark:border-slate-800 text-center"
                      >
                        Ngày/Tháng/Năm
                      </th>
                      <th
                        rowSpan={2}
                        className="p-3 border-r border-slate-200 dark:border-slate-800 text-center"
                      >
                        Thứ
                      </th>
                      <th
                        colSpan={4}
                        className="p-3 border-r border-slate-200 dark:border-slate-800 text-center"
                      >
                        Thời gian tăng ca
                      </th>
                      <th rowSpan={2} className="p-3 border-r border-slate-200 dark:border-slate-800">
                        Lý do tăng ca
                      </th>
                      <th rowSpan={2} className="p-3 text-center w-24">
                        Chi tiết
                      </th>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-center">
                      <th className="p-2 border-r border-slate-200 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400">
                        6h00 - 22h00
                      </th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400">
                        Số giờ
                      </th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-800 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400">
                        22h00 - 06h00
                      </th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-800 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400">
                        Số giờ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(() => {
                      const daysInMonth = new Date(
                        selectedYear,
                        selectedMonth,
                        0,
                      ).getDate();
                      let stt = 1;
                      const rows = [];

                      const otFilteredEmployees = filteredReports.filter(
                        (emp) => {
                          if (
                            filterDepartment !== "Tất cả" &&
                            emp.department !== filterDepartment
                          )
                            return false;
                          return true;
                        },
                      );

                      otFilteredEmployees.forEach((report) => {
                        for (let d = 1; d <= daysInMonth; d++) {
                          const detail = report.dailyDetails[d];
                          if (detail && detail.otFrom && detail.otTo) {
                            const dateObj = new Date(
                              selectedYear,
                              selectedMonth - 1,
                              d,
                            );
                            const dayOfWeek = dateObj.getDay();
                            const splitInfo = splitOtHours(
                              detail.otFrom,
                              detail.otTo,
                            );

                            rows.push(
                              <tr
                                key={`ot-${report.employeeName}-${d}`}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                              >
                                <td className="p-3 border-r border-slate-100 dark:border-slate-800 text-center font-mono text-slate-500">
                                  {stt++}
                                </td>
                                <td className="p-3 border-r border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">
                                  {getDisplayNameFromList(report.employeeName, !!accessToken, employees)}
                                </td>
                                <td className="p-3 border-r border-slate-100 dark:border-slate-800 text-center font-mono text-slate-600 dark:text-slate-400">
                                  {String(d).padStart(2, "0")}/
                                  {String(selectedMonth).padStart(2, "0")}/
                                  {selectedYear}
                                </td>
                                <td className="p-3 border-r border-slate-100 dark:border-slate-800 text-center font-bold text-slate-600 dark:text-slate-400">
                                  {dayOfWeek === 0
                                    ? "CN"
                                    : dayOfWeek === 6
                                      ? "7"
                                      : String(dayOfWeek + 1)}
                                </td>
                                <td className="p-3 border-r border-slate-100 dark:border-slate-800 text-center text-indigo-700 dark:text-indigo-400 font-mono whitespace-pre-wrap">
                                  {splitInfo.dayStr}
                                </td>
                                <td className="p-3 border-r border-slate-100 dark:border-slate-800 text-center font-bold text-indigo-700 dark:text-indigo-400">
                                  {splitInfo.dayHours > 0
                                    ? splitInfo.dayHours
                                    : ""}
                                </td>
                                <td className="p-3 border-r border-slate-100 dark:border-slate-800 text-center text-purple-700 dark:text-purple-400 font-mono whitespace-pre-wrap">
                                  {splitInfo.nightStr}
                                </td>
                                <td className="p-3 border-r border-slate-100 dark:border-slate-800 text-center font-bold text-purple-700 dark:text-purple-400">
                                  {splitInfo.nightHours > 0
                                    ? splitInfo.nightHours
                                    : ""}
                                </td>
                                <td className="p-3 border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 italic">
                                  {detail.note || "-"}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOtEmployee(report.employeeName);
                                    }}
                                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl text-[11px] font-bold shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                    title="Xem chi tiết phiếu tăng ca"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Chi tiết
                                  </button>
                                </td>
                              </tr>,
                            );
                          }
                        }
                      });

                      if (rows.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan={10}
                              className="p-8 text-center text-slate-500 dark:text-slate-400"
                            >
                              Không có dữ liệu tăng ca trong tháng này.
                            </td>
                          </tr>
                        );
                      }
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Responsive Material Design 3 Cards for OT Details */}
              <div className="md:hidden flex flex-col gap-3 p-4">
                {(() => {
                  const otEmployees = filteredReports.filter(
                    (emp) =>
                      (filterDepartment === "Tất cả" || emp.department === filterDepartment) &&
                      emp.totalOtHours > 0,
                  );

                  if (otEmployees.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-400 font-medium bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
                        Không có nhân sự tăng ca trong tháng này.
                      </div>
                    );
                  }

                  return otEmployees.map((report) => {
                    const otString = getOtDaysString(
                      report,
                      totalDaysInMonth,
                      selectedYear,
                      selectedMonth,
                    );
                    return (
                      <div
                        key={`ot-card-${report.employeeName}`}
                        className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/50 rounded-[24px] p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-3 flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0">
                              {report.employeeName.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                                {getDisplayNameFromList(report.employeeName, !!accessToken, employees)}
                              </h4>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                {report.department || "Chưa phân bổ"}
                              </span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-indigo-100/90 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-black">
                            {report.totalOtHours.toFixed(1)}h OT
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/70 p-3.5 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/40 space-y-1">
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-500" /> Chi tiết các ngày làm thêm
                          </div>
                          <div className="font-medium text-[11px] leading-relaxed whitespace-pre-wrap">
                            {otString || "Không có ghi chú ca"}
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => setSelectedOtEmployee(report.employeeName)}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> Chi tiết phiếu OT
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </motion.div>
        )}

        {subTab === "leave" && (
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
                  setLeaveCalcMode("standard");
                  setExpandedEmployeeName(null);
                }}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                  leaveCalcMode === "standard"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                <span>📊</span> Tính Tự Động (Theo Luật)
              </button>
              <button
                onClick={() => {
                  setLeaveCalcMode("accountant");
                  setExpandedEmployeeName(null);
                }}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                  leaveCalcMode === "accountant"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                <span>📑</span> Đối Chiếu Kế Toán
              </button>
            </div>

            {leaveCalcMode === "standard" ? (
              <>
                {/* Law Introduction Panel */}
                <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/70 dark:from-amber-950/20 dark:to-orange-950/15 border border-amber-100/60 dark:border-amber-900/30 rounded-3xl p-4 sm:p-4 sm:p-6 shadow-sm">
                  <h4 className="font-sans font-extrabold text-sm text-amber-950 dark:text-amber-200 flex items-center gap-2 mb-2">
                    <span className="p-1 bg-amber-100 dark:bg-amber-950 rounded-lg">
                      ⚖️
                    </span>
                    Bộ Luật Lao Động: Quy định về Nghỉ phép hằng năm
                  </h4>
                  <div className="text-xs text-amber-800/90 dark:text-amber-350 leading-relaxed space-y-2">
                    <p>
                      Theo quy định tại{" "}
                      <b>Khoản 1 Điều 113 Bộ luật Lao động 2019</b>, người lao
                      động làm việc đủ 12 tháng cho một người sử dụng lao động
                      thì được nghỉ hằng năm hưởng nguyên lương là{" "}
                      <b>12 ngày làm việc</b>. Như vậy, tương đương bình quân
                      mỗi nhân sự được tích lũy{" "}
                      <b>1 ngày nghỉ phép cho mỗi tháng làm việc thực tế</b>.
                    </p>
                    <p>
                      Công thức tự động thâm niên tích lũy phép năm{" "}
                      {selectedYear} (tính đến hết Tháng {selectedMonth}):{" "}
                      <code className="font-mono bg-amber-100/50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded font-bold text-amber-950 dark:text-amber-300">
                        Số ngày phép được hưởng = Số tháng làm việc trong năm{" "}
                        {selectedYear}
                      </code>
                    </p>
                    <div className="mt-3 pt-3 border-t border-amber-200/40 dark:border-amber-900/40 bg-amber-100/25 dark:bg-amber-950/30 p-2 sm:p-3 rounded-xl flex items-start gap-2 text-amber-900 dark:text-amber-300">
                      <span className="text-base">💡</span>
                      <div>
                        <b className="font-bold">
                          Cách thêm/bớt phép trực quan:
                        </b>{" "}
                        Nếu bạn muốn <b>cho thêm ngày nghỉ phép</b> hoặc{" "}
                        <b>xóa bớt ngày nghỉ phép</b> của một nhân viên, bạn chỉ
                        cần vào tab <b>Hồ sơ nhân viên 👥</b>, chọn nút{" "}
                        <b>Chỉnh sửa ✏️</b> rồi điền số ngày mong muốn ở phần{" "}
                        <i>Điều chỉnh ngày phép (+ hoặc -)</i>. Hệ thống sẽ tự
                        động cộng/trừ vào quỹ phép của họ ngay lập tức!
                      </div>
                    </div>
                  </div>
                </div>

                {/* Leave reports Table & Detail list */}
                <div className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] overflow-hidden transition-colors duration-300">
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
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:p-3 sm:gap-4 py-4 border-b border-slate-100 dark:border-slate-800/40 last:border-0 animate-pulse"
                          >
                            <div className="flex items-center gap-2 sm:p-3 w-full sm:w-1/3">
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
                        const isExpanded =
                          expandedEmployeeName ===
                          `leave-${report.employee.name}`;
                        return (
                          <div
                            key={report.employee.name}
                            className="transition-colors hover:bg-slate-50/30 dark:hover:bg-slate-850/10"
                          >
                            {/* Header trigger */}
                            <div
                              onClick={() => {
                                playTabSound();
                                setExpandedEmployeeName(
                                  isExpanded
                                    ? null
                                    : `leave-${report.employee.name}`,
                                );
                              }}
                              className="p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 sm:p-3 sm:gap-4 cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center font-bold text-amber-700 dark:text-amber-400 text-sm">
                                  {report.employee.name.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                    {report.employee.name}
                                  </h4>
                                  <p className="text-xs text-slate-450 dark:text-slate-500">
                                    Chức vụ:{" "}
                                    <span className="font-semibold text-slate-600 dark:text-slate-450">
                                      {report.employee.role}
                                    </span>{" "}
                                    | Vào làm:{" "}
                                    <span className="font-mono text-slate-500 dark:text-slate-400">
                                      {report.employee.registeredAt || "N/A"}
                                    </span>
                                  </p>
                                  {report.leaveRemaining <= 0 && (
                                    <div className="mt-1">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-rose-500 px-2 py-0.5 rounded shadow-sm">
                                        <AlertTriangle className="w-3 h-3" />
                                        {report.leaveRemaining < 0
                                          ? `Vượt quá ${Math.abs(report.leaveRemaining)} ngày`
                                          : "Đã sử dụng hết phép"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 sm:p-2.5 items-center text-xs font-bold">
                                <div className="bg-slate-50 dark:bg-slate-950/40 text-slate-650 dark:text-slate-350 px-3.5 py-1.5 rounded-2xl border border-slate-100/30 flex flex-col items-center min-w-22">
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">
                                    Được hưởng (A)
                                  </span>
                                  <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                                    {report.leaveEntitlement} ngày
                                  </span>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-3.5 py-1.5 rounded-2xl border border-amber-100/30 flex flex-col items-center min-w-22">
                                  <span className="text-[9px] text-amber-455 dark:text-amber-550 uppercase">
                                    Đã nghỉ phép (B)
                                  </span>
                                  <span className="text-sm font-extrabold text-amber-600 dark:text-amber-500">
                                    {report.leaveUsed} ngày
                                  </span>
                                </div>
                                <div
                                  className={`px-3.5 py-1.5 rounded-2xl flex flex-col items-center min-w-22 ${
                                    report.leaveRemaining > 0
                                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/30"
                                      : report.leaveRemaining === 0
                                        ? "bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-450 border border-slate-100/30"
                                        : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100/30"
                                  }`}
                                >
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">
                                    Còn lại (A-B)
                                  </span>
                                  <span className="text-sm font-extrabold">
                                    {report.leaveRemaining} ngày
                                  </span>
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
                              <div className="px-4 sm:px-5 pb-6 pt-2 bg-slate-50/40 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-fadeIn">
                                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-100/40 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800 space-y-2">
                                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                                    ⚖️ Chi tiết tính toán & Reset phép sau Tết
                                    Nguyên Đán {selectedYear}:
                                  </span>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:p-3 text-[11px] font-mono bg-slate-50/50 dark:bg-slate-950/20 p-2 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                                    <div>
                                      <p>
                                        • Quỹ phép cơ bản {selectedYear}:{" "}
                                        <strong className="text-slate-800 dark:text-slate-200">
                                          {report.baseEntitlement} ngày
                                        </strong>
                                      </p>
                                      <p>
                                        • Phép gối đầu 2025 nhận:{" "}
                                        <strong className="text-slate-800 dark:text-slate-200">
                                          {report.initialCarryover} ngày
                                        </strong>
                                      </p>
                                      <p className="text-amber-600 dark:text-amber-400">
                                        • Hạn sử dụng phép gối đầu:{" "}
                                        <strong className="font-extrabold">
                                          Trước Tết Ta (17/02/2026)
                                        </strong>
                                      </p>
                                    </div>
                                    <div>
                                      <p>
                                        • Đã dùng trước Tết Ta:{" "}
                                        <strong className="text-slate-800 dark:text-slate-200">
                                          {report.leaveUsedBeforeTet} ngày
                                        </strong>{" "}
                                        (trừ vào phép 2025)
                                      </p>
                                      <p className="text-rose-500 font-bold">
                                        • Phép 2025 hết hạn (Reset về 0):{" "}
                                        {report.carryoverExpired} ngày
                                      </p>
                                      <p>
                                        • Đã dùng từ sau Tết Ta:{" "}
                                        <strong className="text-slate-800 dark:text-slate-200">
                                          {report.leaveUsedAfterTet} ngày
                                        </strong>{" "}
                                        (trừ vào phép {selectedYear})
                                      </p>
                                    </div>
                                  </div>
                                  <p className="pt-1 text-xs">
                                    Theo quy định mới,{" "}
                                    <strong className="text-slate-800 dark:text-slate-200">
                                      không cộng dồn ngày phép gối đầu sang năm
                                      tiếp theo sau Tết Nguyên Đán
                                    </strong>
                                    . Tổng quỹ phép khả dụng thực tế sau reset
                                    là{" "}
                                    <strong className="text-indigo-600 dark:text-indigo-400">
                                      {report.leaveEntitlement} ngày
                                    </strong>{" "}
                                    (Phép năm {selectedYear} + Phép gối đầu đã
                                    dùng kịp trước Tết). Đã sử dụng tổng cộng{" "}
                                    <strong className="text-slate-800 dark:text-slate-200">
                                      {report.leaveUsed} ngày
                                    </strong>
                                    . Số phép còn lại khả dụng hiện tại là{" "}
                                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                      {report.leaveRemaining} ngày
                                    </strong>
                                    .
                                  </p>
                                </div>

                                <div className="border border-slate-200/50 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40">
                                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 text-[10px] font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                                    Lịch sử sử dụng nghỉ phép cả năm{" "}
                                    {selectedYear}
                                  </div>
                                  <div className="divide-y divide-slate-100 dark:divide-slate-850">
                                    {report.ytdLeaveLogs.length === 0 ? (
                                      <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                                        Chưa có ngày nghỉ phép nào được ghi nhận
                                        trong cả năm {selectedYear}
                                      </div>
                                    ) : (
                                      report.ytdLeaveLogs.map((log, index) => (
                                        <div
                                          key={index}
                                          className="p-2 sm:p-3 text-xs flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-colors"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-[11px] font-bold">
                                              {log.date}
                                            </span>
                                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                                              Lý do: Nghỉ phép năm hưởng lương
                                            </span>
                                          </div>
                                          {log.note && (
                                            <span
                                              className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded max-w-xs truncate"
                                              title={log.note}
                                            >
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
                <div className="bg-slate-950 text-slate-100 rounded-3xl p-4 sm:p-4 sm:p-6 shadow-xl border border-slate-800 space-y-4 font-sans max-w-4xl mx-auto overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-slate-400 font-mono ml-2">
                        Hội thoại chốt phép: Bộ phận Kế toán & Ban quản lý
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-3 py-1 rounded-full border border-amber-500/20">
                      Trích dẫn Zalo/Messenger
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar text-xs">
                    <div className="flex flex-col gap-1 max-w-[88%] bg-slate-900 border border-slate-800/50 rounded-2xl p-3.5 shadow-sm">
                      <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                        👩‍💼 Kế toán{" "}
                        <span className="font-normal text-slate-500 text-[9px] font-mono">
                          16:45
                        </span>
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed space-y-1">
                        <span>
                          e gửi ngày phép của mn của năm 2025 nhá và sang năm sẽ
                          ko gộp này phép nữa nhé mn ơi:
                        </span>
                        <br />
                        <span className="pl-2 block">
                          • a Vũ còn 12 ngày phép
                        </span>
                        <span className="pl-2 block">
                          • a Dũng còn 10 ngày phép
                        </span>
                        <span className="pl-2 block">
                          • a Hảo còn 6 ngày phép
                        </span>
                        <span className="pl-2 block">
                          • a Thuận tháng 6 này a nghỉ lun 2 ngày còn lại của
                          anh là hết rùi nhé
                        </span>
                        <span className="pl-2 block">
                          • Nhi đáng lẽ e ko có nhưng chị vẫn tính cho e dc 6
                          ngày phép nha là e còn 4 ngày phép
                        </span>
                        <span className="pl-2 block">
                          • c Thương chưa làm dc 1 năm nên chưa có ạ
                        </span>
                        <span className="pl-2 block">
                          • a Thức a cũng chưa dc 1 năm nên chưa có ngày phép
                          nhé
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 max-w-[88%] bg-slate-900 border border-slate-800/50 rounded-2xl p-3.5 shadow-sm">
                      <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                        👩‍💼 Kế toán{" "}
                        <span className="font-normal text-slate-500 text-[9px] font-mono">
                          16:55
                        </span>
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed font-semibold text-amber-200">
                        e vừa check lại:
                        <br />
                        <span className="pl-2 block">
                          • chị Thương làm dc 11 tháng thì có 11 phép giờ còn 6
                          phép
                        </span>
                        <span className="pl-2 block">
                          • a Thức làm dc 10 tháng thì a đang có 10 ngày phép
                          nha anh
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 max-w-[88%] bg-slate-900 border border-slate-800/50 rounded-2xl p-3.5 shadow-sm">
                      <div className="border-l-2 border-indigo-500 pl-2 bg-slate-950/40 py-1 rounded mb-2 text-slate-400 text-[11px] italic">
                        <b>@Phạm Thị Anh Nhi:</b> Chị kế toán ơi, phép của em
                        được tính sao á...
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                        👩‍💼 Kế toán{" "}
                        <span className="font-normal text-slate-500 text-[9px] font-mono">
                          17:06
                        </span>
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        do e học việc nên tính theo luật e sẽ ko có ngày phép
                        năm có lương nhưng do e cũng làm dc 1 năm rùi nên cty sẽ
                        6 ngày phép năm nha
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 max-w-[88%] bg-slate-900 border border-slate-800/50 rounded-2xl p-3.5 shadow-sm">
                      <div className="border-l-2 border-indigo-500 pl-2 bg-slate-950/40 py-1 rounded mb-2 text-slate-400 text-[11px] italic">
                        <b>@Thuận Tom:</b> A hỏi tý là nếu a off thêm 2 ngày
                        trong tháng này thì a t...
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                        👩‍💼 Kế toán{" "}
                        <span className="font-normal text-slate-500 text-[9px] font-mono">
                          17:09
                        </span>
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        dạ nếu tính theo năm 2026 thì tới hiện tại tháng 7 này
                        thì a đang có 7 ngày phép nhưng a đã nghỉ 1 ngày trong
                        tháng này thì còn 6 ngày tới tháng 7/2026 này nha anh.
                        tính từ năm 2025 - 7/2026 là 13 ngày anh nghỉ á anh
                      </p>
                    </div>
                  </div>
                </div>

                {/* Accountant Leave Ledger Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] overflow-hidden transition-colors duration-300">
                  <div className="p-6 border-b border-slate-150 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:p-3 sm:gap-4 bg-amber-500/5 dark:bg-amber-950/10">
                    <div>
                      <h3 className="font-sans font-bold text-base text-slate-850 dark:text-slate-100 flex items-center gap-2">
                        <div className="p-1.5 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        Báo Cáo Đối Chiếu Phép Chốt Kế Toán (YTD {selectedYear})
                      </h3>
                      <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
                        So sánh dữ liệu chốt thủ công của Kế toán với Nhật ký
                        chấm công thực tế trên hệ thống.
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
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:p-3 sm:gap-4 py-4 border-b border-slate-100 dark:border-slate-800/40 last:border-0 animate-pulse"
                          >
                            <div className="flex items-center gap-2 sm:p-3 w-full sm:w-1/3">
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
                        const isExpanded =
                          expandedEmployeeName ===
                          `accountant-leave-${report.key}`;
                        const discrepancy =
                          report.usedByChat !== report.systemLeaveUsed;

                        return (
                          <div
                            key={report.key}
                            className="transition-colors hover:bg-slate-50/30 dark:hover:bg-slate-850/10"
                          >
                            {/* Header block */}
                            <div
                              onClick={() => {
                                playTabSound();
                                setExpandedEmployeeName(
                                  isExpanded
                                    ? null
                                    : `accountant-leave-${report.key}`,
                                );
                              }}
                              className="p-4 sm:p-5 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-2 sm:p-3 sm:gap-4 cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-100/60 dark:border-amber-900/40 flex items-center justify-center font-bold text-amber-700 dark:text-amber-400 text-sm">
                                  {report.displayName.charAt(0)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                      {report.displayName}
                                    </h4>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350">
                                      {report.category}
                                    </span>
                                  </div>
                                  {report.remainingByChat <= 0 && (
                                    <div className="mt-1">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-rose-500 px-2 py-0.5 rounded shadow-sm">
                                        <AlertTriangle className="w-3 h-3" />
                                        {report.remainingByChat < 0
                                          ? `Vượt quá ${Math.abs(report.remainingByChat)} ngày`
                                          : "Đã sử dụng hết phép"}
                                      </span>
                                    </div>
                                  )}
                                  <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                                    {report.isMatched ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Khớp nhân sự: "
                                        {report.matchedEmployee?.name}"
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                        Chưa tạo tài khoản hệ thống (Chỉ xem
                                        chốt)
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 sm:p-2.5 items-center text-xs font-bold">
                                <div className="bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-450 px-3.5 py-1.5 rounded-2xl border border-slate-100/30 flex flex-col items-center min-w-22">
                                  <span className="text-[8px] text-slate-400 dark:text-slate-550 uppercase">
                                    Cấp theo chốt
                                  </span>
                                  <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                                    {report.totalEntitled} ngày
                                  </span>
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-3.5 py-1.5 rounded-2xl border border-amber-100/30 flex flex-col items-center min-w-22">
                                  <span className="text-[8px] text-amber-455 dark:text-amber-550 uppercase">
                                    Đã nghỉ (Chốt)
                                  </span>
                                  <span className="text-sm font-extrabold">
                                    {report.usedByChat} ngày
                                  </span>
                                </div>

                                <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3.5 py-1.5 rounded-2xl border border-emerald-100/30 flex flex-col items-center min-w-22">
                                  <span className="text-[8px] text-emerald-500 uppercase">
                                    Đã nghỉ (Hệ thống)
                                  </span>
                                  <span className="text-sm font-extrabold">
                                    {report.systemLeaveUsed} ngày
                                  </span>
                                </div>

                                <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-3.5 py-1.5 rounded-2xl border border-indigo-100/30 flex flex-col items-center min-w-22">
                                  <span className="text-[8px] text-indigo-400 uppercase">
                                    Còn lại (Chốt)
                                  </span>
                                  <span className="text-sm font-extrabold">
                                    {report.remainingByChat} ngày
                                  </span>
                                </div>

                                {/* Verification status badge */}
                                <div
                                  className={`px-3 py-1.5 rounded-2xl font-bold flex items-center gap-1 text-xs min-w-28 justify-center ${
                                    discrepancy
                                      ? "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-100/40"
                                      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30"
                                  }`}
                                >
                                  {discrepancy ? (
                                    <>
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      <span>
                                        Lệch{" "}
                                        {Math.abs(
                                          report.usedByChat -
                                            report.systemLeaveUsed,
                                        )}{" "}
                                        ngày
                                      </span>
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
                              <div className="px-4 sm:px-5 pb-6 pt-2 bg-slate-50/40 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-fadeIn">
                                {/* Explanations */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:p-3 sm:gap-4">
                                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-2">
                                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
                                      💬 Đoạn chốt của Kế toán
                                    </span>
                                    <p className="text-xs italic text-slate-600 dark:text-slate-300 leading-relaxed font-mono bg-slate-50 dark:bg-slate-950 p-2 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                                      "{report.chatQuote}"
                                    </p>
                                  </div>
                                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-2">
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">
                                      📐 Phương án & Quy tắc Tính toán
                                    </span>
                                    <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
                                      {report.ruleDesc}
                                    </p>
                                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 pt-1.5 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-850">
                                      <span>
                                        Trạng thái quỹ phép chốt còn lại:
                                      </span>
                                      <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                                        {report.remainingByChat} ngày khả dụng.
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Real system logs comparison */}
                                <div className="border border-slate-200/50 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40">
                                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 text-[10px] font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider flex justify-between items-center">
                                    <span>
                                      Nhật ký Chấm công thực tế trên Hệ thống
                                      (Tháng 1 - Tháng {selectedMonth}/
                                      {selectedYear})
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-500">
                                      Tìm thấy: {report.systemLeaveUsed} ngày
                                      nghỉ phép
                                    </span>
                                  </div>
                                  <div className="divide-y divide-slate-100 dark:divide-slate-850">
                                    {report.systemLeaveLogs.length === 0 ? (
                                      <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                                        Không tìm thấy ngày nghỉ phép (Nghỉ
                                        phép) nào của {report.displayName} được
                                        ghi nhận trên hệ thống trong khoảng thời
                                        gian này.
                                      </div>
                                    ) : (
                                      report.systemLeaveLogs.map((log, idx) => (
                                        <div
                                          key={idx}
                                          className="p-2 sm:p-3 text-xs flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-colors"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-[11px] font-bold">
                                              {log.date}
                                            </span>
                                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                                              Lý do: Nghỉ phép năm hưởng lương
                                            </span>
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

        {subTab === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.4 }}
            className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] transition-colors duration-300 space-y-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:p-3 sm:gap-4 border-b border-slate-150 dark:border-slate-800 pb-5">
              <div>
                <h3 className="font-sans font-bold text-base text-slate-850 dark:text-slate-100 flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  Bảng Tổng Hợp Công, Nghỉ & Tăng Ca OT Nhân Sự
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
                  Số liệu tổng hợp nhanh phục vụ kế toán tính lương cho Tháng{" "}
                  {selectedMonth}/{selectedYear}.
                </p>
              </div>

              {/* Search Input & Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full sm:w-48 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-150 font-semibold"
                >
                  {uniqueDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

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
            </div>

            <div
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="overflow-x-auto max-h-[550px] overflow-y-auto custom-scrollbar rounded-2xl border border-slate-150 dark:border-slate-800/60 shadow-inner relative"
            >
              <table className="no-swipe hidden md:table min-w-max w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead className="sticky top-0 z-10">
                  <tr className="no-swipe bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 font-extrabold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">
                    <th className="p-2 sm:p-3 text-center w-10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">
                      STT
                    </th>
                    <th className="p-2 sm:p-3 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">
                      Nhân Viên
                    </th>
                    <th className="p-2 sm:p-3 text-center whitespace-nowrap bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">
                      Đi Làm (Công)
                    </th>
                    <th className="p-2 sm:p-3 text-center whitespace-nowrap bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">
                      Vắng Mặt
                    </th>
                    <th className="p-2 sm:p-3 text-center whitespace-nowrap bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">
                      Nghỉ Có Phép
                    </th>
                    <th className="p-2 sm:p-3 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">
                      Chi Tiết Ngày Nghỉ
                    </th>
                    <th className="p-2 sm:p-3 text-center whitespace-nowrap bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">
                      Tăng Ca OT (Giờ)
                    </th>
                    <th className="p-2 sm:p-3 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">
                      Chi Tiết Tăng Ca (OT)
                    </th>
                    <th className="p-2 sm:p-3 text-center whitespace-nowrap bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">
                      Nghỉ Lễ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {!isTableLoaded || isLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-8 text-center text-slate-400"
                      >
                        <div className="flex flex-col items-center justify-center space-y-2 min-h-[250px]">
                          <RandomLoader
                            message="Đang tổng hợp dữ liệu báo cáo..."
                            autoCycle={true}
                            cycleIntervalMs={2000}
                            themeColor="text-indigo-600 dark:text-indigo-400"
                          />
                        </div>
                      </td>
                    </tr>
                  ) : filteredReports.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-8 text-center text-slate-400 font-medium"
                      >
                        Không tìm thấy nhân viên phù hợp
                      </td>
                    </tr>
                  ) : (
                    groupedFilteredReports.map(([dept, reports]) => (
                      <React.Fragment key={dept}>
                        <tr className="bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/60">
                          <td colSpan={9} className="py-4 px-2">
                            <div className="flex items-center gap-3 w-full">
                              <div className="h-[1px] flex-1 bg-indigo-200 dark:bg-indigo-800/50"></div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                  {dept}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold whitespace-nowrap">
                                  {reports.length} nhân sự
                                </span>
                              </div>
                              <div className="h-[1px] flex-1 bg-indigo-200 dark:bg-indigo-800/50"></div>
                            </div>
                          </td>
                        </tr>
                        {reports.map((report, idx) => {
                          const leaveDetailsStr = getLeaveDaysString(
                            report,
                            totalDaysInMonth,
                          );
                          const restDetailsStr =
                            getDetailedRestDaysString(report);
                          const otDetailsStr = getOtDaysString(
                            report,
                            totalDaysInMonth,
                            selectedYear,
                            selectedMonth,
                          );
                          return (
                            <motion.tr
                              key={report.employeeName}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: idx * 0.02 }}
                              className="no-swipe group hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md transition-all duration-150 border-b border-slate-100 dark:border-slate-800/40 last:border-0 font-semibold cursor-pointer relative"
                            >
                              <td className="p-2 sm:p-3 text-center font-bold text-slate-400 dark:text-slate-500 font-mono">
                                {idx + 1}
                              </td>
                              <td className="p-2 sm:p-3 font-extrabold text-slate-900 dark:text-slate-100 text-xs whitespace-nowrap">
                                {getDisplayNameFromList(
                                  report.employeeName,
                                  isAdmin,
                                  employees,
                                )}
                              </td>
                              <td className="p-2 sm:p-3 text-center font-black text-slate-900 dark:text-slate-100 text-xs">
                                {report.presentDays}{" "}
                                <span className="text-[10px] text-slate-400 font-normal">
                                  công
                                </span>
                              </td>
                              <td className="p-2 sm:p-3 text-center text-rose-600 font-semibold text-xs">
                                {report.absentDays}{" "}
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ngày
                                </span>
                              </td>
                              <td className="p-2 sm:p-3 text-center font-bold text-amber-600 dark:text-amber-400 text-xs">
                                {report.leaveDays}{" "}
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ngày
                                </span>
                              </td>
                              <td className="p-2 sm:p-3 text-left">
                                <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px] leading-snug block whitespace-normal break-words max-w-[200px]">
                                  {restDetailsStr}
                                </span>
                              </td>
                              <td className="p-2 sm:p-3 text-center text-violet-600 dark:text-violet-400 font-bold text-xs">
                                {report.totalOtHours.toFixed(1)}h
                              </td>
                              <td className="p-2 sm:p-3 text-left">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className="text-purple-800 dark:text-purple-300 font-semibold text-[11px] leading-snug block whitespace-normal break-words max-w-[240px]">
                                    {otDetailsStr || "-"}
                                  </span>
                                  {report.totalOtHours > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOtEmployee(report.employeeName);
                                      }}
                                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl text-[11px] font-bold shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all inline-flex items-center gap-1.5 mt-1 cursor-pointer"
                                      title="Xem chi tiết phiếu tăng ca"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Chi tiết
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 sm:p-3 text-center text-pink-600 dark:text-pink-400 font-semibold text-xs">
                                {report.holidayDays}{" "}
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ngày
                                </span>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
              <div className="md:hidden flex flex-col gap-3 p-2">
                {!isTableLoaded || isLoading ? (
                  <div className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2 min-h-[250px]">
                      <RandomLoader
                        message="Đang tổng hợp dữ liệu báo cáo..."
                        autoCycle={true}
                        cycleIntervalMs={2000}
                        themeColor="text-indigo-600 dark:text-indigo-400"
                      />
                    </div>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                    Không tìm thấy nhân viên phù hợp
                  </div>
                ) : (
                  groupedFilteredReports.map(([dept, reports]) => (
                    <div key={dept} className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 p-2 pb-0">
                        <div className="w-1 h-3 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                        <h4 className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                          {dept}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[10px] ml-1">
                          {reports.length}
                        </span>
                      </div>
                      {reports.map((report, idx) => {
                        const leaveDetailsStr = getLeaveDaysString(
                          report,
                          totalDaysInMonth,
                        );
                        const restDetailsStr =
                          getDetailedRestDaysString(report);
                        const otDetailsStr = getOtDaysString(
                          report,
                          totalDaysInMonth,
                          selectedYear,
                          selectedMonth,
                        );
                        const isExpanded =
                          expandedEmployeeName === report.employeeName;

                        return (
                          <motion.div
                            key={report.employeeName}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: idx * 0.02 }}
                            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-3"
                          >
                            <div
                              className="flex justify-between items-center cursor-pointer active:scale-[0.98] transition-all"
                              onClick={() =>
                                setExpandedEmployeeName(
                                  expandedEmployeeName === report.employeeName
                                    ? null
                                    : report.employeeName,
                                )
                              }
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-400 text-xs border border-indigo-100/60 dark:border-indigo-900/40 shrink-0">
                                  {idx + 1}
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                                    {getDisplayNameFromList(
                                      report.employeeName,
                                      isAdmin,
                                      employees,
                                    )}
                                  </h4>
                                  <div className="flex items-center gap-3 mt-1 text-[11px] font-bold">
                                    <span className="text-slate-700 dark:text-slate-300">
                                      Công:{" "}
                                      <span className="text-slate-900 dark:text-white font-black">
                                        {report.presentDays}
                                      </span>
                                    </span>
                                    <span className="text-rose-600">
                                      Vắng: {report.absentDays}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400">
                                <svg
                                  className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-1 flex flex-col gap-3 text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-500 font-medium">
                                    Nghỉ có phép
                                  </span>
                                  <span className="font-bold text-amber-600 dark:text-amber-400">
                                    {report.leaveDays} ngày
                                  </span>
                                </div>

                                {restDetailsStr && (
                                  <div className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                                    <span className="text-slate-500 font-medium block mb-1">
                                      Chi tiết ngày nghỉ:
                                    </span>
                                    <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px] leading-snug">
                                      {restDetailsStr}
                                    </span>
                                  </div>
                                )}

                                <div className="flex justify-between items-center">
                                  <span className="text-slate-500 font-medium">
                                    Tăng ca (OT)
                                  </span>
                                  <span className="font-bold text-violet-600 dark:text-violet-400">
                                    {report.totalOtHours.toFixed(1)} giờ
                                  </span>
                                </div>

                                {otDetailsStr && (
                                  <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-[20px] border border-indigo-100/80 dark:border-indigo-900/50 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                        Chi tiết tăng ca (OT):
                                      </span>
                                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">
                                        {report.totalOtHours.toFixed(1)} giờ
                                      </span>
                                    </div>
                                    <span className="text-purple-900 dark:text-purple-300 font-medium text-[11px] leading-snug whitespace-pre-wrap block">
                                      {otDetailsStr}
                                    </span>
                                    <div className="pt-1 flex justify-end">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedOtEmployee(
                                            report.employeeName,
                                          );
                                        }}
                                        className="px-3.5 py-1.5 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5" /> Chi tiết
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <div className="flex justify-between items-center">
                                  <span className="text-slate-500 font-medium">
                                    Nghỉ Lễ
                                  </span>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    {report.holidayDays} ngày
                                  </span>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {subTab === "calendar" && (
          /* Detailed Employee Attendance Grid & Color Calendar */
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.4 }}
            className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(15,23,42,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] overflow-hidden transition-colors duration-300"
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
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:p-3 sm:gap-4 py-4 border-b border-slate-100 dark:border-slate-800/40 last:border-0 animate-pulse"
                    >
                      <div className="flex items-center gap-2 sm:p-3 w-full sm:w-1/3">
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
                  const isExpanded =
                    expandedEmployeeName === report.employeeName;
                  return (
                    <div
                      key={report.employeeName}
                      className="transition-colors hover:bg-slate-50/30 dark:hover:bg-slate-850/10"
                    >
                      {/* Accordion Trigger Header */}
                      <div
                        onClick={() => {
                          playTabSound();
                          toggleExpand(report.employeeName);
                        }}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:p-3 sm:gap-4 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-400 text-sm">
                            {getDisplayNameFromList(
                              report.employeeName,
                              isAdmin,
                              employees,
                            ).charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                              {getDisplayNameFromList(
                                report.employeeName,
                                isAdmin,
                                employees,
                              )}
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {report.role}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:gap-2 sm:p-3 items-center text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-350">
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
                            Hiệu suất:{" "}
                            {(() => {
                              const weekendsCount = Array.from(
                                { length: totalDaysInMonth },
                                (_, i) =>
                                  new Date(
                                    selectedYear,
                                    selectedMonth - 1,
                                    i + 1,
                                  ).getDay(),
                              ).filter((day) => day === 0 || day === 6).length;
                              const workdaysInMonth =
                                totalDaysInMonth -
                                weekendsCount -
                                report.holidayDays;
                              return (
                                Math.round(
                                  (report.presentDays /
                                    (workdaysInMonth > 0
                                      ? workdaysInMonth
                                      : 1)) *
                                    100,
                                ) || 0
                              );
                            })()}
                            %
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
                        <div className="px-4 sm:px-5 pb-6 pt-2 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 space-y-4">
                          {/* Flex Header with legends and Toggle */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:p-3 pt-2 border-b border-slate-100/60 dark:border-slate-800/60 pb-3">
                            {/* Color legends with elegant small status indicator dots */}
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-medium text-slate-500 dark:text-slate-450">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
                                <span>Có đi làm</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-500/10" />
                                <span>Nghỉ phép</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-pink-500 ring-4 ring-pink-500/10" />
                                <span>Ngày lễ nhà nước</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500 ring-4 ring-rose-500/10" />
                                <span>Không đi làm</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-400 ring-4 ring-slate-400/10" />
                                <span>Nghỉ cuối tuần</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full border border-dashed border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-900" />
                                <span>Chưa vào làm</span>
                              </div>
                            </div>

                            {/* View selector buttons */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-800/55 shrink-0 self-end sm:self-auto">
                              <button
                                onClick={() => {
                                  playTabSound();
                                  setCalendarView("grid");
                                }}
                                className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                  calendarView === "grid"
                                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/20"
                                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                                }`}
                                title="Xem dạng Lưới"
                              >
                                Lưới
                              </button>
                              <button
                                onClick={() => {
                                  playTabSound();
                                  setCalendarView("list");
                                }}
                                className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                  calendarView === "list"
                                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/20"
                                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                                }`}
                                title="Xem dạng Danh sách"
                              >
                                Danh sách
                              </button>
                            </div>
                          </div>

                          {/* Content Area with Animation Support */}
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
                                <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800/40 mb-2">
                                  <span>T2</span>
                                  <span>T3</span>
                                  <span>T4</span>
                                  <span>T5</span>
                                  <span>T6</span>
                                  <span>T7</span>
                                  <span className="text-rose-500">CN</span>
                                </div>

                                <div className="grid grid-cols-7 gap-1.5">
                                  {/* Empty spacer cells */}
                                  {Array.from({
                                    length:
                                      new Date(
                                        selectedYear,
                                        selectedMonth - 1,
                                        1,
                                      ).getDay() === 0
                                        ? 6
                                        : new Date(
                                            selectedYear,
                                            selectedMonth - 1,
                                            1,
                                          ).getDay() - 1,
                                  }).map((_, idx) => (
                                    <div
                                      key={`empty-${idx}`}
                                      className="aspect-square rounded-xl bg-slate-50/10 dark:bg-slate-900/5 border border-slate-100/20 dark:border-slate-800/10"
                                    />
                                  ))}

                                  {/* Actual days */}
                                  {Array.from(
                                    { length: totalDaysInMonth },
                                    (_, i) => {
                                      const day = i + 1;
                                      const detail = report.dailyDetails[day];
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
                                      } else if (
                                        detail.status === "Nghỉ phép"
                                      ) {
                                        cellClass =
                                          "bg-amber-500/8 dark:bg-amber-500/12 text-amber-600 dark:text-amber-400 border border-amber-500/15 dark:border-amber-500/25 font-bold shadow-xs";
                                        dotColor = "bg-amber-500";
                                      } else if (detail.status === "Ngày lễ") {
                                        cellClass =
                                          "bg-pink-500/8 dark:bg-pink-500/12 text-pink-600 dark:text-pink-400 border border-pink-500/20 dark:border-pink-500/30 font-bold shadow-xs";
                                        dotColor = "bg-pink-500";
                                      } else if (
                                        detail.status === "Không đi làm"
                                      ) {
                                        cellClass =
                                          "bg-rose-500/8 dark:bg-rose-500/12 text-rose-600 dark:text-rose-400 border border-rose-500/15 dark:border-rose-500/25 font-bold shadow-xs";
                                        dotColor = "bg-rose-500";
                                      } else if (
                                        detail.status === "Chưa vào làm"
                                      ) {
                                        cellClass =
                                          "bg-slate-50/20 dark:bg-slate-900/5 text-slate-350 dark:text-slate-600 border border-dashed border-slate-150 dark:border-slate-800/40";
                                      } else {
                                        cellClass =
                                          "bg-slate-100/50 dark:bg-slate-850/40 text-slate-450 dark:text-slate-500 border border-slate-150/40 dark:border-slate-800/30";
                                      }

                                      const otStr =
                                        detail.otFrom && detail.otTo
                                          ? `OT: ${detail.otFrom}-${detail.otTo}`
                                          : "";
                                      const holidaySuffix = detail.holidayName
                                        ? ` (${detail.holidayName})`
                                        : "";

                                      return (
                                        <div
                                          key={day}
                                          title={`${day}/${selectedMonth} - ${detail.status}${holidaySuffix}\n${otStr}\n${detail.note}`}
                                          className={`aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer relative select-none transition-all duration-150 hover:scale-105 hover:ring-1.5 hover:ring-indigo-500/30 hover:border-indigo-500/40 p-1 ${cellClass}`}
                                        >
                                          <span className="text-xs font-semibold tracking-tight">
                                            {day}
                                          </span>

                                          {/* Elegant status dot */}
                                          {dotColor && (
                                            <span
                                              className={`w-1 h-1 rounded-full ${dotColor} mt-0.5`}
                                            />
                                          )}

                                          {/* OT Label */}
                                          {detail.otFrom && detail.otTo && (
                                            <span className="absolute top-0.5 right-0.5 text-[6.5px] font-extrabold px-0.5 py-0.2 rounded bg-purple-150 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/30">
                                              OT
                                            </span>
                                          )}
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              </motion.div>
                            ) : (
                              /* Grid-based List View representing every day of the month beautifully and compactly */
                              <motion.div
                                key="list-view"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.15 }}
                                className="w-full pt-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:p-3 max-h-[480px] overflow-y-auto pr-1.5 custom-scrollbar"
                              >
                                {Array.from(
                                  { length: totalDaysInMonth },
                                  (_, i) => {
                                    const day = i + 1;
                                    const detail = report.dailyDetails[day];
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
                                    const dayOfWeekStr =
                                      weekdays[dateObj.getDay()];
                                    const isSunday = dateObj.getDay() === 0;

                                    let badgeClass = "";
                                    if (detail.status === "Có đi làm") {
                                      badgeClass =
                                        "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/20";
                                    } else if (detail.status === "Nghỉ phép") {
                                      badgeClass =
                                        "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/20";
                                    } else if (detail.status === "Ngày lễ") {
                                      badgeClass =
                                        "bg-pink-100 dark:bg-pink-950/30 text-pink-700 dark:text-pink-400 border border-pink-200/20";
                                    } else if (
                                      detail.status === "Không đi làm"
                                    ) {
                                      badgeClass =
                                        "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200/20";
                                    } else if (
                                      detail.status === "Chưa vào làm"
                                    ) {
                                      badgeClass =
                                        "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700";
                                    } else {
                                      badgeClass =
                                        "bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border border-slate-200/40";
                                    }

                                    return (
                                      <div
                                        key={day}
                                        className="flex flex-col justify-between p-3.5 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 border border-slate-150/50 dark:border-slate-800/60 rounded-2xl transition-all duration-150 gap-1.5 sm:p-2.5 hover:scale-[1.02] hover:shadow-sm"
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
                                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${badgeClass} truncate max-w-full`}
                                            title={detail.status}
                                          >
                                            {detail.status}
                                            {detail.holidayName
                                              ? ` (${detail.holidayName})`
                                              : ""}
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
                                      </div>
                                    );
                                  },
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Timeline History logs table */}
                          <div className="border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40 mt-4 animate-fadeIn">
                            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                              <span>Lịch Sử Chi Tiết Công Tác Tháng</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                Tổng số: {report.logs.length} bản ghi
                              </span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto font-sans">
                              {report.logs.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                                  Không có dữ liệu trong tháng này
                                </div>
                              ) : (
                                report.logs.map((log, index) => (
                                  <div
                                    key={index}
                                    className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:p-3 hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-colors"
                                  >
                                    <div className="flex flex-wrap gap-1.5 sm:p-2.5 items-center">
                                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">
                                        {log.date}
                                      </span>
                                      <span
                                        className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${
                                          log.status === "Có đi làm"
                                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/30"
                                            : log.status === "Nghỉ phép"
                                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100/30"
                                              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100/30"
                                        }`}
                                      >
                                        {log.status}
                                      </span>
                                    </div>
                                    <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-500 dark:text-slate-400 px-0 sm:px-4">
                                      <div className="flex flex-wrap gap-2 items-center">
                                        {log.otFrom && log.otTo && (
                                          <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 border border-purple-100/20 dark:border-purple-900/20">
                                            <Clock className="w-3 h-3" />
                                            Tăng ca: {log.otFrom} - {log.otTo} (
                                            {calculateOtHours(
                                              log.otFrom,
                                              log.otTo,
                                            ).toFixed(1)}
                                            h)
                                          </span>
                                        )}
                                        {log.note && (
                                          <span
                                            className="text-slate-500 dark:text-slate-400 italic max-w-xs truncate"
                                            title={log.note}
                                          >
                                            "{log.note}"
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Edit & Delete Actions for Admin */}
                                    {role === "admin" && (
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          onClick={() => {
                                            playConfirmSound();
                                            setEditingLog({ ...log });
                                          }}
                                          className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                                          title="Sửa ngày công"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            playConfirmSound();
                                            handleDelete(log);
                                          }}
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
      <AnimatePresence>
        {editingLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 no-swipe bg-slate-950/50 dark:bg-slate-950/85 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5 transition-colors duration-350"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h4 className="font-sans font-bold text-base text-slate-800 dark:text-slate-100">
                    Chỉnh Sửa Ngày Công
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {editingLog.employeeName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    playConfirmSound();
                    setEditingLog(null);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Ngày chấm công
                  </label>
                  <input
                    type="date"
                    required
                    value={editingLog.date}
                    onChange={(e) =>
                      setEditingLog({ ...editingLog, date: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Trạng thái đi làm
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {["Có đi làm", "Không đi làm", "Nghỉ phép", "Nghỉ lễ"].map(
                      (st) => (
                        <label key={st} className="relative cursor-pointer">
                          <input
                            type="radio"
                            name="editStatus"
                            checked={editingLog.status === st}
                            onChange={() =>
                              setEditingLog({
                                ...editingLog,
                                status: st as any,
                              })
                            }
                            className="peer sr-only"
                          />
                          <div
                            className={`py-3 text-center rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                              editingLog.status === st
                                ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800/80 text-indigo-750 dark:text-indigo-400 font-bold"
                                : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20"
                            }`}
                          >
                            {st}
                          </div>
                        </label>
                      ),
                    )}
                  </div>
                </div>

                {/* OT Hours Section */}
                <div className="bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                        Thời gian tăng ca (OT)
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                        Chọn nếu có làm thêm giờ
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!(editingLog.otFrom || editingLog.otTo)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingLog({
                              ...editingLog,
                              otFrom: "18:00",
                              otTo: "21:00",
                            });
                          } else {
                            setEditingLog({
                              ...editingLog,
                              otFrom: "",
                              otTo: "",
                            });
                          }
                        }}
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                    </label>
                  </div>

                  {(editingLog.otFrom || editingLog.otTo) && (
                    <div className="grid grid-cols-2 gap-2 sm:p-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 animate-fadeIn font-mono">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 font-sans">
                          OT Từ
                        </label>
                        <input
                          type="time"
                          value={editingLog.otFrom}
                          onChange={(e) =>
                            setEditingLog({
                              ...editingLog,
                              otFrom: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none font-mono text-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 font-sans">
                          OT Đến
                        </label>
                        <input
                          type="time"
                          value={editingLog.otTo}
                          onChange={(e) =>
                            setEditingLog({
                              ...editingLog,
                              otTo: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none font-mono text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Ghi chú hoặc lí do
                  </label>
                  <input
                    type="text"
                    value={editingLog.note}
                    onChange={(e) =>
                      setEditingLog({ ...editingLog, note: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                    placeholder="Ví dụ: Nghỉ phép năm, đi làm trễ do xe hỏng..."
                  />
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-end gap-1.5 sm:p-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      playConfirmSound();
                      setEditingLog(null);
                    }}
                    className="px-4 sm:px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-full text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isUpdating ? "Đang đồng bộ..." : "Cập nhật dữ liệu"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional Report Preview Modal */}
      <AnimatePresence>
        {/* OT Modal */}
        <AnimatePresence>
          {selectedOtEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
              >
                <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Chi Tiết Tăng Ca:{" "}
                      {getDisplayNameFromList(
                        selectedOtEmployee,
                        !!accessToken,
                        employees,
                      )}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Tháng {selectedMonth}/{selectedYear}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportOtPng}
                      disabled={isExportingOtPng}
                      className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-colors ${isExportingOtPng ? "opacity-70 cursor-wait" : ""}`}
                    >
                      {isExportingOtPng ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4" />
                      )}
                      {isExportingOtPng ? "Đang xuất PNG..." : "Xuất File PNG"}
                    </button>
                    <button
                      onClick={handleExportOtExcel}
                      disabled={isExportingOtExcel}
                      className={`flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition-colors ${isExportingOtExcel ? "opacity-70 cursor-wait" : ""}`}
                    >
                      {isExportingOtExcel ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      {isExportingOtExcel ? "Đang xuất Excel..." : "Xuất Excel"}
                    </button>
                    <button
                      onClick={() => setSelectedOtEmployee(null)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-950/20 relative">
                  {/* Wrap in ref for capturing PNG */}
                  <div
                    ref={otModalRef}
                    className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none"
                  >
                    {(() => {
                      const cleanName = (selectedOtEmployee || "").trim();
                      const nameParts = cleanName.split(/\s+/);
                      const callName = nameParts[nameParts.length - 1].toUpperCase();
                      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
                      const report = filteredReports.find(r => r.employeeName === selectedOtEmployee);

                      const otRows: any[] = [];
                      let totalDayHours = 0;
                      let totalNightHours = 0;
                      let totalWeekendDayHours = 0;
                      let totalWeekendNightHours = 0;
                      let totalHolidayDayHours = 0;
                      let totalHolidayNightHours = 0;

                      const formatHours = (h: number) => {
                        if (!h || h <= 0) return "";
                        return Number.isInteger(h) ? h : String(h).replace(".", ",");
                      };

                      if (report) {
                        for (let d = 1; d <= daysInMonth; d++) {
                          const detail = report.dailyDetails[d];
                          if (detail && detail.otFrom && detail.otTo) {
                            const splitInfo = splitOtHours(detail.otFrom, detail.otTo);
                            const sumOt = splitInfo.dayHours + splitInfo.nightHours;
                            if (sumOt > 0) {
                              const dateObj = new Date(selectedYear, selectedMonth - 1, d);
                              const dayOfWeek = dateObj.getDay();
                              const dayStr = dayOfWeek === 0 ? "CN" : String(dayOfWeek + 1);

                              if (dayOfWeek === 0 || dayOfWeek === 6) {
                                totalWeekendDayHours += splitInfo.dayHours;
                                totalWeekendNightHours += splitInfo.nightHours;
                              } else {
                                totalDayHours += splitInfo.dayHours;
                                totalNightHours += splitInfo.nightHours;
                              }

                              otRows.push({
                                d,
                                dateStr: `${String(d).padStart(2, "0")}/${String(selectedMonth).padStart(2, "0")}/${selectedYear}`,
                                dayStr,
                                splitInfo,
                                sumOt,
                                note: detail.note || ""
                              });
                            }
                          }
                        }
                      }

                      const totalAll = totalDayHours + totalNightHours + totalWeekendDayHours + totalWeekendNightHours + totalHolidayDayHours + totalHolidayNightHours;

                      return (
                        <>
                          <div className="text-center mb-6">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide font-sans">
                              PHIẾU TĂNG CA CỦA {callName} THÁNG {String(selectedMonth).padStart(2, "0")}/{selectedYear}
                            </h2>
                          </div>

                          <table className="w-full text-sm text-left border-collapse border border-slate-300 dark:border-slate-700">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-center">
                                <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 w-12">
                                  STT
                                </th>
                                <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 whitespace-nowrap">
                                  Ngày/Tháng/Năm
                                </th>
                                <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 w-12">
                                  Thứ
                                </th>
                                <th colSpan={4} className="p-2 border border-slate-300 dark:border-slate-700">
                                  Thời gian tăng ca
                                </th>
                                <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 min-w-[180px]">
                                  Lý do tăng ca
                                </th>
                                <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 w-24">
                                  Tổng giờ OT
                                </th>
                              </tr>
                              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-center text-xs">
                                <th className="p-2 border border-slate-300 dark:border-slate-700">
                                  6h00 - 22h00
                                </th>
                                <th className="p-2 border border-slate-300 dark:border-slate-700 w-16">
                                  Số giờ
                                </th>
                                <th className="p-2 border border-slate-300 dark:border-slate-700">
                                  22h00 - 06h00
                                </th>
                                <th className="p-2 border border-slate-300 dark:border-slate-700 w-16">
                                  Số giờ
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {otRows.length === 0 ? (
                                <tr>
                                  <td colSpan={9} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                    Nhân viên này không có dữ liệu tăng ca trong tháng.
                                  </td>
                                </tr>
                              ) : (
                                otRows.map((r) => (
                                  <tr key={`modal-${r.d}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-center font-mono text-slate-700 dark:text-slate-300">
                                      {r.d}
                                    </td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-center font-mono text-slate-700 dark:text-slate-300">
                                      {r.dateStr}
                                    </td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-300">
                                      {r.dayStr}
                                    </td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-center font-mono text-slate-700 dark:text-slate-300">
                                      {r.splitInfo.dayStr || ""}
                                    </td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-center font-bold text-slate-800 dark:text-slate-200">
                                      {formatHours(r.splitInfo.dayHours)}
                                    </td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-center font-mono text-slate-700 dark:text-slate-300">
                                      {r.splitInfo.nightStr || ""}
                                    </td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-center font-bold text-slate-800 dark:text-slate-200">
                                      {formatHours(r.splitInfo.nightHours)}
                                    </td>
                                    <td className="p-1 border border-slate-300 dark:border-slate-700">
                                      <input
                                        type="text"
                                        placeholder="Nhập lý do tăng ca..."
                                        value={otReasons[`${selectedOtEmployee}-${r.d}`] !== undefined ? otReasons[`${selectedOtEmployee}-${r.d}`] : r.note}
                                        onChange={(e) => setOtReasons(prev => ({...prev, [`${selectedOtEmployee}-${r.d}`]: e.target.value}))}
                                        className="w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 rounded px-2 py-1 text-sm outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-200"
                                      />
                                    </td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-center font-bold text-slate-800 dark:text-slate-200">
                                      {formatHours(r.sumOt)}
                                    </td>
                                  </tr>
                                ))
                              )}

                              {otRows.length > 0 && (
                                <>
                                  {/* Hàng 1 của Footer: Tổng kết */}
                                  <tr className="font-bold">
                                    <td rowSpan={2} colSpan={3} className="p-2 border border-slate-300 dark:border-slate-700 text-center align-middle bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                                      Tổng Kết Số Giờ Tăng Ca
                                    </td>
                                    <td colSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 text-center bg-[#203764] text-white">
                                      thường
                                    </td>
                                    <td colSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 text-center bg-[#203764] text-white">
                                      cuối tuần
                                    </td>
                                    <td colSpan={1} className="p-2 border border-slate-300 dark:border-slate-700 text-center bg-[#203764] text-white">
                                      Tết
                                    </td>
                                    <td rowSpan={3} className="p-2 border border-slate-300 dark:border-slate-700 text-center align-middle font-black text-base text-slate-900 dark:text-white bg-slate-50/80 dark:bg-slate-900/80">
                                      {formatHours(totalAll) || 0}
                                    </td>
                                  </tr>

                                  {/* Hàng 2 của Footer: Ca con */}
                                  <tr className="font-bold text-xs bg-[#203764] text-white">
                                    <td className="p-1.5 border border-slate-300 dark:border-slate-700 text-center">6h-22h</td>
                                    <td className="p-1.5 border border-slate-300 dark:border-slate-700 text-center">22h-6h</td>
                                    <td className="p-1.5 border border-slate-300 dark:border-slate-700 text-center">6h-22h</td>
                                    <td className="p-1.5 border border-slate-300 dark:border-slate-700 text-center">22h-6h</td>
                                    <td className="p-1.5 border border-slate-300 dark:border-slate-700 text-center">6h-22h / 22h-6h</td>
                                  </tr>

                                  {/* Hàng 3 của Footer: Số giờ */}
                                  <tr className="font-bold text-center bg-white dark:bg-slate-900">
                                    <td colSpan={3} className="p-2 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                                      Tổng Số Giờ OT
                                    </td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-700">{formatHours(totalDayHours) || 0}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-700">{formatHours(totalNightHours) || 0}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-700">{formatHours(totalWeekendDayHours) || 0}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-700">{formatHours(totalWeekendNightHours) || 0}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-700">
                                      {formatHours(totalHolidayDayHours + totalHolidayNightHours) || 0}
                                    </td>
                                  </tr>
                                </>
                              )}
                            </tbody>
                          </table>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {showPdfPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 no-swipe bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs z-50 overflow-y-auto p-4 md:p-8 flex items-start justify-center print-preview-modal-overlay"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-slate-50 dark:bg-slate-950 w-full max-w-[1340px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800/80 overflow-hidden my-4 print-preview-modal-card"
            >
              {/* Header / Control Bar (no-print) */}
              <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:p-3 sm:gap-4 no-print">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-600 dark:text-rose-400">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-100">
                      Trung Tâm Xem Trước & Xuất Báo Cáo Chấm Công
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Tháng {selectedMonth}/{selectedYear} - Thiết kế cho kế
                      toán lưu trữ
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:p-2.5 w-full sm:w-auto justify-end no-print">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      playConfirmSound();
                      handleDownloadPng();
                    }}
                    disabled={isDownloadingPng}
                    className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-full text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isDownloadingPng ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isDownloadingPng ? "Đang tạo ảnh..." : "Tải dạng PNG"}
                    </span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      playConfirmSound();
                      handleDownloadExcel();
                    }}
                    className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Tải dạng Excel</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      playConfirmSound();
                      window.print();
                    }}
                    className="px-4.5 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-full text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In Báo Cáo</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      playConfirmSound();
                      setShowPdfPreview(false);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Đóng</span>
                  </motion.button>
                </div>
              </div>

              {/* Scrollable Printable container & side-editor */}
              <div className="flex flex-col lg:flex-row bg-slate-100 dark:bg-slate-900/40 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-850">
                {/* Left Column: Side-editor (no-print) */}
                <div className="w-full lg:w-76 shrink-0 p-4 sm:p-4 sm:p-6 bg-white dark:bg-slate-950 no-print space-y-4">
                  <div className="border-b border-slate-150 dark:border-slate-800 pb-3">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-rose-500" />
                      <span>Chỉnh sửa thông tin PDF</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Thay đổi nhanh tiêu đề, địa chỉ và thông tin liên lạc trên
                      bản in
                    </p>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Tên Đơn Vị / Công Ty
                      </label>
                      <input
                        type="text"
                        value={pdfCompanyName}
                        onChange={(e) =>
                          handleUpdatePdfConfig(
                            "pdf_company_name",
                            e.target.value,
                            setPdfCompanyName,
                          )
                        }
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Địa Chỉ Doanh Nghiệp
                      </label>
                      <textarea
                        rows={3}
                        value={pdfAddress}
                        onChange={(e) =>
                          handleUpdatePdfConfig(
                            "pdf_address",
                            e.target.value,
                            setPdfAddress,
                          )
                        }
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Hotline & Email
                      </label>
                      <input
                        type="text"
                        value={pdfHotlineEmail}
                        onChange={(e) =>
                          handleUpdatePdfConfig(
                            "pdf_hotline_email",
                            e.target.value,
                            setPdfHotlineEmail,
                          )
                        }
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Tiêu Đề Bản Báo Cáo
                      </label>
                      <input
                        type="text"
                        value={pdfReportTitle}
                        onChange={(e) =>
                          handleUpdatePdfConfig(
                            "pdf_report_title",
                            e.target.value,
                            setPdfReportTitle,
                          )
                        }
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Mã Số Tài Liệu (Doc Code)
                      </label>
                      <input
                        type="text"
                        value={pdfDocumentCode}
                        onChange={(e) =>
                          handleUpdatePdfConfig(
                            "pdf_document_code",
                            e.target.value,
                            setPdfDocumentCode,
                          )
                        }
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Dòng ngày tháng năm ký
                      </label>
                      <input
                        type="text"
                        value={pdfDateString}
                        onChange={(e) =>
                          handleUpdatePdfConfig(
                            "pdf_date_string",
                            e.target.value,
                            setPdfDateString,
                          )
                        }
                        placeholder="Ví dụ: Hà Nội, ngày 11 tháng 07 năm 2026"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Paper Representation */}
                <div className="flex-1 p-4 md:p-8 overflow-x-auto flex justify-center bg-slate-100 dark:bg-slate-900/40">
                  {/* Paper representation (styled bg-white for screen, and print-report-container class for media query print) */}
                  <div
                    ref={reportRef}
                    className="print-report-container w-full max-w-[297mm] min-h-[210mm] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-8 sm:p-10 shadow-md rounded-lg font-sans border border-slate-200 dark:border-slate-800 transition-colors"
                  >
                    {/* Letterhead */}
                    <div className="flex justify-between items-start border-b-2 border-slate-900 dark:border-slate-800 pb-4">
                      <div>
                        <h4 className="font-extrabold text-[13px] tracking-wider text-slate-900 dark:text-white uppercase">
                          {pdfCompanyName}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">
                          {pdfAddress}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">
                          {pdfHotlineEmail}
                        </p>
                      </div>
                      <div className="text-right">
                        <h5 className="font-bold text-[11px] uppercase tracking-wider text-slate-900 dark:text-slate-200">
                          MẪU BÁO CÁO CHUẨN
                        </h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">
                          Mã tài liệu: {pdfDocumentCode}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">
                          Liên kết: Nhân Sự
                        </p>
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
                        (Phục vụ đối chiếu chấm công, tính lương và lưu trữ hồ
                        sơ kế toán hằng tháng)
                      </p>
                    </div>

                    {/* Report Metadata */}
                    <div className="grid grid-cols-2 gap-2 sm:p-3 sm:gap-4 bg-slate-50 dark:bg-slate-900/40 p-4.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 mb-6">
                      <div className="space-y-1.5">
                        <p>
                          <b className="text-slate-900 dark:text-slate-200">
                            Bộ phận:
                          </b>{" "}
                          {filterDepartment === "Tất cả"
                            ? "Tất cả các phòng ban"
                            : filterDepartment}
                        </p>
                        <p>
                          <b className="text-slate-900 dark:text-slate-200">
                            Kỳ báo cáo:
                          </b>{" "}
                          Tháng {selectedMonth}/{selectedYear}
                        </p>
                        <p>
                          <b className="text-slate-900 dark:text-slate-200">
                            Số lượng nhân sự:
                          </b>{" "}
                          {stats.activeWorkforce} nhân viên
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <p>
                          <b className="text-slate-900 dark:text-slate-200">
                            Ngày kết xuất:
                          </b>{" "}
                          {new Date().toLocaleDateString("vi-VN")} (Giờ Việt
                          Nam)
                        </p>
                        <p>
                          <b className="text-slate-900 dark:text-slate-200">
                            Trạng thái:
                          </b>{" "}
                          Đã đồng bộ từ Google Sheets
                        </p>
                        <p>
                          <b className="text-slate-900 dark:text-slate-200">
                            Đơn vị tính:
                          </b>{" "}
                          Ngày công / Giờ (OT)
                        </p>
                      </div>
                    </div>

                    {/* KPIs summary */}
                    <div className="grid grid-cols-4 gap-2 sm:p-3 text-center mb-8">
                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-2 sm:p-3 bg-slate-50/50 dark:bg-slate-900/20">
                        <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Tổng công đi làm
                        </span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white mt-1 block">
                          {stats.totalPresent}{" "}
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            công
                          </span>
                        </span>
                      </div>
                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-2 sm:p-3 bg-slate-50/50 dark:bg-slate-900/20">
                        <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Tổng ngày nghỉ phép
                        </span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white mt-1 block">
                          {stats.totalLeave}{" "}
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            ngày
                          </span>
                        </span>
                      </div>
                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-2 sm:p-3 bg-slate-50/50 dark:bg-slate-900/20">
                        <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Tổng giờ tăng ca OT
                        </span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white mt-1 block">
                          {stats.totalOtHours.toFixed(1)}{" "}
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            giờ
                          </span>
                        </span>
                      </div>
                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-2 sm:p-3 bg-slate-50/50 dark:bg-slate-900/20">
                        <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Tổng ngày vắng mặt
                        </span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white mt-1 block">
                          {stats.totalAbsent}{" "}
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            ngày
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Detailed Table */}
                    <div
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      className="mb-8 overflow-x-auto max-h-[450px] overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-800/80 relative"
                    >
                      <table className="no-swipe w-full min-w-[500px] sm:min-w-0 text-left border-collapse text-[11px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="no-swipe bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">
                            <th className="p-1.5 sm:p-2.5 text-center w-10 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">
                              STT
                            </th>
                            <th className="p-1.5 sm:p-2.5 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">
                              Họ và Tên
                            </th>
                            <th className="p-1.5 sm:p-2.5 text-center whitespace-nowrap bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">
                              Đi làm (công)
                            </th>
                            <th className="p-1.5 sm:p-2.5 text-center whitespace-nowrap bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">
                              Vắng mặt
                            </th>
                            <th className="p-1.5 sm:p-2.5 text-center whitespace-nowrap bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">
                              Nghỉ phép
                            </th>
                            <th className="p-1.5 sm:p-2.5 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">
                              Chi tiết ngày nghỉ
                            </th>
                            <th className="p-1.5 sm:p-2.5 text-center whitespace-nowrap bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">
                              Tăng ca OT
                            </th>
                            <th className="p-1.5 sm:p-2.5 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">
                              Chi tiết tăng ca (OT)
                            </th>
                            <th className="p-1.5 sm:p-2.5 text-center whitespace-nowrap bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0">
                              Nghỉ lễ
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                          {groupedFilteredReports.map(([dept, reports]) => (
                            <React.Fragment key={dept}>
                              <tr className="bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/60">
                                <td colSpan={9} className="py-4 px-2">
                                  <div className="flex items-center gap-3 w-full">
                                    <div className="h-[1px] flex-1 bg-indigo-200 dark:bg-indigo-800/50"></div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                        {dept}
                                      </span>
                                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold whitespace-nowrap">
                                        {reports.length} nhân sự
                                      </span>
                                    </div>
                                    <div className="h-[1px] flex-1 bg-indigo-200 dark:bg-indigo-800/50"></div>
                                  </div>
                                </td>
                              </tr>
                              {reports.map((report, idx) => {
                                const restDetailsStr =
                                  getDetailedRestDaysString(report);
                                const otDetailsStr = getOtDaysString(
                                  report,
                                  totalDaysInMonth,
                                  selectedYear,
                                  selectedMonth,
                                );
                                return (
                                  <tr
                                    key={report.employeeName}
                                    className="no-swipe group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800/40 last:border-0 cursor-pointer relative"
                                  >
                                    <td className="p-1.5 sm:p-2.5 text-center font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-black font-mono transition-colors">
                                      {idx + 1}
                                    </td>
                                    <td className="p-1.5 sm:p-2.5 font-extrabold text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-black text-xs transition-colors">
                                      {getDisplayNameFromList(
                                        report.employeeName,
                                        false,
                                        employees,
                                        true,
                                      )}
                                    </td>
                                    <td className="p-1.5 sm:p-2.5 text-center font-black text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-black transition-colors">
                                      {report.presentDays}
                                    </td>
                                    <td className="p-1.5 sm:p-2.5 text-center text-rose-600 dark:text-rose-400 group-hover:text-rose-700 dark:group-hover:text-rose-800 font-semibold transition-colors">
                                      {report.absentDays}
                                    </td>
                                    <td className="p-1.5 sm:p-2.5 text-center font-bold text-amber-700 dark:text-amber-500 group-hover:text-amber-800 dark:group-hover:text-amber-700 transition-colors">
                                      {report.leaveDays}
                                    </td>
                                    <td className="p-1.5 sm:p-2.5 text-left text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-black font-medium text-[10px] whitespace-normal break-words max-w-[220px] transition-colors">
                                      {restDetailsStr}
                                    </td>
                                    <td className="p-1.5 sm:p-2.5 text-center text-violet-600 dark:text-violet-400 group-hover:text-violet-800 dark:group-hover:text-violet-950 font-bold transition-colors">
                                      {report.totalOtHours.toFixed(1)}h
                                    </td>
                                    <td className="p-1.5 sm:p-2.5 text-left text-purple-850 dark:text-purple-300 group-hover:text-purple-950 dark:group-hover:text-purple-950 font-semibold text-[10px] whitespace-normal break-words max-w-[280px] transition-colors">
                                      {otDetailsStr}
                                    </td>
                                    <td className="p-1.5 sm:p-2.5 text-center text-pink-700 dark:text-pink-400 group-hover:text-pink-900 dark:group-hover:text-pink-800 font-semibold transition-colors">
                                      {report.holidayDays}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Law / Explanatory section */}
                    <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl mb-12 text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed space-y-1">
                      <p>
                        <b>Ghi chú quy chế tính toán:</b>
                      </p>
                      <p>
                        - Tăng ca (OT) được tổng hợp tự động từ giờ
                        check-in/check-out tăng ca đăng ký trên hệ thống của
                        nhân viên.
                      </p>
                      <p>
                        - Dữ liệu được bảo mật và tự động ghi dấu hoạt động
                        (Audit Logs) trên hệ thống khi xuất bản.
                      </p>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offscreen printable container for immediate PNG/PDF exports without forcing modal open */}
      <div className="fixed top-0 -left-[9999px] z-[-9999] w-[1122px] overflow-hidden pointer-events-none bg-white">
        <div
          ref={hiddenReportRef}
          className="print-report-container w-[1122px] min-h-[794px] bg-white text-slate-900 p-10 shadow-md font-sans border border-slate-200"
        >
          {/* Letterhead */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <h4 className="font-extrabold text-[13px] tracking-wider text-slate-900 uppercase">
                {pdfCompanyName}
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">
                {pdfAddress}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                {pdfHotlineEmail}
              </p>
            </div>
            <div className="text-right">
              <h5 className="font-bold text-[11px] uppercase tracking-wider text-slate-900">
                MẪU BÁO CÁO CHUẨN
              </h5>
              <p className="text-[10px] text-slate-500 font-medium">
                Mã tài liệu: {pdfDocumentCode}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Liên kết: Nhân Sự
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-8 space-y-1.5">
            <h2 className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 uppercase">
              {pdfReportTitle}
            </h2>
            <p className="text-xs font-bold text-slate-600 uppercase">
              Tháng {selectedMonth} năm {selectedYear}
            </p>
            <p className="text-[10px] italic text-slate-400">
              (Phục vụ đối chiếu chấm công, tính lương và lưu trữ hồ sơ kế toán
              hằng tháng)
            </p>
          </div>

          {/* Report Metadata */}
          <div className="grid grid-cols-2 gap-2 sm:p-3 sm:gap-4 bg-slate-50 p-4.5 rounded-xl text-xs text-slate-700 border border-slate-100 mb-6">
            <div className="space-y-1.5">
              <p>
                <b className="text-slate-900">Bộ phận:</b>{" "}
                {filterDepartment === "Tất cả"
                  ? "Tất cả các phòng ban"
                  : filterDepartment}
              </p>
              <p>
                <b className="text-slate-900">Kỳ báo cáo:</b> Tháng{" "}
                {selectedMonth}/{selectedYear}
              </p>
              <p>
                <b className="text-slate-900">Số lượng nhân sự:</b>{" "}
                {stats.activeWorkforce} nhân viên
              </p>
            </div>
            <div className="space-y-1.5">
              <p>
                <b className="text-slate-900">Ngày kết xuất:</b>{" "}
                {new Date().toLocaleDateString("vi-VN")} (Giờ Việt Nam)
              </p>
              <p>
                <b className="text-slate-900">Trạng thái:</b> Đã đồng bộ từ
                Google Sheets
              </p>
              <p>
                <b className="text-slate-900">Đơn vị tính:</b> Ngày công / Giờ
                (OT)
              </p>
            </div>
          </div>

          {/* KPIs summary */}
          <div className="grid grid-cols-4 gap-2 sm:p-3 text-center mb-8">
            <div className="border border-slate-200/80 rounded-xl p-2 sm:p-3 bg-slate-50/50">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                Tổng công đi làm
              </span>
              <span className="text-base font-extrabold text-slate-900 mt-1 block">
                {stats.totalPresent}{" "}
                <span className="text-[10px] font-medium text-slate-500">
                  công
                </span>
              </span>
            </div>
            <div className="border border-slate-200/80 rounded-xl p-2 sm:p-3 bg-slate-50/50">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                Tổng ngày nghỉ phép
              </span>
              <span className="text-base font-extrabold text-slate-900 mt-1 block">
                {stats.totalLeave}{" "}
                <span className="text-[10px] font-medium text-slate-500">
                  ngày
                </span>
              </span>
            </div>
            <div className="border border-slate-200/80 rounded-xl p-2 sm:p-3 bg-slate-50/50">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                Tổng giờ tăng ca OT
              </span>
              <span className="text-base font-extrabold text-slate-900 mt-1 block">
                {stats.totalOtHours.toFixed(1)}{" "}
                <span className="text-[10px] font-medium text-slate-500">
                  giờ
                </span>
              </span>
            </div>
            <div className="border border-slate-200/80 rounded-xl p-2 sm:p-3 bg-slate-50/50">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                Tổng ngày vắng mặt
              </span>
              <span className="text-base font-extrabold text-slate-900 mt-1 block">
                {stats.totalAbsent}{" "}
                <span className="text-[10px] font-medium text-slate-500">
                  ngày
                </span>
              </span>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 relative overflow-x-auto">
            <table className="no-swipe w-full min-w-max text-left border-collapse text-[11px] whitespace-nowrap">
              <thead>
                <tr className="no-swipe bg-slate-100 border-b border-slate-200 font-bold text-slate-700 text-[10px] uppercase">
                  <th className="p-1.5 sm:p-2.5 text-center w-10">STT</th>
                  <th className="p-1.5 sm:p-2.5">Họ và Tên</th>
                  <th className="p-1.5 sm:p-2.5 text-center whitespace-nowrap">
                    Đi làm (công)
                  </th>
                  <th className="p-1.5 sm:p-2.5 text-center whitespace-nowrap">
                    Vắng mặt
                  </th>
                  <th className="p-1.5 sm:p-2.5 text-center whitespace-nowrap">
                    Nghỉ phép
                  </th>
                  <th className="p-1.5 sm:p-2.5">Chi tiết ngày nghỉ</th>
                  <th className="p-1.5 sm:p-2.5 text-center">Tăng ca OT</th>
                  <th className="p-1.5 sm:p-2.5">Chi tiết tăng ca (OT)</th>
                  <th className="p-1.5 sm:p-2.5 text-center">Nghỉ lễ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {groupedFilteredReports.map(([dept, reports]) => (
                  <React.Fragment key={dept}>
                    <tr className="bg-slate-50/40 border-b border-slate-100">
                      <td colSpan={9} className="py-4 px-2">
                        <div className="flex items-center gap-3 w-full">
                          <div className="h-[1px] flex-1 bg-indigo-200"></div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                              {dept}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold whitespace-nowrap">
                              {reports.length} nhân sự
                            </span>
                          </div>
                          <div className="h-[1px] flex-1 bg-indigo-200"></div>
                        </div>
                      </td>
                    </tr>
                    {reports.map((report, idx) => {
                      const restDetailsStr = getDetailedRestDaysString(report);
                      const otDetailsStr = getOtDaysString(
                        report,
                        totalDaysInMonth,
                        selectedYear,
                        selectedMonth,
                      );
                      return (
                        <tr
                          key={report.employeeName}
                          className="no-swipe border-b border-slate-100"
                        >
                          <td className="p-1.5 sm:p-2.5 text-center font-bold text-slate-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="p-1.5 sm:p-2.5 font-extrabold text-slate-900 text-xs">
                            {getDisplayNameFromList(
                              report.employeeName,
                              false,
                              employees,
                              true,
                            )}
                          </td>
                          <td className="p-1.5 sm:p-2.5 text-center font-black text-slate-900">
                            {report.presentDays}
                          </td>
                          <td className="p-1.5 sm:p-2.5 text-center text-rose-600 font-semibold">
                            {report.absentDays}
                          </td>
                          <td className="p-1.5 sm:p-2.5 text-center font-bold text-amber-700">
                            {report.leaveDays}
                          </td>
                          <td className="p-1.5 sm:p-2.5 text-left text-slate-700 font-medium text-[10px] whitespace-normal break-words max-w-[220px]">
                            {restDetailsStr}
                          </td>
                          <td className="p-1.5 sm:p-2.5 text-center text-violet-600 font-bold">
                            {report.totalOtHours.toFixed(1)}h
                          </td>
                          <td className="p-1.5 sm:p-2.5 text-left text-purple-850 font-semibold text-[10px] whitespace-normal break-words max-w-[280px]">
                            {otDetailsStr}
                          </td>
                          <td className="p-1.5 sm:p-2.5 text-center text-pink-700 font-semibold">
                            {report.holidayDays}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Law / Explanatory section */}
          <div className="p-2 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl mb-12 text-[9px] text-slate-500 leading-relaxed space-y-1">
            <p>
              <b>Ghi chú quy chế tính toán:</b>
            </p>
            <p>
              - Tăng ca (OT) được tổng hợp tự động từ giờ check-in/check-out
              tăng ca đăng ký trên hệ thống của nhân viên.
            </p>
            <p>
              - Dữ liệu được bảo mật và tự động ghi dấu hoạt động (Audit Logs)
              trên hệ thống khi xuất bản.
            </p>
          </div>

          {/* Signature Block */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="text-right text-xs font-bold text-slate-700 pr-4">
              <span>{pdfDateString}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
export default ReportsTab;
