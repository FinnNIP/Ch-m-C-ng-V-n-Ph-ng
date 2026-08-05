const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsTab.tsx', 'utf8');

// Remove unused state
code = code.replace(/const \[isDownloadingPdf, setIsDownloadingPdf\] = useState\(false\);\n/g, "");
code = code.replace(/const \[isDownloadingExcel, setIsDownloadingExcel\] = useState\(false\);\n/g, "");
code = code.replace(/const \[showExcelExportModal, setShowExcelExportModal\] = useState\(false\);\n/g, "");
code = code.replace(/const \[excelExportDept, setExcelExportDept\] = useState\('Tất cả'\);\n/g, "");

// Remove functions
const pdfFuncRegex = /const handleDownloadPdf = useCallback\(async \(\) => \{[\s\S]*?\}\, \[pdfCompanyName, pdfAddress, pdfHotlineEmail, pdfDocumentCode\]\);/;
code = code.replace(pdfFuncRegex, "");

const excelModalRegex = /\{showExcelExportModal && \([\s\S]*?\}\)\}\s*<\/div>\s*<\/div>\s*\)\}/;
code = code.replace(excelModalRegex, "");

fs.writeFileSync('src/components/ReportsTab.tsx', code);
