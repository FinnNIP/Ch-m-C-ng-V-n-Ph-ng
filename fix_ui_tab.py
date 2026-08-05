import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

# Add to table header
content = content.replace(
    '<th className="py-4 px-4 whitespace-nowrap">Chức Vụ</th>',
    '<th className="py-4 px-4 whitespace-nowrap">Chức Vụ</th>\n                        <th className="py-4 px-4 whitespace-nowrap">Bộ Phận</th>'
)

# In SkeletonEmployeesList
# The skeleton already has the same replace since it's a global replace, wait, I need to make sure Skeleton has it too.
# Let's replace the td in Skeleton
old_skeleton_td = """                <td className="py-4 px-4">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-24"></div>
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-20"></div>
                </td>"""
new_skeleton_td = """                <td className="py-4 px-4">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-24"></div>
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-24"></div>
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-20"></div>
                </td>"""
content = content.replace(old_skeleton_td, new_skeleton_td)

# Replace the td in real table
old_table_td = """                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                          {emp.role}
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400">"""
new_table_td = """                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                          {emp.role}
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400 font-medium">
                          {emp.department || <span className="text-slate-300 dark:text-slate-600 italic">--</span>}
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400">"""
content = content.replace(old_table_td, new_table_td)

# Replace the grid item
old_grid_role = """                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{emp.role}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-4">"""
new_grid_role = """                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{emp.role}</p>
                    </div>
                  </div>
                  
                  {emp.department && (
                    <div className="mt-3 px-3 py-1.5 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-lg self-start">
                      <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        {emp.department}
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-4">"""
content = content.replace(old_grid_role, new_grid_role)


# Add input in Add form
old_add_role = """              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chức Vụ / Phòng ban</label>
                <select
                  value={empRole}"""
new_add_role = """              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chức Vụ</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                  >
                    {[
                      "Nhân viên", "Trưởng phòng", "Editor", "Designer", "Intern", 
                      "3D Generalist", "Developer", "Project Manager", "HR Manager", 
                      "Video Editor", "Animator", "Marketing Specialist", "Business Analyst"
                    ].map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ phận (Tuỳ chọn)</label>
                  <input
                    type="text"
                    placeholder="Vd: Văn phòng, Kỹ thuật..."
                    value={empDepartment}
                    onChange={(e) => setEmpDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                  />
                </div>
              </div>"""

# Remove old select block from content
old_select_block = """              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chức Vụ / Phòng ban</label>
                <select
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                >
                  {[
                    "Nhân viên", "Trưởng phòng", "Editor", "Designer", "Intern", 
                    "3D Generalist", "Developer", "Project Manager", "HR Manager", 
                    "Video Editor", "Animator", "Marketing Specialist", "Business Analyst"
                  ].map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>"""

content = content.replace(old_select_block, new_add_role, 1)

old_edit_select_block = """                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chức Vụ / Phòng ban</label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                        >
                          {[
                            "Nhân viên", "Trưởng phòng", "Editor", "Designer", "Intern", 
                            "3D Generalist", "Developer", "Project Manager", "HR Manager", 
                            "Video Editor", "Animator", "Marketing Specialist", "Business Analyst"
                          ].map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>"""

new_edit_role = """                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chức Vụ</label>
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                          >
                            {[
                              "Nhân viên", "Trưởng phòng", "Editor", "Designer", "Intern", 
                              "3D Generalist", "Developer", "Project Manager", "HR Manager", 
                              "Video Editor", "Animator", "Marketing Specialist", "Business Analyst"
                            ].map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ phận (Tuỳ chọn)</label>
                          <input
                            type="text"
                            placeholder="Vd: Văn phòng, Kỹ thuật..."
                            value={editEmpDepartment}
                            onChange={(e) => setEditEmpDepartment(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                          />
                        </div>
                      </div>"""

content = content.replace(old_edit_select_block, new_edit_role, 1)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
