import { Employee, TimeLog } from './types';

export function recordEmployeeAction(employeeName: string) {
  if (typeof window === 'undefined') return;
  try {
    const records = JSON.parse(localStorage.getItem('employee_last_actions') || '{}');
    records[employeeName.trim()] = new Date().toISOString();
    localStorage.setItem('employee_last_actions', JSON.stringify(records));
  } catch(e) {}
}

export function recordMultipleEmployeeActions(employeeNames: string[]) {
  if (typeof window === 'undefined') return;
  try {
    const records = JSON.parse(localStorage.getItem('employee_last_actions') || '{}');
    const now = new Date().toISOString();
    for (const name of employeeNames) {
      records[name.trim()] = now;
    }
    localStorage.setItem('employee_last_actions', JSON.stringify(records));
  } catch(e) {}
}

export const DEFAULT_SPREADSHEET_ID = "1WBVOBjsnSOEGKwTuKzf1LVH0ErOdzmAUKk2Bg9MtoTs";

export function getSpreadsheetId(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('custom_spreadsheet_id');
    if (saved) return saved;
  }
  return DEFAULT_SPREADSHEET_ID;
}

export function setSpreadsheetId(id: string) {
  if (typeof window !== 'undefined') {
    if (id) {
      localStorage.setItem('custom_spreadsheet_id', id);
    } else {
      localStorage.removeItem('custom_spreadsheet_id');
    }
  }
}

export function extractSpreadsheetId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  if (/^[a-zA-Z0-9-_]{15,}$/.test(urlOrId)) {
    return urlOrId;
  }
  return null;
}


// Helper to make authenticated Google API requests
async function googleFetch(url: string, accessToken: string, options: RequestInit = {}) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { 
    cache: 'no-store',
    ...options, 
    headers 
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }
  return response.json();
}

/**
 * Checks if sheets exist and configures them if necessary
 */
export async function checkAndSetupSheets(accessToken: string): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  if (typeof window !== 'undefined') {
    const isSetup = localStorage.getItem('sheets_setup_' + spreadsheetId);
    if (isSetup === 'true') {
      console.log("Google Sheets đã được kiểm tra và cấu hình sẵn trước đó. Đang tải dữ liệu trực tiếp...");
      return;
    }
  }
  try {
    // 1. Fetch spreadsheet metadata to see which sheet tabs exist
    const metadata = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      accessToken
    );

    const sheets = metadata.sheets || [];
    const sheetTitles = sheets.map((s: any) => s.properties.title);

    const hasEmployeesSheet = sheetTitles.includes("DanhSachNhanVien");
    const hasLogsSheet = sheetTitles.includes("NhatKyChamCong");

    const requests: any[] = [];

    if (!hasEmployeesSheet) {
      requests.push({
        addSheet: {
          properties: {
            title: "DanhSachNhanVien",
            gridProperties: { rowCount: 1000, columnCount: 10 }
          }
        }
      });
    }

    if (!hasLogsSheet) {
      requests.push({
        addSheet: {
          properties: {
            title: "NhatKyChamCong",
            gridProperties: { rowCount: 10000, columnCount: 10 }
          }
        }
      });
    }

    // 2. Create missing sheets via batchUpdate
    if (requests.length > 0) {
      await googleFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({ requests })
        }
      );
    }

    // 3. Populate headers if newly created or empty
    if (!hasEmployeesSheet) {
      await writeSheetHeaders(
        accessToken,
        "DanhSachNhanVien!A1:H1",
        ["Họ Và Tên", "Chức Vụ", "Ngày Đăng Ký", "Ngày Rời Khỏi", "Quỹ Phép Năm", "Phép Tồn Năm Trước", "Tên Hiển Thị (Guest)", "Bộ Phận"]
      );
    }

    if (!hasLogsSheet) {
      await writeSheetHeaders(
        accessToken,
        "NhatKyChamCong!A1:F1",
        ["Họ Và Tên", "Ngày Chấm Công", "Trạng Thái", "OT Bắt Đầu", "OT Kết Thúc", "Ghi Chú"]
      );
    }

    // 4. Format sheet headers with frozen row 1, custom colors and column widths
    await formatGoogleSheetStyles(accessToken);

    // Cache the configuration success to skip on subsequent reloads
    if (typeof window !== 'undefined') {
      localStorage.setItem('sheets_setup_' + spreadsheetId, 'true');
    }

  } catch (error) {
    console.error("Lỗi khi đồng bộ thiết lập Google Sheets:", error);
    throw error;
  }
}

