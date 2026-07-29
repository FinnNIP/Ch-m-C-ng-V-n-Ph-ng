import re
with open('src/sheets.ts', 'r') as f:
    content = f.read()

new_func = """
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
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/DanhSachNhanVien!A2:G1000:clear`,
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
"""

content += new_func

with open('src/sheets.ts', 'w') as f:
    f.write(content)
