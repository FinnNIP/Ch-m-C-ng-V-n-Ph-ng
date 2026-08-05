const fs = require('fs');

// --- Clean EmployeesTab.tsx ---
let empCode = fs.readFileSync('src/components/EmployeesTab.tsx', 'utf8');

// The field in handleSaveEdit:
empCode = empCode.replace(/\s*department:\s*editEmpDepartment\.trim\(\) !== '' \? editEmpDepartment\.trim\(\) : undefined,/g, "");

// The field in handleCreateEmployee (if any):
empCode = empCode.replace(/\s*department:\s*empDepartment\.trim\(\) \|\| undefined,/g, "");

// Input divs
const addInputRegex = /<div>\s*<label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ phận \(Tuỳ chọn\)<\/label>\s*<input\s*type="text"\s*placeholder="Vd: Kỹ thuật, Văn phòng\.\.\."\s*value=\{empDepartment\}\s*onChange=\{\(e\) => setEmpDepartment\(e\.target\.value\)\}\s*className="w-full px-4 py-2\.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-800 dark:text-slate-200"\s*\/>\s*<\/div>/g;
empCode = empCode.replace(addInputRegex, "");

const editInputRegex = /<div>\s*<label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ phận \(Tuỳ chọn\)<\/label>\s*<input\s*type="text"\s*placeholder="Vd: Kỹ thuật, Văn phòng\.\.\."\s*value=\{editEmpDepartment\}\s*onChange=\{\(e\) => setEditEmpDepartment\(e\.target\.value\)\}\s*className="w-full px-4 py-2\.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 text-slate-800 dark:text-slate-200"\s*\/>\s*<\/div>/g;
empCode = empCode.replace(editInputRegex, "");

fs.writeFileSync('src/components/EmployeesTab.tsx', empCode);

// --- Clean ReportsTab.tsx ---
let repCode = fs.readFileSync('src/components/ReportsTab.tsx', 'utf8');

// PDF export handler
const handleDownloadPdfRegex = /const handleDownloadPdf = useCallback\(async \(\) => \{[\s\S]*?\}\, \[pdfCompanyName, pdfAddress, pdfHotlineEmail, pdfDocumentCode\]\);/;
repCode = repCode.replace(handleDownloadPdfRegex, "");

// setIsDownloadingPdf
repCode = repCode.replace(/setIsDownloadingPdf\(true\);/g, "");
repCode = repCode.replace(/setIsDownloadingPdf\(false\);/g, "");

// setIsDownloadingExcel
repCode = repCode.replace(/setIsDownloadingExcel\(true\);/g, "");
repCode = repCode.replace(/setIsDownloadingExcel\(false\);/g, "");

// The Excel modal code
const excelModalRegex = /\{showExcelExportModal && \([\s\S]*?\}\)\}\s*<\/div>\s*<\/div>\s*\)\}/;
repCode = repCode.replace(excelModalRegex, "");

// Buttons (just to be sure)
const excelBtn = /<motion\.button[^>]*>\s*\{isDownloadingExcel \? \(\s*<RefreshCw className="w-3\.5 h-3\.5 animate-spin" \/>\s*\) : \(\s*<FileSpreadsheet className="w-3\.5 h-3\.5" \/>\s*\)\}\s*<span>\{isDownloadingExcel \? "Đang tạo Excel\.\.\." : "Tải dạng Excel"\}<\/span>\s*<\/motion\.button>/;
const pdfBtn = /<motion\.button[^>]*>\s*\{isDownloadingPdf \? \(\s*<RefreshCw className="w-3\.5 h-3\.5 animate-spin" \/>\s*\) : \(\s*<FileText className="w-3\.5 h-3\.5" \/>\s*\)\}\s*<span>\{isDownloadingPdf \? "Đang xuất PDF\.\.\." : "Tải dạng PDF"\}<\/span>\s*<\/motion\.button>/;

repCode = repCode.replace(excelBtn, "");
repCode = repCode.replace(pdfBtn, "");

fs.writeFileSync('src/components/ReportsTab.tsx', repCode);