/**
 * Formats all Google Sheet tabs with freeze header row, custom indigo background color, and optimized column widths
 */
export async function formatGoogleSheetStyles(accessToken: string): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  try {
    const metadata = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      accessToken
    );
    const sheets = metadata.sheets || [];
    const requests: any[] = [];

    sheets.forEach((sheet: any) => {
      const sheetId = sheet.properties.sheetId;
      // Freeze row 1
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheetId,
            gridProperties: { frozenRowCount: 1 }
          },
          fields: 'gridProperties.frozenRowCount'
        }
      });

      // Format header row 0 (A1:Z1) with Indigo background fill & white bold text
      requests.push({
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 10
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.28, green: 0.33, blue: 0.88 }, // Deep Indigo/Royal Blue #4755E6
              textFormat: {
                foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                fontSize: 10,
                bold: true
              },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
        }
      });

      // Set default column widths to 175px
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId: sheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 8
          },
          properties: { pixelSize: 175 },
          fields: 'pixelSize'
        }
      });
    });

    if (requests.length > 0) {
      await googleFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({ requests })
        }
      );
    }
  } catch (err) {
    console.warn("Đã bỏ qua định dạng giao diện Google Sheets:", err);
  }
}

async function writeSheetHeaders(accessToken: string, range: string, headers: string[]): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values: [headers]
      })
    }
  );
}

async function getLocalState(): Promise<any> {
  const response = await fetch('/api/app-state', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error("Lỗi kết nối máy chủ");
  }
  return await response.json();
}

async function saveLocalState(employees: any[], timeLogs: any[]): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  const response = await fetch('/api/app-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employees,
      timeLogs,
      spreadsheetId,
      email: "Quản trị viên (Local / Mật khẩu)"
    })
  });
  if (!response.ok) {
    throw new Error("Lỗi lưu dữ liệu máy chủ");
  }
}

/**
 * Fetch all employees from Google Sheet
 */
export async function getEmployees(accessToken: string): Promise<Employee[]> {
  if (!accessToken || accessToken === 'local') {
    try {
      const data = await getLocalState();
      return data.employees || [];
    } catch (e) {
      console.error("Lỗi lấy danh sách nhân viên local:", e);
      return [];
    }
  }
  const spreadsheetId = getSpreadsheetId();
  try {
    const data = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/DanhSachNhanVien!A2:H1000`,
      accessToken
    );

    const rows = data.values || [];
    return rows.map((row: any, idx: number) => ({
      name: row[0] || "",
      role: row[1] || "",
      registeredAt: row[2] || "",
      leftAt: row[3] || "",
      leaveAllowance: row[4] ? Number(row[4]) : undefined,
      leaveCarryover: row[5] ? Number(row[5]) : undefined,
      displayName: row[6] || undefined,
      department: row[7] || undefined,
      rowIndex: idx + 2
    })).filter((emp: Employee) => emp.name !== "");

  } catch (error) {
    console.error("Lỗi lấy danh sách nhân viên từ Sheet:", error);
    return [];
  }
}

/**
 * Add a new employee to Google Sheet
 */
export async function addEmployee(accessToken: string, employee: Employee): Promise<void> {
  if (!accessToken || accessToken === 'local') {
    const data = await getLocalState();
    const newEmp = { ...employee };
    const maxRow = data.employees.reduce((max: number, e: any) => Math.max(max, e.rowIndex || 0), 1);
    newEmp.rowIndex = maxRow + 1;
    data.employees.push(newEmp);
    await saveLocalState(data.employees, data.timeLogs);
    return;
  }
  const spreadsheetId = getSpreadsheetId();
  const range = "DanhSachNhanVien!A:H";
  const values = [
    [
      employee.name,
      employee.role,
      employee.registeredAt,
      employee.leftAt || "",
      employee.leaveAllowance !== undefined ? employee.leaveAllowance : "",
      employee.leaveCarryover !== undefined ? employee.leaveCarryover : "",
      employee.displayName || "",
      employee.department || ""
    ]
  ];

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        values
      })
    }
  );
}

/**
 * Delete an employee physically from the Google Sheet by deleting their row in DanhSachNhanVien
 */
export async function deleteEmployee(accessToken: string, rowIndex: number): Promise<void> {
  if (!accessToken || accessToken === 'local') {
    const data = await getLocalState();
    const updated = data.employees.filter((e: any) => e.rowIndex !== rowIndex);
    await saveLocalState(updated, data.timeLogs);
    return;
  }
  const spreadsheetId = getSpreadsheetId();
  // 1. Fetch metadata to find sheetId for "DanhSachNhanVien"
  const metadata = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    accessToken
  );
  const sheets = metadata.sheets || [];
  const empSheet = sheets.find((s: any) => s.properties.title === "DanhSachNhanVien");
  if (!empSheet) {
    throw new Error("Không tìm thấy sheet nhân viên 'DanhSachNhanVien'.");
  }
  const sheetId = empSheet.properties.sheetId;

  // 2. Send batchUpdate to delete the dimension row
  const requests = [
    {
      deleteDimension: {
        range: {
          sheetId: sheetId,
          dimension: "ROWS",
          startIndex: rowIndex - 1, // 0-indexed, inclusive
          endIndex: rowIndex // 0-indexed, exclusive
        }
      }
    }
  ];

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ requests })
    }
  );
}

/**
 * Update the entire list of employees in Google Sheets (useful for reordering)
 */
export async function saveEmployeesOrder(accessToken: string, employees: Employee[]): Promise<void> {
  if (!accessToken || accessToken === 'local') {
    const data = await getLocalState();
    const updated = employees.map((emp, idx) => ({
      ...emp,
      rowIndex: idx + 2
    }));
    await saveLocalState(updated, data.timeLogs);
    return;
  }
  const spreadsheetId = getSpreadsheetId();
  const range = `DanhSachNhanVien!A2:H${employees.length + 1}`;
  
  const values = employees.map(emp => [
    emp.name,
    emp.role,
    emp.registeredAt,
    emp.leftAt || "",
    emp.leaveAllowance !== undefined ? emp.leaveAllowance : "",
    emp.leaveCarryover !== undefined ? emp.leaveCarryover : "",
    emp.displayName || "",
    emp.department || ""
  ]);

  // First, clear the existing range to make sure any extra old rows are wiped if size decreased
  try {
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/DanhSachNhanVien!A2:H1000:clear`,
      accessToken,
      { method: 'POST' }
    );
  } catch (err) {
    console.error("Lỗi khi xóa bảng DanhSachNhanVien trước khi ghi đè:", err);
  }

  // Then write the new ordered values
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values
      })
    }
  );
}

