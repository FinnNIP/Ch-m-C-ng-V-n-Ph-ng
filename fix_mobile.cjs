const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsTab.tsx', 'utf8');

const targetStr = `              ) : (
                filteredReports.map((report, idx) => {
                  const leaveDetailsStr = getLeaveDaysString(report, totalDaysInMonth);
                  const restDetailsStr = getDetailedRestDaysString(report);`;

const replaceStr = `              ) : (
                groupedFilteredReports.map(([dept, reports]) => (
                  <div key={dept} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 p-2 pb-0">
                      <div className="w-1 h-3 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                      <h4 className="font-bold text-xs text-indigo-600 dark:text-indigo-400">{dept}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[10px] ml-1">{reports.length}</span>
                    </div>
                    {reports.map((report, idx) => {
                      const leaveDetailsStr = getLeaveDaysString(report, totalDaysInMonth);
                      const restDetailsStr = getDetailedRestDaysString(report);`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/ReportsTab.tsx', code);
