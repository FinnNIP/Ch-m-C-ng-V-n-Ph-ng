// Vietnam Public Holidays lookup utility
// Supports solar holidays (fixed dates) and lunar holidays (pre-calculated for 2024-2030)

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

// Fixed solar holidays
const SOLAR_HOLIDAYS: { [key: string]: string } = {
  "01-01": "Tết Dương Lịch",
  "30-04": "Giải phóng Miền Nam",
  "01-05": "Quốc tế Lao động",
  "02-09": "Quốc khánh",
  "03-09": "Quốc khánh (Nghỉ thêm)"
};

// Pre-calculated Lunar Holidays for Vietnam (Tết Nguyên Đán & Giỗ tổ Hùng Vương)
// Keys are formatted as "YYYY-MM-DD"
const LUNAR_HOLIDAYS: { [dateStr: string]: string } = {
  // --- 2024 ---
  "2024-02-08": "Tết Nguyên Đán (29 Tết)",
  "2024-02-09": "Tết Nguyên Đán (30 Tết)",
  "2024-02-10": "Tết Nguyên Đán (Mùng 1 Tết)",
  "2024-02-11": "Tết Nguyên Đán (Mùng 2 Tết)",
  "2024-02-12": "Tết Nguyên Đán (Mùng 3 Tết)",
  "2024-02-13": "Tết Nguyên Đán (Mùng 4 Tết)",
  "2024-02-14": "Tết Nguyên Đán (Mùng 5 Tết)",
  "2024-04-18": "Giỗ tổ Hùng Vương (10/03 Âm lịch)",

  // --- 2025 ---
  "2025-01-27": "Tết Nguyên Đán (28 Tết)",
  "2025-01-28": "Tết Nguyên Đán (29 Tết)",
  "2025-01-29": "Tết Nguyên Đán (Mùng 1 Tết)",
  "2025-01-30": "Tết Nguyên Đán (Mùng 2 Tết)",
  "2025-01-31": "Tết Nguyên Đán (Mùng 3 Tết)",
  "2025-02-01": "Tết Nguyên Đán (Mùng 4 Tết)",
  "2025-02-02": "Tết Nguyên Đán (Mùng 5 Tết)",
  "2025-04-07": "Giỗ tổ Hùng Vương (10/03 Âm lịch)",

  // --- 2026 ---
  "2026-02-15": "Tết Nguyên Đán (28 Tết)",
  "2026-02-16": "Tết Nguyên Đán (29 Tết)",
  "2026-02-17": "Tết Nguyên Đán (Mùng 1 Tết)",
  "2026-02-18": "Tết Nguyên Đán (Mùng 2 Tết)",
  "2026-02-19": "Tết Nguyên Đán (Mùng 3 Tết)",
  "2026-02-20": "Tết Nguyên Đán (Mùng 4 Tết)",
  "2026-02-21": "Tết Nguyên Đán (Mùng 5 Tết)",
  "2026-04-26": "Giỗ tổ Hùng Vương (10/03 Âm lịch)",

  // --- 2027 ---
  "2027-02-05": "Tết Nguyên Đán (29 Tết)",
  "2027-02-06": "Tết Nguyên Đán (Mùng 1 Tết)",
  "2027-02-07": "Tết Nguyên Đán (Mùng 2 Tết)",
  "2027-02-08": "Tết Nguyên Đán (Mùng 3 Tết)",
  "2027-02-09": "Tết Nguyên Đán (Mùng 4 Tết)",
  "2027-02-10": "Tết Nguyên Đán (Mùng 5 Tết)",
  "2027-02-11": "Tết Nguyên Đán (Nghỉ bù Tết)",
  "2027-04-16": "Giỗ tổ Hùng Vương (10/03 Âm lịch)",

  // --- 2028 ---
  "2028-01-25": "Tết Nguyên Đán (28 Tết)",
  "2028-01-26": "Tết Nguyên Đán (29 Tết)",
  "2028-01-27": "Tết Nguyên Đán (Mùng 1 Tết)",
  "2028-01-28": "Tết Nguyên Đán (Mùng 2 Tết)",
  "2028-01-29": "Tết Nguyên Đán (Mùng 3 Tết)",
  "2028-01-30": "Tết Nguyên Đán (Mùng 4 Tết)",
  "2028-01-31": "Tết Nguyên Đán (Mùng 5 Tết)",
  "2028-05-04": "Giỗ tổ Hùng Vương (10/03 Âm lịch)",

  // --- 2029 ---
  "2029-02-11": "Tết Nguyên Đán (28 Tết)",
  "2029-02-12": "Tết Nguyên Đán (29 Tết)",
  "2029-02-13": "Tết Nguyên Đán (Mùng 1 Tết)",
  "2029-02-14": "Tết Nguyên Đán (Mùng 2 Tết)",
  "2029-02-15": "Tết Nguyên Đán (Mùng 3 Tết)",
  "2029-02-16": "Tết Nguyên Đán (Mùng 4 Tết)",
  "2029-02-17": "Tết Nguyên Đán (Mùng 5 Tết)",
  "2029-04-23": "Giỗ tổ Hùng Vương (10/03 Âm lịch)",

  // --- 2030 ---
  "2030-02-01": "Tết Nguyên Đán (29 Tết)",
  "2030-02-02": "Tết Nguyên Đán (30 Tết)",
  "2030-02-03": "Tết Nguyên Đán (Mùng 1 Tết)",
  "2030-02-04": "Tết Nguyên Đán (Mùng 2 Tết)",
  "2030-02-05": "Tết Nguyên Đán (Mùng 3 Tết)",
  "2030-02-06": "Tết Nguyên Đán (Mùng 4 Tết)",
  "2030-02-07": "Tết Nguyên Đán (Mùng 5 Tết)",
  "2030-04-12": "Giỗ tổ Hùng Vương (10/03 Âm lịch)"
};

/**
 * Check if a date is a Vietnam Public Holiday and return its name.
 * @param dateStr Date string in "YYYY-MM-DD" format
 * @returns string containing the holiday name, or null if not a holiday
 */
export function getVietnamHolidayName(dateStr: string): string | null {
  if (!dateStr) return null;

  // 1. Check Lunar pre-calculated list (highest priority for precise naming)
  if (LUNAR_HOLIDAYS[dateStr]) {
    return LUNAR_HOLIDAYS[dateStr];
  }

  // 2. Check Solar fixed list (match MM-DD)
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const mmDd = `${parts[1]}-${parts[2]}`;
      if (SOLAR_HOLIDAYS[mmDd]) {
        return SOLAR_HOLIDAYS[mmDd];
      }
    }
  } catch (e) {
    console.error("Lỗi khi kiểm tra ngày lễ:", e);
  }

  return null;
}
