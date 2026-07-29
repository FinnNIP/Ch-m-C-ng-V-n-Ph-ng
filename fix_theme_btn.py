with open('src/App.tsx', 'r') as f:
    content = f.read()

old_inline = """         {/* Floating Theme Toggle */}
         <div className="absolute top-6 right-6 z-50">
           <motion.button
             whileHover={{ scale: 1.03 }}
             whileTap={{ scale: 0.97 }}
             onClick={() => setIsDarkMode(!isDarkMode)}
             className="p-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-orange-500/10 dark:hover:from-amber-500/20 dark:hover:to-orange-500/20 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-colors"
             title="Chuyển đổi giao diện"
           >
             <AnimatePresence mode="wait" initial={false}>
               <motion.div
                 key={isDarkMode ? "sun" : "moon"}
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 transition={{ type: "spring", stiffness: 300, damping: 20 }}
                 className="flex items-center gap-1.5"
               >
                 {isDarkMode ? (
                   <>
                     <Sun className="w-4 h-4 text-amber-500" />
                     <span className="hidden sm:inline">Giao diện sáng</span>
                   </>
                 ) : (
                   <>
                     <Moon className="w-4 h-4 text-indigo-500" />
                     <span className="hidden sm:inline">Giao diện tối</span>
                   </>
                 )}
               </motion.div>
             </AnimatePresence>
           </motion.button>
         </div>"""

new_inline = """         {/* Floating Theme Toggle */}
         <div className="absolute top-6 right-6 z-50">
           <ThemeToggle isDarkMode={isDarkMode} onChange={setIsDarkMode} />
         </div>"""

if old_inline in content:
    content = content.replace(old_inline, new_inline)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Fixed inline button in App.tsx")
else:
    print("Not found old_inline in App.tsx")

