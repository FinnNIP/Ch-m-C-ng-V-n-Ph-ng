with open('src/components/EmployeePortal.tsx', 'r') as f:
    content = f.read()

old_inline = """          {onToggleDarkMode && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onToggleDarkMode}
              className="p-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-orange-500/10 dark:hover:from-amber-500/20 dark:hover:to-orange-500/20 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-colors"
              title="Chuyển đổi giao diện"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isDarkMode ? "sun" : "moon"}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5"
                >
                  {isDarkMode ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Sáng</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Tối</span>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          )}"""

new_inline = """          {onToggleDarkMode && isDarkMode !== undefined && (
            <ThemeToggle isDarkMode={isDarkMode} onChange={onToggleDarkMode} />
          )}"""

if "import { ThemeToggle }" not in content:
    content = content.replace("import { RandomLoader } from './RandomLoader';", "import { RandomLoader } from './RandomLoader';\nimport { ThemeToggle } from './ThemeToggle';")

if old_inline in content:
    content = content.replace(old_inline, new_inline)
    with open('src/components/EmployeePortal.tsx', 'w') as f:
        f.write(content)
    print("Fixed inline button in EmployeePortal.tsx")
else:
    print("Not found old_inline in EmployeePortal.tsx")

