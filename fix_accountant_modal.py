with open('src/App.tsx', 'r') as f:
    content = f.read()

old_modal = """          {/* Custom Accountant Login Modal */}
          <AnimatePresence>
            {showAccountantModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 no-swipe bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] border border-slate-150 dark:border-slate-800 p-6 shadow-2xl relative text-left"
                >
                  <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 shadow-inner">
                    <Printer className="w-6 h-6" />
                  </div>
                  
                  <h3 className="font-sans font-extrabold text-lg text-slate-850 dark:text-slate-100 mb-1">Mã khóa bảo mật Kế toán</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                    Vui lòng nhập Mã khóa bảo mật do Admin cấp riêng để mở chế độ xem Báo cáo & Thống kê.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <input
                        type="password"
                        value={accountantInputKey}
                        onChange={(e) => {
                          setAccountantInputKey(e.target.value);
                          setAccountantError("");
                        }}
                        placeholder="Nhập mã bảo mật kế toán..."
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-center font-sans tracking-widest text-base focus:ring-2 focus:ring-rose-500 outline-none text-slate-850 dark:text-slate-100 shadow-inner"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAccountantLoginSubmit();
                          }
                        }}
                      />
                      {accountantError && (
                        <p className="text-rose-500 text-[11px] text-center font-semibold mt-1">
                          {accountantError}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAccountantModal(false)}
                        className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition-all active:scale-[0.98] cursor-pointer"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="button"
                        onClick={handleAccountantLoginSubmit}
                        className="flex-1 h-11 hover-gradient-wipe-rose text-white font-bold rounded-2xl text-xs shadow-md transition-all cursor-pointer"
                      >
                        Xác nhận
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>"""

new_modal = """          {/* Custom Accountant Login Modal */}
          <AnimatePresence>
            {showAccountantModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 no-swipe bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl w-full max-w-md rounded-[32px] border border-slate-150/50 dark:border-slate-800/50 p-8 shadow-[0_0_40px_-15px_rgba(244,63,94,0.3)] relative text-left overflow-hidden"
                >
                  {/* Decorative neon blobs inside modal */}
                  <div className="absolute top-[-20%] right-[-10%] w-[200px] h-[200px] rounded-full bg-rose-500/20 blur-[60px] pointer-events-none" />
                  <div className="absolute bottom-[-20%] left-[-10%] w-[200px] h-[200px] rounded-full bg-orange-500/20 blur-[60px] pointer-events-none" />

                  {isLoading ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-6 space-y-6 animate-pulse z-10 relative"
                    >
                      <div className="w-20 h-20 bg-slate-200/50 dark:bg-slate-800/50 rounded-full" />
                      <div className="h-6 bg-slate-200/50 dark:bg-slate-800/50 rounded w-1/2" />
                      <div className="h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded w-3/4" />
                      <div className="w-full space-y-3 mt-4">
                        <div className="h-12 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl w-full" />
                        <div className="flex gap-3">
                           <div className="h-11 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl flex-1" />
                           <div className="h-11 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl flex-1" />
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative z-10 flex flex-col items-center"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-orange-500 rounded-full flex items-center justify-center text-white mb-5 shadow-lg shadow-rose-500/30 border-4 border-white dark:border-slate-800 relative group overflow-hidden">
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Printer className="w-10 h-10 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    
                    <h3 className="font-sans font-black text-2xl text-slate-850 dark:text-slate-100 mb-2 text-center tracking-tight">Kế toán viên</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 text-center leading-relaxed px-4">
                      Vui lòng nhập Mã khóa bảo mật do Admin cấp riêng để xác thực danh tính.
                    </p>
                    
                    <div className="space-y-5 w-full">
                      <div className="space-y-1 relative group">
                        <input
                          type="password"
                          value={accountantInputKey}
                          onChange={(e) => {
                            setAccountantInputKey(e.target.value);
                            setAccountantError("");
                          }}
                          placeholder="Nhập mã bảo mật kế toán..."
                          className="w-full px-4 py-4 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl text-center font-sans tracking-widest text-base focus:ring-2 focus:ring-rose-500/50 outline-none text-slate-850 dark:text-slate-100 shadow-inner transition-all placeholder:text-slate-400/70 dark:placeholder:text-slate-600/70 group-hover:border-rose-200 dark:group-hover:border-rose-900/50"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAccountantLoginSubmit();
                            }
                          }}
                        />
                        {accountantError && (
                          <motion.p 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="text-rose-500 text-[11px] text-center font-bold mt-2 bg-rose-50 dark:bg-rose-950/50 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/50"
                          >
                            {accountantError}
                          </motion.p>
                        )}
                      </div>
                      
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAccountantModal(false)}
                          className="flex-1 h-12 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs sm:text-sm transition-all active:scale-[0.98] cursor-pointer border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="button"
                          onClick={handleAccountantLoginSubmit}
                          disabled={isLoading}
                          className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-[0_4px_20px_-5px_rgba(244,63,94,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              Xác nhận
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>"""

if old_modal in content:
    content = content.replace(old_modal, new_modal)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Replaced successfully.")
else:
    print("Could not find old modal exact string.")