/**
 * Update employee information (name, role) in Google Sheet.
 * Also cascades name changes to NhatKyChamCong to preserve logs.
 */
export async function updateEmployee(
  accessToken: string,
  rowIndex: number,
  oldName: string,
  newName: string,
  newRole: string,
  newRegisteredAt: string,
  newLeftAt: string,
  newLeaveAllowance?: number,
  newLeaveCarryover?: number,
  newDisplayName?: string,
  newDepartment?: string
): Promise<void> {
  if (!accessToken || accessToken === 'local') {
    const data = await getLocalState();
    const empIndex = data.employees.findIndex((e: any) => e.rowIndex === rowIndex);
    if (empIndex !== -1) {
      data.employees[empIndex] = {
        ...data.employees[empIndex],
        name: newName,
        role: newRole,
        registeredAt: newRegisteredAt,
        leftAt: newLeftAt || undefined,
        leaveAllowance: newLeaveAllowance,
        leaveCarryover: newLeaveCarryover,
        department: newDepartment || undefined,
        displayName: newDisplayName || undefined
      };
      
      // Cascade name change in logs
      if (oldName.trim().toLowerCase() !== newName.trim().toLowerCase()) {
        data.timeLogs = data.timeLogs.map((log: any) => {
          if (log.employeeName.trim().toLowerCase() === oldName.trim().toLowerCase()) {
            return { ...log, employeeName: newName };
          }
          return log;
        });
      }
      
      await saveLocalState(data.employees, data.timeLogs);
    }
    return;
  }
  const spreadsheetId = getSpreadsheetId();
  if (!rowIndex) {
    throw new Error("Không tìm thấy dòng tương ứng để cập nhật.");
  }

  // 1. Update the employee row (A to H)
  const range = `DanhSachNhanVien!A${rowIndex}:H${rowIndex}`;
  const values = [[
    newName, 
    newRole, 
    newRegisteredAt, 
    newLeftAt, 
    newLeaveAllowance !== undefined ? newLeaveAllowance : "",
    newLeaveCarryover !== undefined ? newLeaveCarryover : "",
    newDisplayName || "",
    newDepartment || ""
  ]];

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values
      })
    }
  );

  // 2. Cascade name change in NhatKyChamCong if name changed
  if (oldName.trim().toLowerCase() !== newName.trim().toLowerCase()) {
    try {
      const logs = await getTimeLogs(accessToken);
      const logsToUpdate = logs.filter(
        log => log.employeeName.trim().toLowerCase() === oldName.trim().toLowerCase() && log.rowIndex
      );

      if (logsToUpdate.length > 0) {
        const data = logsToUpdate.map(log => ({
          range: `NhatKyChamCong!A${log.rowIndex}`, // column A is employeeName
          values: [[newName]]
        }));

        await googleFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
          accessToken,
          {
            method: 'POST',
            body: JSON.stringify({
              valueInputOption: "USER_ENTERED",
              data
            })
          }
        );
      }
    } catch (err) {
      console.error("Lỗi khi tự động đồng bộ đổi tên trong Nhật ký chấm công:", err);
    }
  }
}

