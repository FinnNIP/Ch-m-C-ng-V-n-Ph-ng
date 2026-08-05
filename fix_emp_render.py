import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

# Generate grouped view logic
grouped_logic = """  const groupedEmployees = useMemo(() => {
    const groups: { department: string; employees: Employee[] }[] = [];
    const deptMap = new Map<string, Employee[]>();
    
    filteredEmployees.forEach(emp => {
      const dept = (emp.department || '').trim() || 'Chưa Phân Bổ';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, []);
      }
      deptMap.get(dept)!.push(emp);
    });

    deptMap.forEach((emps, dept) => {
      groups.push({ department: dept, employees: emps });
    });

    groups.sort((a, b) => {
      if (a.department === 'Chưa Phân Bổ') return 1;
      if (b.department === 'Chưa Phân Bổ') return -1;
      return a.department.localeCompare(b.department);
    });

    return groups;
  }, [filteredEmployees]);
"""

# Insert grouped logic right after filteredEmployees
content = content.replace(
    "  const filteredEmployees = employees.filter(e =>\n    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||\n    e.role.toLowerCase().includes(searchTerm.toLowerCase())\n  );",
    "  const filteredEmployees = employees.filter(e =>\n    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||\n    e.role.toLowerCase().includes(searchTerm.toLowerCase())\n  );\n\n" + grouped_logic
)

# Table Render logic replacement
old_table_body = """                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                      {filteredEmployees.map((emp, idx) => {
                        const mainIndex = employees.findIndex(e => e.name === emp.name);
                        const carryover = emp.leaveCarryover !== undefined ? emp.leaveCarryover : getInitialCarryover(emp.name);
                        return (
                          <motion.tr
                            key={emp.name}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{
                              backgroundColor: "rgba(99, 102, 241, 0.08)",
                              scale: 1.002,
                              y: -1,
                              boxShadow: "0 4px 16px -4px rgba(99, 102, 241, 0.15)"
                            }}
                            transition={{ duration: 0.3, delay: idx * 0.03 }}
                            className="bg-white dark:bg-slate-900 group"
                          >
                            <td className="py-3.5 px-4 text-center font-medium text-slate-500 dark:text-slate-400">
                              {mainIndex !== -1 ? mainIndex + 1 : '-'}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                {emp.name}
                              </div>
                              <div className="text-[10px] text-indigo-500 mt-0.5">
                                Xuất: {getDisplayNameFromList(emp.name, false, employees, true)}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                              {emp.role}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                              {emp.department || <span className="italic text-slate-400">Trống</span>}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                              {emp.registeredAt || '01/01/2026'}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex flex-col gap-1 items-center justify-center">
                                <span className={`inline-flex items-center justify-center min-w-[36px] px-2 py-1 rounded-md text-[10px] font-bold ${emp.leaveAllowance !== undefined ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                  {emp.leaveAllowance !== undefined ? (emp.leaveAllowance > 0 ? `+${emp.leaveAllowance}` : emp.leaveAllowance) : 'Mặc định'}
                                </span>
                                {carryover > 0 && (
                                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" title="Phép tồn">
                                    Tồn: {carryover}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {privateBirthdays[emp.name] ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-lg text-[10px] font-bold border border-pink-100 dark:border-pink-500/20">
                                  <span>🎂</span> {privateBirthdays[emp.name]}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(emp)}
                                  className="text-slate-400 hover:text-pink-500 hover:underline cursor-pointer"
                                >
                                  + Thêm
                                </button>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right pr-6">
                              <div className="flex items-center justify-end gap-1.5">
                                {accessToken && mainIndex !== -1 && (
                                  <>
                                    <button
                                      disabled={isReordering || mainIndex === 0}
                                      onClick={() => handleMoveEmployee(emp.name, 'up')}
                                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-400 hover:text-indigo-600 cursor-pointer disabled:opacity-30"
                                      title="Lên"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      disabled={isReordering || mainIndex === employees.length - 1}
                                      onClick={() => handleMoveEmployee(emp.name, 'down')}
                                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-400 hover:text-indigo-600 cursor-pointer disabled:opacity-30"
                                      title="Xuống"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                                  </>
                                )}
                                <button
                                  onClick={() => handleStartEdit(emp)}
                                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                                  title="Chỉnh sửa"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(emp)}
                                  disabled={deletingState === emp.name}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>"""

