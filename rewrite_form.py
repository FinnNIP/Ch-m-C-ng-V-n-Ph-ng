import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

old_form_pattern = r'<form onSubmit=\{handleSubmit\}.*?(?:</form>)'
new_form = """<form onSubmit={(e) => { playConfirmSound(); handleSubmit(e); }} className="space-y-6">
              {/* THÔNG TIN CƠ BẢN */}
              <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  Thông tin cơ bản
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Họ Và Tên (Admin Quản Lý)</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={empName}
                      onChange={(e) => { setEmpName(e.target.value); setEmpExportName(getExportName(e.target.value)); }}
                      className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Tên Xuất Báo Cáo / Hiển Thị</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Nhi, Thuận, Dũng, Hảo..."
                      value={empExportName}
                      onChange={(e) => setEmpExportName(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-950/60 border border-indigo-200 dark:border-indigo-900/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
                    />
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1.5 font-semibold leading-relaxed">
                      🔒 Chỉ dùng tên này cho Guest hoặc khi xuất PNG/PDF.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>🎂</span> Sinh Nhật (Bảo Mật)
                    </label>
                    <DatePicker 
                      value={empBirthday} 
                      onChange={setEmpBirthday} 
                      placeholder="Chọn ngày sinh nhật"
                    />
                  </div>
                </div>
              </div>

              {/* CÔNG VIỆC & CHỨC VỤ */}
              <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-500" />
                  Công việc & Chức vụ
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chức Vụ</label>
                    <select
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
                    >
                      {[
                        "Nhân viên", "Trưởng phòng", "Editor", "Designer", "Intern", 
                        "3D Generalist", "Developer", "Project Manager", "HR Manager", 
                        "Video Editor", "Animator", "Marketing Specialist", "Business Analyst"
                      ].map(role => (
                        <option key={role} value={role} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ phận (Tuỳ chọn)</label>
                    <input
                      type="text"
                      placeholder="Vd: Kỹ thuật, Văn phòng..."
                      value={empDepartment}
                      onChange={(e) => setEmpDepartment(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Ngày Vào Làm
                  </label>
                  <DatePicker 
                    value={empRegisteredAt} 
                    onChange={setEmpRegisteredAt} 
                    placeholder="Chọn ngày vào làm"
                  />
                </div>
              </div>
              
              <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-rose-500" />
                  Cấu hình ngày phép nghỉ (Đơn giản & Trực quan)
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Điều chỉnh số ngày phép (+ hoặc -)
                    </label>
                    <input
                      type="text"
                      placeholder="Gõ số dương để cộng thêm, số âm để trừ bớt (Ví dụ: +5 hoặc -2)"
                      value={empLeaveCarryover}
                      onChange={(e) => setEmpLeaveCarryover(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5 font-semibold leading-relaxed">
                      💡 <strong>Cách quản lý cực đơn giản:</strong> Để trống để hệ thống tự động tính quỹ phép chuẩn. Gõ <span className="text-emerald-500">+5</span> để cộng thêm 5 ngày phép (thưởng thâm niên, phép cũ) hoặc gõ <span className="text-rose-500">-2</span> để trừ bớt 2 ngày phép.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_8px_16px_-6px_rgba(79,70,229,0.4)] hover:shadow-[0_12px_20px_-6px_rgba(79,70,229,0.5)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <RandomLoader />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Lưu Hồ Sơ Nhân Viên
                    </>
                  )}
                </button>
              </div>
            </form>"""

content = re.sub(old_form_pattern, new_form, content, flags=re.DOTALL, count=1)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
print("Done")
