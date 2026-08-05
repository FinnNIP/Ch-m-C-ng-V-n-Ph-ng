import re
with open('src/components/ReportsTab.tsx', 'r') as f:
    content = f.read()

# Add uniqueDepartments useMemo right before the return statement inside ReportsTab component.
# First let's find the `return (` statement at the end of the hooks.
old_return = """  return (
    <div className="space-y-6 pb-20 max-w-[1920px] mx-auto">"""

new_return = """  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return ['Tất cả', ...Array.from(depts), 'Chưa phân bổ'];
  }, [employees]);

  return (
    <div className="space-y-6 pb-20 max-w-[1920px] mx-auto">"""
content = content.replace(old_return, new_return)


# Now update the search box area
old_search_area = """            {/* Search Input */}
            <div className="w-full sm:w-64 relative">"""

new_search_area = """            {/* Search Input & Filter */}
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
              
              <div className="w-full sm:w-64 relative">"""
content = content.replace(old_search_area, new_search_area)

old_end_search = """              />
            </div>
          </div>"""

new_end_search = """              />
              </div>
            </div>
          </div>"""
content = content.replace(old_end_search, new_end_search)

with open('src/components/ReportsTab.tsx', 'w') as f:
    f.write(content)
