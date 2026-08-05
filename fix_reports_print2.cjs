const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsTab.tsx', 'utf8');

const targetStr = `              <tbody className="divide-y divide-slate-200">
                {monthlyReports.map((report, idx) => {
                  const restDetailsStr = getDetailedRestDaysString(report);
                  const otDetailsStr = getOtDaysString(report, totalDaysInMonth, selectedYear, selectedMonth);

                  return (
                    <tr key={report.employeeName} className="no-swipe border-b border-slate-100">
                      <td className="p-1.5 sm:p-2.5 text-center font-bold text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-1.5 sm:p-2.5 font-extrabold text-slate-900 text-xs">{getDisplayNameFromList(report.employeeName, false, employees, true)}</td>
                      <td className="p-1.5 sm:p-2.5 text-center font-black text-slate-900">{report.presentDays}</td>
                      <td className="p-1.5 sm:p-2.5 text-center text-rose-600 font-semibold">{report.absentDays}</td>
                      <td className="p-1.5 sm:p-2.5 text-center font-bold text-amber-700">{report.leaveDays}</td>
                      <td className="p-1.5 sm:p-2.5 text-left text-slate-700 font-medium text-[10px] whitespace-normal break-words max-w-[220px]">{restDetailsStr}</td>
                      <td className="p-1.5 sm:p-2.5 text-center text-violet-600 font-bold">{report.totalOtHours.toFixed(1)}h</td>
                      <td className="p-1.5 sm:p-2.5 text-left text-purple-850 font-semibold text-[10px] whitespace-normal break-words max-w-[280px]">{otDetailsStr}</td>
                      <td className="p-1.5 sm:p-2.5 text-center text-pink-700 font-semibold">{report.holidayDays}</td>
                    </tr>
                  );
                })}
              </tbody>`;

const replaceStr = `              <tbody className="divide-y divide-slate-200">
                {groupedFilteredReports.map(([dept, reports]) => (
                  <React.Fragment key={dept}>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <td colSpan={9} className="p-1.5 sm:p-2.5 text-xs font-bold text-indigo-600 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                        {dept} <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-[10px] ml-1">{reports.length} nhân sự</span>
                      </td>
                    </tr>
                    {reports.map((report, idx) => {
                      const restDetailsStr = getDetailedRestDaysString(report);
                      const otDetailsStr = getOtDaysString(report, totalDaysInMonth, selectedYear, selectedMonth);

                      return (
                        <tr key={report.employeeName} className="no-swipe border-b border-slate-100">
                          <td className="p-1.5 sm:p-2.5 text-center font-bold text-slate-500 font-mono">{idx + 1}</td>
                          <td className="p-1.5 sm:p-2.5 font-extrabold text-slate-900 text-xs">{getDisplayNameFromList(report.employeeName, false, employees, true)}</td>
                          <td className="p-1.5 sm:p-2.5 text-center font-black text-slate-900">{report.presentDays}</td>
                          <td className="p-1.5 sm:p-2.5 text-center text-rose-600 font-semibold">{report.absentDays}</td>
                          <td className="p-1.5 sm:p-2.5 text-center font-bold text-amber-700">{report.leaveDays}</td>
                          <td className="p-1.5 sm:p-2.5 text-left text-slate-700 font-medium text-[10px] whitespace-normal break-words max-w-[220px]">{restDetailsStr}</td>
                          <td className="p-1.5 sm:p-2.5 text-center text-violet-600 font-bold">{report.totalOtHours.toFixed(1)}h</td>
                          <td className="p-1.5 sm:p-2.5 text-left text-purple-850 font-semibold text-[10px] whitespace-normal break-words max-w-[280px]">{otDetailsStr}</td>
                          <td className="p-1.5 sm:p-2.5 text-center text-pink-700 font-semibold">{report.holidayDays}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/ReportsTab.tsx', code);
