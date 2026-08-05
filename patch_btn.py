import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

old_btn = """          <motion.button
            whileHover={{ scale: 1.025, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-full text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer justify-center"
          >
            {showAddForm ? (
              <>Quay Lại Danh Sách</>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Đăng Ký Nhân Viên Mới
              </>
            )}
          </motion.button>"""

new_btn = """          {!showAddForm && (
            <motion.button
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowDeptManager(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-sm font-bold flex items-center gap-2 transition-all cursor-pointer justify-center"
            >
              <Sliders className="w-4 h-4" />
              Quản lý Bộ Phận
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.025, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-full text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer justify-center"
          >
            {showAddForm ? (
              <>Quay Lại Danh Sách</>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Đăng Ký Nhân Viên Mới
              </>
            )}
          </motion.button>"""
content = content.replace(old_btn, new_btn)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