new_table_body = """                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                      {groupedEmployees.map((group, groupIdx) => (
                        <React.Fragment key={group.department}>
                          {/* Group Header Row */}
                          <tr className="bg-slate-100/70 dark:bg-slate-800/40">
                            <td colSpan={8} className="py-2.5 px-4 border-l-4 border-indigo-500">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{group.department}</span>
                                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-md text-[10px] font-bold">
                                  {group.employees.length} Nhân sự
                                </span>
                              </div>
                            </td>
                          </tr>
                          {group.employees.map((emp, idx) => {
                            const mainIndex = employees.findIndex(e => e.name === emp.name);
                            const carryover = emp.leaveCarryover !== undefined ? emp.leaveCarryover : getInitialCarryover(emp.name);
                            return (
                              <motion.tr
                                key={emp.name}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{
                                  backgroundColor: "rgba(99, 102, 241, 0.08)",
                                  scale: 1.002,
                                  y: -1,
                                  boxShadow: "0 4px 16px -4px rgba(99, 102, 241, 0.15)"
                                }}
                                transition={{ duration: 0.3, delay: idx * 0.02 }}
                                className="bg-white dark:bg-slate-900 group"
                              >
                                <td className="py-3.5 px-4 text-center font-medium text-slate-500 dark:text-slate-400">
                                  {mainIndex !== -1 ? mainIndex + 1 : '-'}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                    {emp.name}
                                  </div>
                                  <div className="text-[10px] text-indigo-500 mt-0.5">
                                    Xuất: {getDisplayNameFromList(emp.name, false, employees, true)}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                                  {emp.role}
                                </td>
                                <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                                  {emp.department || <span className="italic text-slate-400">Trống</span>}
                                </td>
                                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                                  {emp.registeredAt || '01/01/2026'}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex flex-col gap-1 items-center justify-center">
                                    <span className={`inline-flex items-center justify-center min-w-[36px] px-2 py-1 rounded-md text-[10px] font-bold ${emp.leaveAllowance !== undefined ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                      {emp.leaveAllowance !== undefined ? (emp.leaveAllowance > 0 ? `+${emp.leaveAllowance}` : emp.leaveAllowance) : 'Mặc định'}
                                    </span>
                                    {carryover > 0 && (
                                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" title="Phép tồn">
                                        Tồn: {carryover}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  {privateBirthdays[emp.name] ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-lg text-[10px] font-bold border border-pink-100 dark:border-pink-500/20">
                                      <span>🎂</span> {privateBirthdays[emp.name]}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => { playConfirmSound(); handleStartEdit(emp); }}
                                      className="text-slate-400 hover:text-pink-500 hover:underline cursor-pointer"
                                    >
                                      + Thêm
                                    </button>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right pr-6">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {accessToken && mainIndex !== -1 && (
                                      <>
                                        <button
                                          disabled={isReordering || mainIndex === 0}
                                          onClick={() => { playTabSound(); handleMoveEmployee(emp.name, 'up'); }}
                                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-400 hover:text-indigo-600 cursor-pointer disabled:opacity-30"
                                          title="Lên"
                                        >
                                          <ChevronUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          disabled={isReordering || mainIndex === employees.length - 1}
                                          onClick={() => { playTabSound(); handleMoveEmployee(emp.name, 'down'); }}
                                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-400 hover:text-indigo-600 cursor-pointer disabled:opacity-30"
                                          title="Xuống"
                                        >
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                                      </>
                                    )}
                                    <button
                                      onClick={() => { playConfirmSound(); handleStartEdit(emp); }}
                                      className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                                      title="Chỉnh sửa"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => { playTabSound(); handleDelete(emp); }}
                                      disabled={deletingState === emp.name}
                                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                                      title="Xóa"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>"""
content = content.replace(old_table_body, new_table_body)


