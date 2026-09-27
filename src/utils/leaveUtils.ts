import { Employee, TimeLog } from "../types";

export function parseRegisteredDate(dateStr: string) {
  if (!dateStr || dateStr.trim() === "" || dateStr.includes("Chưa")) {
    return { day: 1, month: 1, year: 2026 };
  }
  try {
    if (dateStr.includes("/")) {
      const parts = dateStr.trim().split("/");
      return {
        day: parseInt(parts[0], 10) || 1,
        month: parseInt(parts[1], 10) || 1,
        year: parseInt(parts[2], 10) || 2026,
      };
    } else if (dateStr.includes("-")) {
      const parts = dateStr.trim().split("-");
      return {
        year: parseInt(parts[0], 10) || 2026,
        month: parseInt(parts[1], 10) || 1,
        day: parseInt(parts[2], 10) || 1,
      };
    }
  } catch {
    return { day: 1, month: 1, year: 2026 };
  }
  return { day: 1, month: 1, year: 2026 };
}

// Map of Tet boundaries for each year.
// Any leave taken BEFORE this date in the currentYear can use carryover.
export const TET_DATES: Record<number, string> = {
  2025: "2025-01-29", // Example
  2026: "2026-02-17",
  2027: "2027-02-06",
  2028: "2028-01-26",
  2029: "2029-02-13",
  2030: "2030-02-02",
};

export function recalculateAnnualLeave(
  emp: Employee,
  timeLogs: TimeLog[],
  targetYear: number,
  targetMonth?: number, // Optional: if provided, cap the accrual up to this month
) {
  const realDate = new Date();
  const realYear = realDate.getFullYear();
  const realMonth = realDate.getMonth() + 1;

  let capMonth = 12;
  if (targetYear === realYear) {
    // If we're looking at the current year, the entitlement grows month by month.
    // If targetMonth is provided, we cap at that month, otherwise we cap at the current real month.
    capMonth =
      targetMonth !== undefined ? Math.min(targetMonth, realMonth) : realMonth;
  } else if (targetYear > realYear) {
    // Future years get 0 entitlement so far
    capMonth = 0;
  } else {
    // Past years got the full 12 months (or up to targetMonth if specified)
    capMonth = targetMonth !== undefined ? targetMonth : 12;
  }

  let monthsWorkedInSelectedYear = capMonth;
  const rDate = parseRegisteredDate(emp.registeredAt);

  if (rDate) {
    if (rDate.year > targetYear) {
      monthsWorkedInSelectedYear = 0;
    } else if (rDate.year === targetYear) {
      monthsWorkedInSelectedYear = Math.max(0, capMonth - rDate.month + 1);
    }
  }

  const initialCarryover = (() => {
    if (targetYear === 2026) {
      if (emp.leaveCarryover !== undefined) return emp.leaveCarryover;
      const nameLower = emp.name.toLowerCase();
      if (nameLower.includes("vũ") || nameLower.includes("vu")) return 12;
      if (nameLower.includes("dũng") || nameLower.includes("dung")) return 10;
      if (nameLower.includes("hảo") || nameLower.includes("hao")) return 6;
      return 0;
    } else if (targetYear > 2026) {
      // Đệ quy để tính số phép tồn của năm trước đó
      const prevYearData = recalculateAnnualLeave(
        emp,
        timeLogs,
        targetYear - 1,
        12,
      );
      return Math.max(0, prevYearData.leaveRemaining); // Không cho phép tồn số âm
    } else {
      return 0;
    }
  })();

  // Robustness: If they have carryover, they were employed before 2026, so they get full capMonth
  if (initialCarryover > 0 && monthsWorkedInSelectedYear < capMonth) {
    monthsWorkedInSelectedYear = capMonth;
  }

  const rLeft = emp.leftAt ? parseRegisteredDate(emp.leftAt) : null;
  if (rLeft) {
    if (rLeft.year < targetYear) {
      monthsWorkedInSelectedYear = 0;
    } else if (rLeft.year === targetYear) {
      const startMonth =
        rDate && rDate.year === targetYear && initialCarryover === 0
          ? rDate.month
          : 1;
      const endMonth = Math.min(rLeft.month, capMonth);
      monthsWorkedInSelectedYear = Math.max(0, endMonth - startMonth + 1);
    }
  }

  const ytdLeaveLogsAll = timeLogs
    .filter((log) => {
      const [y] = log.date.split("-");
      const logYear = parseInt(y, 10);
      return (
        log.employeeName === emp.name &&
        log.status === "Nghỉ phép" &&
        logYear === targetYear
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const seenDates = new Set();
  const ytdLeaveLogs = ytdLeaveLogsAll.filter((log) => {
    if (seenDates.has(log.date)) return false;
    seenDates.add(log.date);
    return true;
  });

  const tetDate = TET_DATES[targetYear] || `${targetYear}-02-15`; // Fallback
  const beforeTetLogs = ytdLeaveLogs.filter((log) => log.date < tetDate);
  const onOrAfterTetLogs = ytdLeaveLogs.filter((log) => log.date >= tetDate);
  const leaveUsedBeforeTet = beforeTetLogs.length;
  const leaveUsedAfterTet = onOrAfterTetLogs.length;
  const carryoverUsed = Math.min(initialCarryover, leaveUsedBeforeTet);
  const carryoverExpired = initialCarryover - carryoverUsed;
  const excessBeforeTet = Math.max(0, leaveUsedBeforeTet - initialCarryover);
  const leaveUsed = ytdLeaveLogs.length;

  let baseEntitlement = 0;
  if (emp.leaveAllowance !== undefined) {
    // If specific leave allowance exists, typically applied directly or prorated
    if (emp.leaveAllowance > 0 && emp.leaveAllowance <= 3) {
      baseEntitlement = emp.leaveAllowance * monthsWorkedInSelectedYear;
    } else {
      baseEntitlement = emp.leaveAllowance;
    }
  } else {
    baseEntitlement = Math.min(12, monthsWorkedInSelectedYear);
  }

  const leaveEntitlement = baseEntitlement + carryoverUsed;

  const leaveRemaining = leaveEntitlement - leaveUsed;

  // Add console log for tracing calculation logic
  console.log(`[Leave Calc] ${emp.name} - Year ${targetYear}:`, {
    initialCarryover,
    carryoverUsed,
    excessBeforeTet,
    leaveUsedBeforeTet,
    leaveUsedAfterTet,
    baseEntitlement,
    leaveEntitlement,
    leaveUsed,
    leaveRemaining,
  });

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
    leaveUsedAfterTet,
    tetDate,
  };
}
