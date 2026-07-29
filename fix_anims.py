import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Update logo animation
old_logo = """            <div className="w-14 h-14 bg-indigo-600 dark:bg-indigo-500 rounded-[22px] flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 dark:shadow-none animate-bounce-slow">
              <Clock className="w-7 h-7" />
            </div>"""

new_logo = """            <motion.div 
              initial={{ rotate: -15, scale: 0.8, opacity: 0 }} 
              animate={{ rotate: 0, scale: 1, opacity: 1 }} 
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-14 h-14 bg-indigo-600 dark:bg-indigo-500 rounded-[22px] flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 dark:shadow-none cursor-pointer"
            >
              <Clock className="w-7 h-7" />
            </motion.div>"""
content = content.replace(old_logo, new_logo)

# 2. Update Header text animation
old_header = """            <div>
              <h1 className="font-sans font-black text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 tracking-tight leading-none pb-2 inline-block border-b-2 border-transparent gradient-border-image">Chấm Công Phòng Visual</h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-450 mt-2 max-w-md">
                Cổng thông tin chấm công hàng ngày, tra cứu ngày phép gối đầu và phân tích thống kê OT tự động.
              </p>
            </div>"""

new_header = """            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="font-sans font-black text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 tracking-tight leading-none pb-2 inline-block border-b-2 border-transparent gradient-border-image">Chấm Công Phòng Visual</h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-450 mt-2 max-w-md">
                Cổng thông tin chấm công hàng ngày, tra cứu ngày phép gối đầu và phân tích thống kê OT tự động.
              </p>
            </motion.div>"""
content = content.replace(old_header, new_header)

# 3. Add stagger to buttons
old_buttons = """            <div className="space-y-4">
              {/* Google Admin Login Button */}
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full h-12 flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-md hover:shadow-lg hover:shadow-indigo-500/20 cursor-pointer disabled:opacity-50 text-xs"
              >"""

new_buttons = """            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              className="space-y-4"
            >
              {/* Google Admin Login Button */}
              <motion.button
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full h-12 flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-indigo-500/20 cursor-pointer disabled:opacity-50 text-xs"
              >"""
content = content.replace(old_buttons, new_buttons)

old_buttons_2 = """              </button>

              <div className="flex items-center justify-center py-1">
                <div className="h-px bg-slate-200 dark:bg-slate-800 w-full"></div>
                <span className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-white dark:bg-slate-900 absolute">Hoặc</span>
              </div>
              
              {/* Employee Gateway Access */}
              <button
                onClick={() => {
                  window.location.href = '?role=employee';
                }}
                className="w-full h-11 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-sky-500 hover:text-white dark:bg-indigo-950/40 dark:hover:from-indigo-500 dark:hover:to-sky-400 dark:hover:text-white text-indigo-700 dark:text-indigo-400 font-extrabold rounded-2xl transition-all duration-300 active:scale-[0.98] cursor-pointer text-xs shadow-sm hover:shadow-lg hover:shadow-indigo-500/25"
              >"""

new_buttons_2 = """              </motion.button>

              <motion.div 
                variants={{
                  hidden: { opacity: 0, scale: 0.9 },
                  visible: { opacity: 1, scale: 1 }
                }}
                className="flex items-center justify-center py-1"
              >
                <div className="h-px bg-slate-200 dark:bg-slate-800 w-full"></div>
                <span className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-white dark:bg-slate-900 absolute">Hoặc</span>
              </motion.div>
              
              {/* Employee Gateway Access */}
              <motion.button
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  window.location.href = '?role=employee';
                }}
                className="w-full h-11 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-sky-500 hover:text-white dark:bg-indigo-950/40 dark:hover:from-indigo-500 dark:hover:to-sky-400 dark:hover:text-white text-indigo-700 dark:text-indigo-400 font-extrabold rounded-2xl transition-all duration-300 cursor-pointer text-xs shadow-sm hover:shadow-lg hover:shadow-indigo-500/25"
              >"""
content = content.replace(old_buttons_2, new_buttons_2)

old_buttons_3 = """              </button>
              
              {/* Accountant Gateway Access - Safe custom modal flow */}
              <button
                onClick={() => {
                  const savedKey = localStorage.getItem('accountant_key') || 'visual-accounting';
                  setAccountantInputKey(savedKey);
                  setAccountantError("");
                  setShowAccountantModal(true);
                }}
                className="w-full h-11 flex items-center justify-center gap-2.5 bg-rose-50 hover:bg-gradient-to-r hover:from-rose-500 hover:to-orange-500 hover:text-white dark:bg-rose-950/30 dark:hover:from-rose-600 dark:hover:to-orange-500 dark:hover:text-white text-rose-700 dark:text-rose-400 font-extrabold rounded-2xl transition-all duration-300 active:scale-[0.98] cursor-pointer text-xs shadow-sm hover:shadow-lg hover:shadow-rose-500/25"
              >"""

new_buttons_3 = """              </motion.button>
              
              {/* Accountant Gateway Access - Safe custom modal flow */}
              <motion.button
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const savedKey = localStorage.getItem('accountant_key') || 'visual-accounting';
                  setAccountantInputKey(savedKey);
                  setAccountantError("");
                  setShowAccountantModal(true);
                }}
                className="w-full h-11 flex items-center justify-center gap-2.5 bg-rose-50 hover:bg-gradient-to-r hover:from-rose-500 hover:to-orange-500 hover:text-white dark:bg-rose-950/30 dark:hover:from-rose-600 dark:hover:to-orange-500 dark:hover:text-white text-rose-700 dark:text-rose-400 font-extrabold rounded-2xl transition-all duration-300 cursor-pointer text-xs shadow-sm hover:shadow-lg hover:shadow-rose-500/25"
              >"""
content = content.replace(old_buttons_3, new_buttons_3)

old_buttons_4 = """              </button>
            </div>
            )}"""

new_buttons_4 = """              </motion.button>
            </motion.div>
            )}"""
content = content.replace(old_buttons_4, new_buttons_4)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Finished adding animations")
