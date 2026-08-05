const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsTab.tsx', 'utf8');

const targetStr = `                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {monthlyReports.map((report, idx) => {
                        const restDetailsStr = getDetailedRestDaysString(report);
                        const otDetailsStr = getOtDaysString(report, totalDaysInMonth, selectedYear, selectedMonth);

                        return (
                          <tr 
                            key={report.employeeName} 
                            className="no-swipe group hover:bg-indigo-50/80 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800/40 last:border-0 cursor-pointer relative"
                          >
                            <td className="p-1.5 sm:p-2.5 text-center font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-black font-mono transition-colors">{idx + 1}</td>
                            <td className="p-1.5 sm:p-2.5 font-extrabold text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-black text-xs transition-colors">{getDisplayNameFromList(report.employeeName, false, employees, true)}</td>
                            <td className="p-1.5 sm:p-2.5 text-center font-black text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-black transition-colors">{report.presentDays}</td>
                            <td className="p-1.5 sm:p-2.5 text-center text-rose-600 dark:text-rose-400 group-hover:text-rose-700 dark:group-hover:text-rose-800 font-semibold transition-colors">{report.absentDays}</td>
                            <td className="p-1.5 sm:p-2.5 text-center font-bold text-amber-700 dark:text-amber-500 group-hover:text-amber-800 dark:group-hover:text-amber-700 transition-colors">{report.leaveDays}</td>
                            <td className="p-1.5 sm:p-2.5 text-left text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-black font-medium text-[10px] whitespace-normal break-words max-w-[220px] transition-colors">{restDetailsStr}</td>
                            <td className="p-1.5 sm:p-2.5 text-center text-violet-600 dark:text-violet-400 group-hover:text-violet-800 dark:group-hover:text-violet-950 font-bold transition-colors">{report.totalOtHours.toFixed(1)}h</td>
                            <td className="p-1.5 sm:p-2.5 text-left text-purple-850 dark:text-purple-300 group-hover:text-purple-950 dark:group-hover:text-purple-950 font-semibold text-[10px] whitespace-normal break-words max-w-[280px] transition-colors">{otDetailsStr}</td>
                            <td className="p-1.5 sm:p-2.5 text-center text-pink-700 dark:text-pink-400 group-hover:text-pink-900 dark:group-hover:text-pink-800 font-semibold transition-colors">{report.holidayDays}</td>
                          </tr>
                        );
                      })}
                    </tbody>`;

const replaceStr = `                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {groupedFilteredReports.map(([dept, reports]) => (
                        <React.Fragment key={dept}>
                          <tr className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60">
                            <td colSpan={9} className="p-1.5 sm:p-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                              <div className="w-1.5 h-4 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                              {dept} <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[10px] ml-1">{reports.length} nhân sự</span>
                            </td>
                          </tr>
                          {reports.map((report, idx) => {
                            const restDetailsStr = getDetailedRestDaysString(report);
                            const otDetailsStr = getOtDaysString(report, totalDaysInMonth, selectedYear, selectedMonth);

                            return (
                              <tr 
                                key={report.employeeName} 
                                className="no-swipe group hover:bg-indigo-50/80 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800/40 last:border-0 cursor-pointer relative"
                              >
                                <td className="p-1.5 sm:p-2.5 text-center font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-black font-mono transition-colors">{idx + 1}</td>
                                <td className="p-1.5 sm:p-2.5 font-extrabold text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-black text-xs transition-colors">{getDisplayNameFromList(report.employeeName, false, employees, true)}</td>
                                <td className="p-1.5 sm:p-2.5 text-center font-black text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-black transition-colors">{report.presentDays}</td>
                                <td className="p-1.5 sm:p-2.5 text-center text-rose-600 dark:text-rose-400 group-hover:text-rose-700 dark:group-hover:text-rose-800 font-semibold transition-colors">{report.absentDays}</td>
                                <td className="p-1.5 sm:p-2.5 text-center font-bold text-amber-700 dark:text-amber-500 group-hover:text-amber-800 dark:group-hover:text-amber-700 transition-colors">{report.leaveDays}</td>
                                <td className="p-1.5 sm:p-2.5 text-left text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-black font-medium text-[10px] whitespace-normal break-words max-w-[220px] transition-colors">{restDetailsStr}</td>
                                <td className="p-1.5 sm:p-2.5 text-center text-violet-600 dark:text-violet-400 group-hover:text-violet-800 dark:group-hover:text-violet-950 font-bold transition-colors">{report.totalOtHours.toFixed(1)}h</td>
                                <td className="p-1.5 sm:p-2.5 text-left text-purple-850 dark:text-purple-300 group-hover:text-purple-950 dark:group-hover:text-purple-950 font-semibold text-[10px] whitespace-normal break-words max-w-[280px] transition-colors">{otDetailsStr}</td>
                                <td className="p-1.5 sm:p-2.5 text-center text-pink-700 dark:text-pink-400 group-hover:text-pink-900 dark:group-hover:text-pink-800 font-semibold transition-colors">{report.holidayDays}</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/ReportsTab.tsx', code);
