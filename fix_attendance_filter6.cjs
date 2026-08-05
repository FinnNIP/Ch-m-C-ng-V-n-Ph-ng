const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

const targetStr = `  const groupedAccountantLeaveReports = useMemo(() => {
    const filtered = accountantLeaveReports.filter(report => report.isMatched && report.displayName.toLowerCase().includes(leaveSearch.toLowerCase()));
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(r => {
      const dept = r.matchedEmployee?.department || 'Chưa phân bổ';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [accountantLeaveReports, leaveSearch]);`;

const replaceStr = `  const groupedAccountantLeaveReports = useMemo(() => {
    const filtered = accountantLeaveReports.filter(report => report.isMatched && report.displayName.toLowerCase().includes(leaveSearch.toLowerCase()));
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(r => {
      const dept = r.matchedEmployee?.department || 'Chưa phân bổ';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [accountantLeaveReports, leaveSearch]);

  const groupedLeaveReports = useMemo(() => {
    const filtered = leaveReports.filter(report => report.employee.name.toLowerCase().includes(leaveSearch.toLowerCase()));
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(r => {
      const dept = r.employee.department || 'Chưa phân bổ';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [leaveReports, leaveSearch]);`;

code = code.replace(targetStr, replaceStr);

const targetStr2 = `            {leaveReports.filter(report => report.employee.name.toLowerCase().includes(leaveSearch.toLowerCase())).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Chưa có nhân viên nào trong danh sách hoặc không tìm thấy kết quả phù hợp
              </div>
            ) : (
              leaveReports
                .filter(report => report.employee.name.toLowerCase().includes(leaveSearch.toLowerCase()))
                .map((report) => {
                  const isExpanded = expandedLeaveEmp === \`std-\${report.employee.name}\`;
                  return (
                    <div key={report.employee.name} className="transition-colors hover:bg-slate-50/30 dark:hover:bg-slate-850/10">`;

const replaceStr2 = `            {groupedLeaveReports.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Chưa có nhân viên nào trong danh sách hoặc không tìm thấy kết quả phù hợp
              </div>
            ) : (
              groupedLeaveReports.map(([dept, reports]) => (
                <div key={dept} className="flex flex-col">
                  <div className="bg-slate-50/80 dark:bg-slate-900/40 border-y border-slate-100 dark:border-slate-800/60 p-2 sm:p-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                    {dept} <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[10px] ml-1">{reports.length} nhân sự</span>
                  </div>
                  {reports.map((report) => {
                    const isExpanded = expandedLeaveEmp === \`std-\${report.employee.name}\`;
                    return (
                      <div key={report.employee.name} className="transition-colors hover:bg-slate-50/30 dark:hover:bg-slate-850/10 border-b border-slate-100 dark:border-slate-800/80 last:border-0">`;

code = code.replace(targetStr2, replaceStr2);

const targetStr3 = `                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>`;

const replaceStr3 = `                      </div>
                    </div>
                  );
                })}
              </div>
            ))
            )}
          </div>
        )}
      </div>`;

// Only replace the last occurrence in case there are multiple, but since we are modifying the 'Theo Luat' section it should be the end of the div.
code = code.replace(targetStr3, replaceStr3);

fs.writeFileSync('src/components/AttendanceTab.tsx', code);