/**
 * Fetch all time logs from Google Sheet
 */
export async function getTimeLogs(accessToken: string): Promise<TimeLog[]> {
  if (!accessToken || accessToken === 'local') {
    try {
      const data = await getLocalState();
      return data.timeLogs || [];
    } catch (e) {
      console.error("Lỗi lấy nhật ký chấm công local:", e);
      return [];
    }
  }
  const spreadsheetId = getSpreadsheetId();
  try {
    const data = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/NhatKyChamCong!A2:F10000`,
      accessToken
    );

    const rows = data.values || [];
    return rows.map((row: any, index: number) => {
      let logDate = row[1] || "";
      if (logDate.includes('/')) {
        const parts = logDate.split('/');
        if (parts.length === 3 && parts[2].length === 4) {
          // DD/MM/YYYY -> YYYY-MM-DD
          logDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts.length === 3 && parts[0].length === 4) {
          // YYYY/MM/DD -> YYYY-MM-DD
          logDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
      return {
        employeeName: row[0] || "",
        date: logDate,
        status: (row[2] || "Có đi làm") as 'Có đi làm' | 'Không đi làm' | 'Nghỉ phép',
        otFrom: row[3] || "",
        otTo: row[4] || "",
        note: row[5] || "",
        rowIndex: index + 2
      };
    }).filter((log: TimeLog) => log.employeeName !== "");

  } catch (error) {
    console.error("Lỗi lấy nhật ký chấm công từ Sheet:", error);
    return [];
  }
}

/**
 * Update an existing timekeeping log in Google Sheet
 */
export async function updateTimeLog(accessToken: string, log: TimeLog): Promise<void> {
  recordEmployeeAction(log.employeeName);
  if (!accessToken || accessToken === 'local') {
    const data = await getLocalState();
    const logIndex = data.timeLogs.findIndex((l: any) => l.rowIndex === log.rowIndex);
    if (logIndex !== -1) {
      data.timeLogs[logIndex] = { ...log };
      await saveLocalState(data.employees, data.timeLogs);
    }
    return;
  }
  const spreadsheetId = getSpreadsheetId();
  if (!log.rowIndex) {
    throw new Error("Không tìm thấy dòng tương ứng để cập nhật.");
  }
  const range = `NhatKyChamCong!A${log.rowIndex}:F${log.rowIndex}`;
  const values = [
    [
      log.employeeName,
      log.date,
      log.status,
      log.otFrom,
      log.otTo,
      log.note
    ]
  ];

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values
      })
    }
  );
}

/**
 * Delete a log physically from the Google Sheet by deleting its row
 */
export async function deleteTimeLog(accessToken: string, rowIndex: number): Promise<void> {
  if (!accessToken || accessToken === 'local') {
    const data = await getLocalState();
    const updated = data.timeLogs.filter((l: any) => l.rowIndex !== rowIndex);
    await saveLocalState(data.employees, updated);
    return;
  }
  const spreadsheetId = getSpreadsheetId();
  // 1. Fetch metadata to find sheetId for "NhatKyChamCong"
  const metadata = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    accessToken
  );
  const sheets = metadata.sheets || [];
  const logSheet = sheets.find((s: any) => s.properties.title === "NhatKyChamCong");
  if (!logSheet) {
    throw new Error("Không tìm thấy sheet nhật ký 'NhatKyChamCong'.");
  }
  const sheetId = logSheet.properties.sheetId;

  // 2. Send batchUpdate to delete the dimension row
  const requests = [
    {
      deleteDimension: {
        range: {
          sheetId: sheetId,
          dimension: "ROWS",
          startIndex: rowIndex - 1, // 0-indexed, inclusive
          endIndex: rowIndex // 0-indexed, exclusive
        }
      }
    }
  ];

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ requests })
    }
  );
}

/**
 * Saves or updates attendance logs for multiple employees on a specific date.
 * To keep API requests low and fast, this uses batch values updates and bulk appends/deletions.
 */
export async function saveDayAttendance(
  accessToken: string,
  date: string,
  updates: Array<{
    employeeName: string;
    status: 'Có đi làm' | 'Không đi làm' | 'Nghỉ phép';
    otFrom: string;
    otTo: string;
    note: string;
  }>,
  existingLogs: TimeLog[]
): Promise<void> {
  if (!accessToken || accessToken === 'local') {
    const data = await getLocalState();
    let updatedLogs = data.timeLogs.filter((l: any) => l.date !== date);
    
    const newLogsForDate: any[] = [];
    for (const update of updates) {
      const hasOt = !!(update.otFrom && update.otTo);
      const isDefaultPresent = update.status === 'Có đi làm' && !hasOt && !update.note.trim();
      
      if (!isDefaultPresent) {
        newLogsForDate.push({
          employeeName: update.employeeName,
          date,
          status: update.status,
          otFrom: update.otFrom,
          otTo: update.otTo,
          note: update.note.trim()
        });
      }
    }
    
    let maxRow = updatedLogs.reduce((max: number, l: any) => Math.max(max, l.rowIndex || 0), 1);
    for (const log of newLogsForDate) {
      maxRow++;
      log.rowIndex = maxRow;
      updatedLogs.push(log);
    }
    
    await saveLocalState(data.employees, updatedLogs);
    return;
  }
  const spreadsheetId = getSpreadsheetId();

  // Find existing logs for this date
  const logsForDate = existingLogs.filter(l => l.date === date);

  const logsToDelete: number[] = [];
  const logsToUpdate: Array<{ rowIndex: number; log: TimeLog }> = [];
  const logsToCreate: TimeLog[] = [];

  for (const update of updates) {
    const existing = logsForDate.find(
      l => l.employeeName.trim().toLowerCase() === update.employeeName.trim().toLowerCase()
    );

    const hasOt = !!(update.otFrom && update.otTo);
    const isDefaultPresent = update.status === 'Có đi làm' && !hasOt && !update.note.trim();

    if (existing) {
      if (isDefaultPresent) {
        // If it was custom but is now reset to default present, delete the exception row to keep sheet clean
        if (existing.rowIndex) {
          logsToDelete.push(existing.rowIndex);
        }
      } else {
        // Update the existing row
        if (existing.rowIndex) {
          logsToUpdate.push({
            rowIndex: existing.rowIndex,
            log: {
              employeeName: update.employeeName,
              date,
              status: update.status,
              otFrom: update.otFrom,
              otTo: update.otTo,
              note: update.note.trim()
            }
          });
        }
      }
    } else {
      // If there's no existing row, and it's NOT the default present, create a new exception row
      if (!isDefaultPresent) {
        logsToCreate.push({
          employeeName: update.employeeName,
          date,
          status: update.status,
          otFrom: update.otFrom,
          otTo: update.otTo,
          note: update.note.trim()
        });
      }
    }
  }

  // 1. Handle Deletions (Bulk batchUpdate)
  if (logsToDelete.length > 0) {
    // Fetch spreadsheet metadata to get sheetId
    const metadata = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      accessToken
    );
    const logSheet = metadata.sheets?.find((s: any) => s.properties.title === "NhatKyChamCong");
    if (!logSheet) {
      throw new Error("Không tìm thấy sheet 'NhatKyChamCong'.");
    }
    const sheetId = logSheet.properties.sheetId;

    // IMPORTANT: Sort row indexes in descending order so deletion of earlier rows doesn't shift later row indexes!
    const sortedIndexes = [...logsToDelete].sort((a, b) => b - a);

    const requests = sortedIndexes.map(rowIndex => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: rowIndex - 1,
          endIndex: rowIndex
        }
      }
    }));

    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ requests })
      }
    );
  }

  // 2. Handle Updates (Batch values update)
  if (logsToUpdate.length > 0) {
    const data = logsToUpdate.map(item => ({
      range: `NhatKyChamCong!A${item.rowIndex}:F${item.rowIndex}`,
      values: [[
        item.log.employeeName,
        item.log.date,
        item.log.status,
        item.log.otFrom,
        item.log.otTo,
        item.log.note
      ]]
    }));

    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data
        })
      }
    );
  }

  // 3. Handle Appends (Append values)
  if (logsToCreate.length > 0) {
    const values = logsToCreate.map(log => [
      log.employeeName,
      log.date,
      log.status,
      log.otFrom,
      log.otTo,
      log.note
    ]);

    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/NhatKyChamCong!A:F:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          values
        })
      }
    );
  }
}

/**
 * Add a new timekeeping log to Google Sheet
 */
export async function addTimeLog(accessToken: string, log: TimeLog): Promise<void> {
  recordEmployeeAction(log.employeeName);
  if (!accessToken || accessToken === 'local') {
    const data = await getLocalState();
    const newLog = { ...log };
    const maxRow = data.timeLogs.reduce((max: number, l: any) => Math.max(max, l.rowIndex || 0), 1);
    newLog.rowIndex = maxRow + 1;
    data.timeLogs.push(newLog);
    await saveLocalState(data.employees, data.timeLogs);
    return;
  }
  const spreadsheetId = getSpreadsheetId();
  const range = "NhatKyChamCong!A:F";
  const values = [
    [
      log.employeeName,
      log.date,
      log.status,
      log.otFrom,
      log.otTo,
      log.note
    ]
  ];

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        values
      })
    }
  );
}

/**
 * Bulk add employees to Google Sheet
 */
export async function addEmployeesBulk(accessToken: string, employees: Employee[]): Promise<void> {
  if (employees.length === 0) return;
  if (!accessToken || accessToken === 'local') {
    const data = await getLocalState();
    let maxRow = data.employees.reduce((max: number, e: any) => Math.max(max, e.rowIndex || 0), 1);
    for (const emp of employees) {
      maxRow++;
      emp.rowIndex = maxRow;
      data.employees.push(emp);
    }
    await saveLocalState(data.employees, data.timeLogs);
    return;
  }
  const spreadsheetId = getSpreadsheetId();
  const range = "DanhSachNhanVien!A:H";
  const values = employees.map(emp => [
    emp.name,
    emp.role,
    emp.registeredAt,
    emp.leftAt || "",
    emp.leaveAllowance !== undefined ? emp.leaveAllowance : "",
    emp.leaveCarryover !== undefined ? emp.leaveCarryover : "",
    emp.displayName || "",
    emp.department || ""
  ]);

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        values
      })
    }
  );
}

/**
 * Bulk add timekeeping logs to Google Sheet
 */
export async function addTimeLogsBulk(accessToken: string, logs: TimeLog[]): Promise<void> {
  if (logs.length === 0) return;
  recordMultipleEmployeeActions(logs.map(log => log.employeeName));
  if (!accessToken || accessToken === 'local') {
    const data = await getLocalState();
    let maxRow = data.timeLogs.reduce((max: number, l: any) => Math.max(max, l.rowIndex || 0), 1);
    for (const log of logs) {
      maxRow++;
      log.rowIndex = maxRow;
      data.timeLogs.push(log);
    }
    await saveLocalState(data.employees, data.timeLogs);
    return;
  }
  const spreadsheetId = getSpreadsheetId();
  const range = "NhatKyChamCong!A:F";
  const values = logs.map(log => [
    log.employeeName,
    log.date,
    log.status,
    log.otFrom || "",
    log.otTo || "",
    log.note || ""
  ]);

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        values
      })
    }
  );
}

/**
 * Parses a custom grid-layout sheet and returns extracted employees and logs.
 */
export async function parseGridSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<{ employees: Employee[]; timeLogs: TimeLog[] } | null> {
  try {
    const range = `${sheetTitle}!A1:Z100`;
    const data = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      accessToken
    );

    const rows = data.values || [];
    if (rows.length < 2) return null;

    // 1. Find the header row that contains "Day" or "ngày" or "ngày công"
    let headerRowIndex = -1;
    let dayColIndex = -1;
    let weekColIndex = -1;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c]).trim().toLowerCase();
        if (val === 'day' || val === 'ngày' || val === 'ngày công') {
          headerRowIndex = r;
          dayColIndex = c;
          break;
        }
      }
      if (headerRowIndex !== -1) break;
    }

    if (headerRowIndex === -1 || dayColIndex === -1) {
      return null;
    }

    // Look for "Week" or "thứ" column in the same header row
    const headerRow = rows[headerRowIndex];
    for (let c = 0; c < headerRow.length; c++) {
      const val = String(headerRow[c]).trim().toLowerCase();
      if (val === 'week' || val === 'thứ' || val === 'thứ/ngày' || val === 'weekday') {
        weekColIndex = c;
        break;
      }
    }

    // 2. Extract employee names from the headers after the Day column
    const employees: Employee[] = [];
    const colToEmployee: { [colIndex: number]: string } = {};

    for (let c = 0; c < headerRow.length; c++) {
      if (c === dayColIndex || c === weekColIndex) continue;
      
      const val = String(headerRow[c]).trim();
      if (!val) continue;

      const lowerVal = val.toLowerCase();
      if (
        lowerVal.includes('tổng') || 
        lowerVal.includes('total') || 
        lowerVal.includes('ghi chú') || 
        lowerVal.includes('note') || 
        lowerVal.includes('week') || 
        lowerVal.includes('day') ||
        lowerVal.includes('ngày') ||
        lowerVal.includes('thứ') ||
        lowerVal === 'july' || lowerVal === 'august'
      ) {
        continue;
      }

      employees.push({
        name: val,
        role: "Nhân viên",
        registeredAt: "2026-01-01"
      });
      colToEmployee[c] = val;
    }

    if (employees.length === 0) {
      return null;
    }

    // 3. Determine month and year from the sheet title or fallback to current
    let month = 7; // Default July
    let year = 2026; // Default 2026

    const lowerTitle = sheetTitle.toLowerCase();
    const monthPatterns: { [key: string]: number } = {
      'january': 1, 'jan': 1, 'tháng 1': 1, 'tháng một': 1, 't1': 1,
      'february': 2, 'feb': 2, 'tháng 2': 2, 'tháng hai': 2, 't2': 2,
      'march': 3, 'mar': 3, 'tháng 3': 3, 'tháng ba': 3, 't3': 3,
      'april': 4, 'apr': 4, 'tháng 4': 4, 'tháng tư': 4, 't4': 4,
      'may': 5, 'tháng 5': 5, 'tháng năm': 5, 't5': 5,
      'june': 6, 'jun': 6, 'tháng 6': 6, 'tháng sáu': 6, 't6': 6,
      'july': 7, 'jul': 7, 'tháng 7': 7, 'tháng bảy': 7, 't7': 7,
      'august': 8, 'aug': 8, 'tháng 8': 8, 'tháng tám': 8, 't8': 8,
      'september': 9, 'sep': 9, 'tháng 9': 9, 'tháng chín': 9, 't9': 9,
      'october': 10, 'oct': 10, 'tháng 10': 10, 'tháng mười': 10, 't10': 10,
      'november': 11, 'nov': 11, 'tháng 11': 11, 'tháng mười một': 11, 't11': 11,
      'december': 12, 'dec': 12, 'tháng 12': 12, 'tháng mười hai': 12, 't12': 12,
    };

    for (const pattern of Object.keys(monthPatterns)) {
      if (lowerTitle.includes(pattern)) {
        month = monthPatterns[pattern];
        break;
      }
    }

    const yearMatch = sheetTitle.match(/\b(202\d)\b/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
    }

    const timeLogs: TimeLog[] = [];

    // 4. Parse rows for attendance logs
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length <= dayColIndex) continue;

      const dayStr = String(row[dayColIndex]).trim();
      const dayNum = parseInt(dayStr, 10);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;

      const mm = String(month).padStart(2, '0');
      const dd = String(dayNum).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;

      for (const colIdxStr of Object.keys(colToEmployee)) {
        const colIdx = parseInt(colIdxStr, 10);
        if (colIdx >= row.length) continue;

        const cellValue = String(row[colIdx]).trim();
        if (!cellValue) continue;

        let status: 'Có đi làm' | 'Không đi làm' | 'Nghỉ phép' = 'Có đi làm';
        const lowerCell = cellValue.toLowerCase();

        if (lowerCell.includes('phép') || lowerCell.includes('phep') || lowerCell === 'p' || lowerCell.includes('nghỉ phép') || lowerCell.includes('nghi phep')) {
          status = 'Nghỉ phép';
        } else if (lowerCell === 'không' || lowerCell === 'khong' || lowerCell === 'no' || lowerCell === 'k' || lowerCell === 'o' || lowerCell.includes('không')) {
          status = 'Không đi làm';
        } else if (lowerCell === 'có' || lowerCell === 'co' || lowerCell === 'yes' || lowerCell === 'x' || lowerCell === 'v' || lowerCell.includes('có') || lowerCell === 'wfh' || lowerCell.includes('wfh')) {
          status = 'Có đi làm';
        } else {
          status = 'Có đi làm';
        }

        timeLogs.push({
          employeeName: colToEmployee[colIdx],
          date: dateStr,
          status,
          otFrom: "",
          otTo: "",
          note: ""
        });
      }
    }

    return { employees, timeLogs };
  } catch (error) {
    console.error(`Lỗi phân tích sheet dạng lưới "${sheetTitle}":`, error);
    return null;
  }
}

/**
 * Automatically scans all sheets in the spreadsheet (excluding standard ones),
 * parses any grid-style month/attendance sheets, and populates the standard sheets.
 */
export async function syncGridDataToStandardSheets(accessToken: string): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  try {
    const metadata = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      accessToken
    );

    const sheets = metadata.sheets || [];
    const otherSheets = sheets.filter((s: any) => {
      const title = s.properties.title;
      return title !== "DanhSachNhanVien" && title !== "NhatKyChamCong";
    });

    if (otherSheets.length === 0) {
      console.log("Không tìm thấy các sheet dạng lưới khác để đồng bộ.");
      return;
    }

    // Fetch existing data from standard sheets to avoid duplicates or update when status differs
    const existingEmployees = await getEmployees(accessToken);
    const existingLogs = await getTimeLogs(accessToken);

    const existingEmpNames = new Set(existingEmployees.map(emp => emp.name.trim().toLowerCase()));
    
    // Map existing logs by employeeName_date key for fast lookup and comparison
    const existingLogsMap = new Map<string, TimeLog>();
    for (const log of existingLogs) {
      existingLogsMap.set(`${log.employeeName.trim().toLowerCase()}_${log.date}`, log);
    }

    const allNewEmployees: Employee[] = [];
    const allNewLogs: TimeLog[] = [];
    const logsToUpdate: TimeLog[] = [];

    const newEmpNamesTracker = new Set<string>();
    const newLogKeysTracker = new Set<string>();

    for (const sheet of otherSheets) {
      const title = sheet.properties.title;
      const parsed = await parseGridSheet(accessToken, spreadsheetId, title);
      if (!parsed) continue;

      // Filter and collect new employees
      for (const emp of parsed.employees) {
        const empNameLower = emp.name.trim().toLowerCase();
        if (!existingEmpNames.has(empNameLower) && !newEmpNamesTracker.has(empNameLower)) {
          allNewEmployees.push(emp);
          newEmpNamesTracker.add(empNameLower);
        }
      }

      // Filter and collect new logs or update existing logs with changed statuses
      for (const log of parsed.timeLogs) {
        const logKey = `${log.employeeName.trim().toLowerCase()}_${log.date}`;
        const existingLog = existingLogsMap.get(logKey);

        if (!existingLog) {
          if (!newLogKeysTracker.has(logKey)) {
            allNewLogs.push(log);
            newLogKeysTracker.add(logKey);
          }
        } else if (existingLog.status !== log.status) {
          // Status has changed (e.g. was incorrectly parsed as 'Có đi làm' before)
          logsToUpdate.push({
            ...existingLog,
            status: log.status
          });
        }
      }
    }

    // Add new employees in bulk
    if (allNewEmployees.length > 0) {
      console.log(`Đang đồng bộ ${allNewEmployees.length} nhân viên mới từ bảng lưới vào DanhSachNhanVien...`);
      await addEmployeesBulk(accessToken, allNewEmployees);
    }

    // Add new logs in bulk
    if (allNewLogs.length > 0) {
      console.log(`Đang đồng bộ ${allNewLogs.length} nhật ký chấm công mới từ bảng lưới vào NhatKyChamCong...`);
      await addTimeLogsBulk(accessToken, allNewLogs);
    }

    // Update existing logs whose status has changed in bulk
    if (logsToUpdate.length > 0) {
      console.log(`Đang cập nhật trạng thái mới cho ${logsToUpdate.length} nhật ký công bị sai lệch...`);
      const data = logsToUpdate.map(log => ({
        range: `NhatKyChamCong!C${log.rowIndex}`, // column C is status
        values: [[log.status]]
      }));

      await googleFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({
            valueInputOption: "USER_ENTERED",
            data
          })
        }
      );
    }

  } catch (error) {
    console.error("Lỗi khi tự động đồng bộ dữ liệu bảng lưới:", error);
  }
}

/**
 * Deletes all employees and time logs.
 */
export async function deleteAllData(accessToken: string): Promise<void> {
  if (!accessToken || accessToken === 'local') {
    await saveLocalState([], []);
    return;
  }
  const spreadsheetId = getSpreadsheetId();
  try {
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/DanhSachNhanVien!A2:H1000:clear`,
      accessToken,
      { method: 'POST' }
    );
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/NhatKyChamCong!A2:L10000:clear`,
      accessToken,
      { method: 'POST' }
    );
  } catch (err) {
    console.error("Lỗi khi xóa dữ liệu:", err);
    throw err;
  }
}