# Now fix Grid View
old_grid = """              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredEmployees.map((emp, idx) => {
                  const mainIndex = employees.findIndex(e => e.name === emp.name);
                  return (
                    <motion.div
                      layout
                      key={emp.name}
                      initial={{ opacity: 0, scale: 0.96, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -6, scale: 1.018, boxShadow: "0 20px 30px -10px rgba(99, 102, 241, 0.15)" }}
                      transition={{ duration: 0.3, delay: idx * 0.05, ease: "easeOut" }}
                      className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 shadow-sm transition-colors duration-200 flex flex-col items-center relative overflow-hidden group cursor-default"
                    >
                      {/* Design accent in gradient matching M3 feel */}
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500 bg-[length:200%_auto] group-hover:bg-right transition-all duration-500" />
                      
                      {/* Reordering buttons (only visible when logged in and hovered) */}
                      {accessToken && mainIndex !== -1 && (
                        <div className="absolute right-3 top-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            disabled={isReordering || mainIndex === 0}
                            onClick={() => handleMoveEmployee(emp.name, 'up')}
                            className="p-1 rounded-md bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-indigo-900/50 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            disabled={isReordering || mainIndex === employees.length - 1}
                            onClick={() => handleMoveEmployee(emp.name, 'down')}
                            className="p-1 rounded-md bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-indigo-900/50 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center mb-3 sm:mb-4 border-4 border-white dark:border-slate-900 shadow-sm relative group-hover:scale-105 group-hover:shadow-indigo-500/20 transition-all duration-500">
                        <User className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-300 dark:text-indigo-600" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                        </div>
                      </div>
                      
                      <h3 className="font-sans font-black text-slate-900 dark:text-white text-base sm:text-lg text-center mb-1 line-clamp-1 px-2">
                        {emp.name}
                      </h3>
                      
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800/80 rounded-full mb-4 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{emp.role}</span>
                      </div>
                      
                      <div className="w-full space-y-3 px-1 sm:px-2 flex-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">Tên hiển thị (Xuất):</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{getDisplayNameFromList(emp.name, false, employees, true)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">Ngày vào làm:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{emp.registeredAt || '01/01/2026'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">Bộ phận:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{emp.department || <span className="italic text-slate-400">Trống</span>}</span>
                        </div>
                      </div>
                      
                      <div className="w-full mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
                        <button
                          onClick={() => handleStartEdit(emp)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Sửa
                        </button>
                        <div className="w-px h-6 bg-slate-100 dark:bg-slate-800 mx-2" />
                        <button
                          onClick={() => handleDelete(emp)}
                          disabled={deletingState === emp.name}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {deletingState === emp.name ? (
                            <RandomLoader />
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              Xóa
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>"""

new_grid = """              <div className="flex flex-col gap-10">
                {groupedEmployees.map((group, groupIdx) => (
                  <div key={group.department} className="w-full animate-fadeIn">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent" />
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">{group.department}</h3>
                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold border border-indigo-100/50 dark:border-indigo-800/50 shadow-sm">
                          {group.employees.length} Nhân Sự
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-l from-slate-200 dark:from-slate-800 to-transparent" />
                    </div>
                    
                    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                      {group.employees.map((emp, idx) => {
                        const mainIndex = employees.findIndex(e => e.name === emp.name);
                        return (
                          <motion.div
                            layout
                            key={emp.name}
                            initial={{ opacity: 0, scale: 0.96, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            whileHover={{ y: -6, scale: 1.018, boxShadow: "0 20px 30px -10px rgba(99, 102, 241, 0.15)" }}
                            transition={{ duration: 0.3, delay: idx * 0.05, ease: "easeOut" }}
                            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 shadow-sm transition-colors duration-200 flex flex-col items-center relative overflow-hidden group cursor-default"
                          >
                            {/* Design accent in gradient matching M3 feel */}
                            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500 bg-[length:200%_auto] group-hover:bg-right transition-all duration-500" />
                            
                            {/* Reordering buttons (only visible when logged in and hovered) */}
                            {accessToken && mainIndex !== -1 && (
                              <div className="absolute right-3 top-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  disabled={isReordering || mainIndex === 0}
                                  onClick={() => { playTabSound(); handleMoveEmployee(emp.name, 'up'); }}
                                  className="p-1 rounded-md bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-indigo-900/50 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  disabled={isReordering || mainIndex === employees.length - 1}
                                  onClick={() => { playTabSound(); handleMoveEmployee(emp.name, 'down'); }}
                                  className="p-1 rounded-md bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-indigo-900/50 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center mb-3 sm:mb-4 border-4 border-white dark:border-slate-900 shadow-sm relative group-hover:scale-105 group-hover:shadow-indigo-500/20 transition-all duration-500">
                              <User className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-300 dark:text-indigo-600" />
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center">
                                <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                              </div>
                            </div>
                            
                            <h3 className="font-sans font-black text-slate-900 dark:text-white text-base sm:text-lg text-center mb-1 line-clamp-1 px-2">
                              {emp.name}
                            </h3>
                            
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800/80 rounded-full mb-4 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                              <Briefcase className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500" />
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{emp.role}</span>
                            </div>
                            
                            <div className="w-full space-y-3 px-1 sm:px-2 flex-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium">Tên hiển thị:</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{getDisplayNameFromList(emp.name, false, employees, true)}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium">Ngày vào làm:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">{emp.registeredAt || '01/01/2026'}</span>
                              </div>
                            </div>
                            
                            <div className="w-full mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
                              <button
                                onClick={() => { playConfirmSound(); handleStartEdit(emp); }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Sửa
                              </button>
                              <div className="w-px h-6 bg-slate-100 dark:bg-slate-800 mx-2" />
                              <button
                                onClick={() => { playTabSound(); handleDelete(emp); }}
                                disabled={deletingState === emp.name}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {deletingState === emp.name ? (
                                  <RandomLoader />
                                ) : (
                                  <>
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Xóa
                                  </>
                                )}
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </div>
                ))}
              </div>"""

content = content.replace(old_grid, new_grid)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
