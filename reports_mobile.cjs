const fs = require('fs');
let content = fs.readFileSync('src/components/ReportsTab.tsx', 'utf-8');

// Add expandedRows state
if (!content.includes('expandedRows')) {
  content = content.replace(
    /const \[isTableLoaded, setIsTableLoaded\] = useState<boolean>\(false\);/,
    `const [isTableLoaded, setIsTableLoaded] = useState<boolean>(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (employeeName: string) => {
    setExpandedRows(prev => ({ ...prev, [employeeName]: !prev[employeeName] }));
  };`
  );
}

// Ensure the parent wrapper has responsive classes, we keep the table for md and above, and add a mobile cards view
content = content.replace(
  /<table className="w-full min-w-\[600px\] md:min-w-0 text-left border-collapse text-xs">/,
  `<table className="hidden md:table w-full text-left border-collapse text-xs">`
);

// We need to insert the mobile view right after the table
const tableEndIndex = content.indexOf('</table>');
const insertIndex = tableEndIndex + 8; // length of '</table>'

const mobileView = `
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
                filteredReports.map((report, idx) => {
                  const leaveDetailsStr = getLeaveDaysString(report, totalDaysInMonth);
                  const restDetailsStr = getDetailedRestDaysString(report);
                  const otDetailsStr = getOtDaysString(report, totalDaysInMonth, selectedYear, selectedMonth);
                  const isExpanded = !!expandedRows[report.employeeName];
                  
                  return (
                    <div key={report.employeeName} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleRow(report.employeeName)}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-400 text-xs border border-indigo-100/60 dark:border-indigo-900/40 shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                              {getDisplayNameFromList(report.employeeName, isAdmin, employees)}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-[11px] font-bold">
                              <span className="text-slate-700 dark:text-slate-300">Công: <span className="text-slate-900 dark:text-white font-black">{report.presentDays}</span></span>
                              <span className="text-rose-600">Vắng: {report.absentDays}</span>
                            </div>
                          </div>
                        </div>
                        <button className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400">
                          <svg className={\`w-4 h-4 transition-transform duration-300 \${isExpanded ? 'rotate-180' : ''}\`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      </div>
                      
                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-1 flex flex-col gap-3 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Nghỉ có phép</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">{report.leaveDays} ngày</span>
                          </div>
                          
                          {restDetailsStr && (
                            <div className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                              <span className="text-slate-500 font-medium block mb-1">Chi tiết ngày nghỉ:</span>
                              <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px] leading-snug">{restDetailsStr}</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Tăng ca (OT)</span>
                            <span className="font-bold text-violet-600 dark:text-violet-400">{report.totalOtHours.toFixed(1)} giờ</span>
                          </div>
                          
                          {otDetailsStr && (
                            <div className="bg-violet-50/50 dark:bg-violet-950/20 p-2.5 rounded-lg border border-violet-100/50 dark:border-violet-900/30">
                              <span className="text-slate-500 font-medium block mb-1">Chi tiết OT:</span>
                              <span className="text-purple-800 dark:text-purple-300 font-medium text-[11px] leading-snug">{otDetailsStr}</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Nghỉ Lễ</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{report.holidayDays} ngày</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>`;

content = content.slice(0, insertIndex) + mobileView + content.slice(insertIndex);
fs.writeFileSync('src/components/ReportsTab.tsx', content);
