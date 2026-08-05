const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

const targetStr = `  // Filtered employees list
  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase())
  );`;

const replaceStr = `  // Filtered employees list
  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedFilteredEmployees = useMemo(() => {
    const groups: Record<string, typeof filteredEmployees> = {};
    filteredEmployees.forEach(emp => {
      const dept = emp.department || 'Chưa phân bổ';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(emp);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEmployees]);`;

code = code.replace(targetStr, replaceStr);

const targetStr2 = `                      {/* Employee List Container */}
                      <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredEmployees.length === 0 ? (
                          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs italic bg-slate-50/50 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-800/50 rounded-2xl">
                            Không tìm thấy nhân viên nào khớp với từ khóa tìm kiếm.
                          </div>
                        ) : (
                          filteredEmployees.map(emp => {`;

const replaceStr2 = `                      {/* Employee List Container */}
                      <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                        {groupedFilteredEmployees.length === 0 ? (
                          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs italic bg-slate-50/50 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-800/50 rounded-2xl">
                            Không tìm thấy nhân viên nào khớp với từ khóa tìm kiếm.
                          </div>
                        ) : (
                          groupedFilteredEmployees.map(([dept, emps]) => (
                            <div key={dept} className="space-y-3.5">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-700"></div>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{dept}</span>
                                <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-700"></div>
                              </div>
                              {emps.map(emp => {`;

code = code.replace(targetStr2, replaceStr2);

const targetStr3 = `                            {/* Time logs history link (Bottom) */}
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </form>
              </div>`;

const replaceStr3 = `                            {/* Time logs history link (Bottom) */}
                          </motion.div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </form>
          </div>`;

// Since targetStr3 might not match exactly, I'll search for it differently if needed.
fs.writeFileSync('src/components/AttendanceTab.tsx', code);
