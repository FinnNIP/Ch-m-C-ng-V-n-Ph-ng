import re

with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

# We need to replace the viewMode === 'table' ? ( ... ) : ( <motion.div layout className="grid ..."> ... </motion.div> ) structure.
# Instead of a complex regex, we can just replace the start of the false branch of the ternary.

old_grid_start = """            ) : (
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredEmployees.map((emp, idx) => {"""

new_grid_start = """            ) : (
              <div className="space-y-12">
                {groupedEmployees.map((group, groupIdx) => (
                  <div key={group.department} className="space-y-6">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="w-2.5 h-6 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                      {group.department}
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold ml-2 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm">
                        {group.employees.length} nhân sự
                      </span>
                    </h3>
                    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                      {group.employees.map((emp, idx) => {"""

content = content.replace(old_grid_start, new_grid_start)

old_card_end = """                        </span>
                        {emp.leftAt && (
                          <span className="flex items-center gap-1 text-rose-500 mt-0.5">
                            <span className="text-[11px]">🔴</span>
                            Nghỉ việc: {emp.leftAt}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>"""

new_card_end = """                        </span>
                        {emp.leftAt && (
                          <span className="flex items-center gap-1 text-rose-500 mt-0.5">
                            <span className="text-[11px]">🔴</span>
                            Nghỉ việc: {emp.leftAt}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                    </motion.div>
                  </div>
                ))}
              </div>
            )}
          </AnimatePresence>"""

content = content.replace(old_card_end, new_card_end)

# Also let's add the pill department in the card
old_role_p = """                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-4 flex items-center gap-1.5 bg-indigo-50/50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-full border border-indigo-100/20 dark:border-indigo-900/20">
                        <Briefcase className="w-3.5 h-3.5" />
                        {emp.role}
                      </p>"""

new_role_p = """                      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5 bg-indigo-50/80 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-100/40 dark:border-indigo-900/30 shadow-xs">
                          <Briefcase className="w-3.5 h-3.5" />
                          {emp.role}
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-50/80 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-100/40 dark:border-emerald-900/30 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
                          {emp.department || 'Chưa phân bổ'}
                        </p>
                      </div>"""

content = content.replace(old_role_p, new_role_p)


with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)

print("done")
