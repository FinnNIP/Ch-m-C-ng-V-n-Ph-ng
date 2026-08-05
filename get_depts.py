import re
with open('src/components/ReportsTab.tsx', 'r') as f:
    content = f.read()

old_header = """          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-500" />
              Tổng Kết Chấm Công Tháng {selectedMonth}/{selectedYear}
            </h2>
            
            {/* Search Input */}"""

new_header = """  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return ['Tất cả', ...Array.from(depts), 'Chưa phân bổ'];
  }, [employees]);

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 shrink-0">
              <PieChart className="w-4 h-4 text-indigo-500" />
              Tổng Kết Chấm Công Tháng {selectedMonth}/{selectedYear}
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-150 font-semibold"
              >
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              {/* Search Input */}"""
content = content.replace(old_header, new_header)

old_end = """              />
            </div>
          </div>"""
new_end = """              />
            </div>
            </div>
          </div>"""
content = content.replace(old_end, new_end)

with open('src/components/ReportsTab.tsx', 'w') as f:
    f.write(content)
