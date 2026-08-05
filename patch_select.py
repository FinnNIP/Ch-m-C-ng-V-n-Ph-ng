import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

# Add Form
old_add_dept = """                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ phận (Tuỳ chọn)</label>
                  <input
                    type="text"
                    placeholder="Vd: Văn phòng, Kỹ thuật..."
                    value={empDepartment}
                    onChange={(e) => setEmpDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                  />
                </div>"""

new_add_dept = """                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ phận (Tuỳ chọn)</label>
                  <select
                    value={empDepartment}
                    onChange={(e) => setEmpDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                  >
                    <option value="">-- Chọn hoặc bỏ trống --</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>"""
content = content.replace(old_add_dept, new_add_dept)


# Edit Form
old_edit_dept = """                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ phận (Tuỳ chọn)</label>
                          <input
                            type="text"
                            placeholder="Vd: Văn phòng, Kỹ thuật..."
                            value={editEmpDepartment}
                            onChange={(e) => setEditEmpDepartment(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                          />
                        </div>"""

new_edit_dept = """                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ phận (Tuỳ chọn)</label>
                          <select
                            value={editEmpDepartment}
                            onChange={(e) => setEditEmpDepartment(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                          >
                            <option value="">-- Chọn hoặc bỏ trống --</option>
                            {departments.map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </div>"""
content = content.replace(old_edit_dept, new_edit_dept)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
