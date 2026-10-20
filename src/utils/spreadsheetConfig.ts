// Lightweight spreadsheet configuration and ID helpers
// Separated from sheets.ts so initial page load does not parse 1,500+ lines of Sheets formulas

export const DEFAULT_SPREADSHEET_ID = "1WBVOBjsnSOEGKwTuKzf1LVH0ErOdzmAUKk2Bg9MtoTs";

export function getSpreadsheetId(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("custom_spreadsheet_id");
    if (saved) return saved;
  }
  return DEFAULT_SPREADSHEET_ID;
}

export function setSpreadsheetId(id: string) {
  if (typeof window !== "undefined") {
    if (id) {
      localStorage.setItem("custom_spreadsheet_id", id);
    } else {
      localStorage.removeItem("custom_spreadsheet_id");
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
