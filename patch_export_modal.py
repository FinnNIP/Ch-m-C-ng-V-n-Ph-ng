import re
with open('src/components/ReportsTab.tsx', 'r') as f:
    content = f.read()

# Modify export Excel button
old_btn = """                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playConfirmSound();
                    handleDownloadExcel();
                  }}
                  disabled={isDownloadingExcel}
                  className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-full text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isDownloadingExcel ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  )}
                  <span>{isDownloadingExcel ? "Đang tạo Excel..." : "Tải dạng Excel"}</span>
                </motion.button>"""

new_btn = """                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playConfirmSound();
                    setExcelExportDept(filterDepartment);
                    setShowExcelExportModal(true);
                  }}
                  disabled={isDownloadingExcel}
                  className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-full text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isDownloadingExcel ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  )}
                  <span>{isDownloadingExcel ? "Đang tạo Excel..." : "Tải dạng Excel"}</span>
                </motion.button>"""

content = content.replace(old_btn, new_btn)

# Add Export Modal at the end of ReportsTab render
modal_code = """
      {/* Excel Export Modal */}
      <AnimatePresence>
        {showExcelExportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-[24px] p-6 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Tùy chọn xuất Excel</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Chọn bộ phận xuất:</label>
                <select
                  value={excelExportDept}
                  onChange={(e) => setExcelExportDept(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                >
                  {uniqueDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowExcelExportModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    setShowExcelExportModal(false);
                    handleDownloadExcel(excelExportDept);
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  Xuất File
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
"""

content = content.replace("    </div>\n  );\n};\n", modal_code)

with open('src/components/ReportsTab.tsx', 'w') as f:
    f.write(content)
