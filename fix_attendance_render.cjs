const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

const targetStr = `              accountantLeaveReports
                .filter(report => report.isMatched && report.displayName.toLowerCase().includes(leaveSearch.toLowerCase()))
                .map((report) => {
                  const isExpanded = expandedLeaveEmp === \`acc-\${report.key}\`;
                  return (
                    <div key={report.key} className="transition-colors hover:bg-slate-50/30 dark:hover:bg-slate-850/10">`;

const replaceStr = `              groupedAccountantLeaveReports.map(([dept, reports]) => (
                <div key={dept} className="flex flex-col">
                  <div className="bg-slate-50/80 dark:bg-slate-900/40 border-y border-slate-100 dark:border-slate-800/60 p-2 sm:p-3 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                    {dept} <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-[10px] ml-1">{reports.length} nhân sự</span>
                  </div>
                  {reports.map((report) => {
                    const isExpanded = expandedLeaveEmp === \`acc-\${report.key}\`;
                    return (
                      <div key={report.key} className="transition-colors hover:bg-slate-50/30 dark:hover:bg-slate-850/10 border-b border-slate-100 dark:border-slate-800/80 last:border-0">`;

code = code.replace(targetStr, replaceStr);

const targetStr2 = `                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })
            )}`;

const replaceStr2 = `                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
            )}`;

code = code.replace(targetStr2, replaceStr2);
fs.writeFileSync('src/components/AttendanceTab.tsx', code);
