const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

const targetStr = `            {/* Employee List Scrollable */}
            <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800/60 rounded-2xl divide-y divide-slate-50 dark:divide-slate-800 pr-1">
              {filteredEmployees.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                  Không tìm thấy nhân viên nào
                </div>
              ) : (
                filteredEmployees.map((emp) => (`;

const replaceStr = `            {/* Employee List Scrollable */}
            <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800/60 rounded-2xl divide-y divide-slate-50 dark:divide-slate-800 pr-1">
              {groupedFilteredEmployees.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                  Không tìm thấy nhân viên nào
                </div>
              ) : (
                groupedFilteredEmployees.map(([dept, emps]) => (
                  <div key={dept}>
                    <div className="bg-slate-50/80 dark:bg-slate-900/40 p-2 text-xs font-bold text-slate-500 uppercase tracking-wider">{dept}</div>
                    {emps.map(emp => (`;

code = code.replace(targetStr, replaceStr);

const targetStr2 = `                    </div>
                  </button>
                ))
              )}
            </div>`;

const replaceStr2 = `                    </div>
                  </button>
                ))}
                </div>
                ))
              )}
            </div>`;

code = code.replace(targetStr2, replaceStr2);
fs.writeFileSync('src/components/AttendanceTab.tsx', code);
