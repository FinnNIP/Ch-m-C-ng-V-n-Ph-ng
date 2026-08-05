const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsTab.tsx', 'utf8');

// The block to remove starts roughly here:
// <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { playConfirmSound(); setExcelExportDept(filterDepartment); setShowExcelExportModal(true); }} disabled={isDownloadingExcel} className="px-4.5 py-2 bg-emerald-600 ...">
// and ends after the In Báo Cáo button or so. Wait, let's remove just the Excel and PDF buttons.

const excelBtn = /<motion\.button[^>]*>\s*\{isDownloadingExcel \? \(\s*<RefreshCw className="w-3\.5 h-3\.5 animate-spin" \/>\s*\) : \(\s*<FileSpreadsheet className="w-3\.5 h-3\.5" \/>\s*\)\}\s*<span>\{isDownloadingExcel \? "Đang tạo Excel\.\.\." : "Tải dạng Excel"\}<\/span>\s*<\/motion\.button>/;
const pdfBtn = /<motion\.button[^>]*>\s*\{isDownloadingPdf \? \(\s*<RefreshCw className="w-3\.5 h-3\.5 animate-spin" \/>\s*\) : \(\s*<FileText className="w-3\.5 h-3\.5" \/>\s*\)\}\s*<span>\{isDownloadingPdf \? "Đang xuất PDF\.\.\." : "Tải dạng PDF"\}<\/span>\s*<\/motion\.button>/;

code = code.replace(excelBtn, "");
code = code.replace(pdfBtn, "");

// Remove the left column for PDF edit:
// It starts with <div className="w-full lg:w-76 shrink-0 p-4 sm:p-4 sm:p-6 bg-white dark:bg-slate-950 no-print space-y-4">
// ...
// </div>

const leftColStart = '<div className="w-full lg:w-76 shrink-0 p-4 sm:p-4 sm:p-6 bg-white dark:bg-slate-950 no-print space-y-4">';
const leftColEndRegex = /<div className="flex-1 p-4 sm:p-4 sm:p-8 overflow-auto custom-scrollbar flex justify-center bg-slate-200\/50 dark:bg-slate-950\/50">/;

if (code.includes(leftColStart) && code.match(leftColEndRegex)) {
  const startIdx = code.indexOf(leftColStart);
  const endIdx = code.search(leftColEndRegex);
  code = code.substring(0, startIdx) + code.substring(endIdx);
}

// Remove "Hướng dẫn xuất PDF"
const hintRegex = /\{\/\* Print configuration tips \(no-print\) \*\/\}\s*<div className="bg-amber-50\/50 dark:bg-amber-950\/20 border-b border-amber-100\/40 dark:border-amber-900\/20 px-6 py-3 text-\[11px\] text-amber-800 dark:text-amber-400 font-medium flex items-start gap-2 no-print">\s*<span>💡<\/span>\s*<p>\s*<b>Hướng dẫn xuất PDF chất lượng cao:<\/b> Trong hộp thoại In hiện ra, hãy chọn điểm đến là <b>"Lưu dưới dạng PDF" \(Save as PDF\)<\/b>\. Tại mục "Cài đặt khác", đảm bảo đã bật tùy chọn <b>"Đồ họa nền" \(Background graphics\)<\/b> và tắt "Tiêu đề và chân trang" \(Headers and footers\) để có bản báo cáo chuyên nghiệp, sạch sẽ và đẹp mắt nhất\.\s*<\/p>\s*<\/div>/;
code = code.replace(hintRegex, "");

fs.writeFileSync('src/components/ReportsTab.tsx', code);
