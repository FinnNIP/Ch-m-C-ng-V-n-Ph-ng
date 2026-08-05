import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

# Replace <select> for department with <input>
# First, the Add form
add_form_dept_old = """              <div>
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

add_form_dept_new = """              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ phận (Tuỳ chọn)</label>
                <input
                  type="text"
                  placeholder="Vd: Kỹ thuật, Văn phòng..."
                  value={empDepartment}
                  onChange={(e) => setEmpDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                />
              </div>"""
content = content.replace(add_form_dept_old, add_form_dept_new)

edit_form_dept_old = """                      <div>
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

edit_form_dept_new = """                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ phận (Tuỳ chọn)</label>
                        <input
                          type="text"
                          placeholder="Vd: Kỹ thuật, Văn phòng..."
                          value={editEmpDepartment}
                          onChange={(e) => setEditEmpDepartment(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                        />
                      </div>"""
content = content.replace(edit_form_dept_old, edit_form_dept_new)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
