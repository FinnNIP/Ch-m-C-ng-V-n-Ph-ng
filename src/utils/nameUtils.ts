/**
 * Helper to format Vietnamese employee names and handle custom export names.
 */

export function getStoredExportNames(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem('export_names') || '{}');
  } catch {
    return {};
  }
}

export function saveStoredExportName(fullName: string, exportName: string): void {
  try {
    const dict = getStoredExportNames();
    const trimmedFull = fullName.trim();
    if (!exportName || !exportName.trim()) {
      delete dict[trimmedFull];
    } else {
      dict[trimmedFull] = exportName.trim();
    }
    localStorage.setItem('export_names', JSON.stringify(dict));
  } catch (e) {
    console.error('Error saving export name:', e);
  }
}

export function formatGuestName(fullName: string): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();

  // Common Vietnamese family surnames to strip if present at start
  const surnames = [
    "Phạm Thị Anh", "Phạm Thị", "Phạm Văn", "Phạm", 
    "Nguyễn Thị", "Nguyễn Văn", "Nguyễn Huy", "Nguyễn",
    "Trần Thị", "Trần Văn", "Trần", 
    "Lê Thị", "Lê Văn", "Lê",
    "Phan Thị", "Phan Văn", "Phan", 
    "Vũ Thị", "Vũ Văn", "Vũ",
    "Võ Thị", "Võ Văn", "Võ",
    "Đặng Thị", "Đặng Văn", "Đặng",
    "Bùi Thị", "Bùi Văn", "Bùi", 
    "Đỗ Thị", "Đỗ Văn", "Đỗ",
    "Hồ Thị", "Hồ Văn", "Hồ", 
    "Ngô Thị", "Ngô Văn", "Ngô",
    "Dương Thị", "Dương Văn", "Dương", 
    "Lý Thị", "Lý Văn", "Lý",
    "Huỳnh Thị", "Huỳnh Văn", "Huỳnh", 
    "Đào Thị", "Đào Văn", "Đào",
    "Đoàn Thị", "Đoàn Văn", "Đoàn", 
    "Hoàng Thị", "Hoàng Văn", "Hoàng",
    "Mai Thị", "Mai Văn", "Mai", 
    "Trịnh Thị", "Trịnh Văn", "Trịnh",
    "Đinh Thị", "Đinh Văn", "Đinh", 
    "Lâm Thị", "Lâm Văn", "Lâm"
  ];

  for (const s of surnames) {
    if (trimmed.toLowerCase().startsWith(s.toLowerCase() + ' ')) {
      const rest = trimmed.slice(s.length).trim();
      if (rest.length > 0) return rest;
    }
  }

  // Fallback for names with 3+ words: drop the first word (surname)
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 3) {
    return parts.slice(1).join(' ');
  }

  return trimmed;
}

/**
 * Returns the exact export / display name for PNG, PDF, Excel, or Guest views.
 */
export function getExportName(fullName: string, customDisplayName?: string): string {
  if (!fullName) return '';
  if (customDisplayName && customDisplayName.trim().length > 0) {
    return customDisplayName.trim();
  }
  const trimmed = fullName.trim();
  const dict = getStoredExportNames();
  
  if (dict[trimmed] && dict[trimmed].trim().length > 0) {
    return dict[trimmed].trim();
  }

  return formatGuestName(trimmed);
}

/**
 * Returns formatted employee name based on role or context.
 * @param fullName Full employee name set by Admin
 * @param isAdmin Whether the viewer is Admin
 * @param forExport Whether this is for exporting to PNG/PDF/Excel
 * @param customDisplayName Optional explicit display name override
 */
export function getEmployeeDisplayName(
  fullName: string,
  isAdmin: boolean,
  forExport: boolean = false,
  customDisplayName?: string
): string {
  // 1. If a custom display name is explicitly set by the user, always use it.
  if (customDisplayName && customDisplayName.trim().length > 0) {
    return customDisplayName.trim();
  }

  // 2. If a custom display name is stored in local storage, always use it.
  const dict = getStoredExportNames();
  const trimmed = fullName.trim();
  if (dict[trimmed] && dict[trimmed].trim().length > 0) {
    return dict[trimmed].trim();
  }

  // 3. Fallbacks when NO custom name is defined:
  if (forExport) {
    return formatGuestName(trimmed);
  }
  if (isAdmin) {
    return fullName;
  }
  return formatGuestName(trimmed);
}

/**
 * Returns formatted employee name by searching in employees list for custom displayName.
 */
export function getDisplayNameFromList(
  fullName: string,
  isAdmin: boolean,
  employees?: { name: string; displayName?: string }[],
  forExport: boolean = false
): string {
  const emp = employees?.find(e => e.name.trim().toLowerCase() === fullName.trim().toLowerCase());
  return getEmployeeDisplayName(fullName, isAdmin, forExport, emp?.displayName);
}
