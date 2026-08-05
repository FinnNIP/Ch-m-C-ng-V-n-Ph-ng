import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

# Add states
state_injection = """  const [departments, setDepartments] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('company_departments');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['Văn phòng', 'Kỹ thuật', 'Marketing', 'Kế toán', 'Nhân sự'];
  });
  const [showDeptManager, setShowDeptManager] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  const saveDepartments = (depts: string[]) => {
    setDepartments(depts);
    localStorage.setItem('company_departments', JSON.stringify(depts));
  };
"""

content = content.replace("  // Form states", state_injection + "\n  // Form states")

# Add Dept Manager Modal
modal_injection = """      {/* Manage Departments Modal */}
      <AnimatePresence>
        {showDeptManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-[28px] p-6 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Quản Lý Bộ Phận</h3>
                <button
                  onClick={() => setShowDeptManager(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tên bộ phận mới..."
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                  <button
                    onClick={() => {
                      if (newDeptName.trim() && !departments.includes(newDeptName.trim())) {
                        saveDepartments([...departments, newDeptName.trim()]);
                        setNewDeptName('');
                      }
                    }}
                    disabled={!newDeptName.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    Thêm
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                  {departments.length === 0 && (
                    <p className="text-center text-sm text-slate-500 py-4">Chưa có bộ phận nào.</p>
                  )}
                  {departments.map((dept, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{dept}</span>
                      <button
                        onClick={() => {
                          if (window.confirm(`Xóa bộ phận "${dept}"?`)) {
                            saveDepartments(departments.filter(d => d !== dept));
                          }
                        }}
                        className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
"""

content = content.replace("  return (\n    <div className=\"space-y-6 sm:space-y-8 animate-fadeIn max-w-[1920px] mx-auto pb-20\">", "  return (\n    <div className=\"space-y-6 sm:space-y-8 animate-fadeIn max-w-[1920px] mx-auto pb-20\">\n" + modal_injection)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
