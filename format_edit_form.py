import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

# We need to find the edit form section.
old_edit_form = """                  <form onSubmit={handleSaveEdit} className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Edit2 className="w-5 h-5 text-indigo-500" />
                        Chỉnh sửa: {editingEmployee.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setEditingEmployee(null)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Họ & Tên *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ví dụ: Nguyễn Văn A"
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            setEditExportName(getExportName(e.target.value));
                          }}
                          className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Tên Xuất Báo Cáo / Tên Hiển Thị (Dùng cho PNG / PDF / Excel & Guest)</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Nhi, Thuận, Dũng, Hảo (Được dùng khi xuất file)"
                          value={editExportName}
                          onChange={(e) => setEditExportName(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-indigo-200 dark:border-indigo-900/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                        />
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">
                          🔒 Admin thấy Họ & Tên đầy đủ. Khi xuất PNG/PDF/Excel hoặc cho khách xem, hệ thống CHỈ dùng tên này ("{editExportName || getExportName(editName)}").
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chức Vụ</label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer appearance-none"
                        >
                          <option value="Nhân viên">Nhân viên</option>
                          <option value="Quản lý">Quản lý</option>
                          <option value="Giám đốc">Giám đốc</option>
                          <option value="Thực tập sinh">Thực tập sinh</option>
                          {['Trưởng phòng', 'Phó phòng', 'Chuyên viên'].map(role => (
                            <option key={role} value={role}>
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
                          value={editEmpDepartment}
                          onChange={(e) => setEditEmpDepartment(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Ngày Vào Làm
                          </label>
                          <DatePicker
                            value={editRegisteredAt}
                            onChange={setEditRegisteredAt}
                            placeholder="Chọn ngày vào làm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Ngày Rời Khỏi (Tuỳ chọn)
                          </label>
                          <DatePicker
                            value={editLeftAt}
                            onChange={setEditLeftAt}
                            placeholder="Bỏ trống nếu đang làm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Điều Chỉnh Số Phép Bù / Phạt
                          </label>
                          <input
                            type="number"
                            placeholder="Ví dụ: 1 hoặc -1 (để trống: Mặc định)"
                            value={editLeaveAllowance}
                            onChange={(e) => setEditLeaveAllowance(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Để trống hệ thống sẽ tính theo ngày vào làm (1 phép/tháng từ ngày vào làm tới hiện tại, tối đa 12 phép)</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Số Phép Tồn Năm Ngoái
                          </label>
                          <input
                            type="number"
                            placeholder="Ví dụ: 2 (để trống = tự động tính)"
                            value={editLeaveCarryover}
                            onChange={(e) => setEditLeaveCarryover(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Ghi đè số phép tồn từ năm trước chuyển sang</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span>🎂</span> Sinh Nhật (Riêng tư - Chỉ Admin thấy)
                        </label>
                        <DatePicker
                          value={editBirthday}
                          onChange={setEditBirthday}
                          placeholder="Chọn ngày sinh nhật"
                        />
                        <p className="text-[10px] text-pink-600/70 dark:text-pink-400/70 mt-1">Ngày sinh này sẽ KHÔNG bao giờ bị hiển thị hay rò rỉ khi xuất ảnh/PDF hay khi khách vào xem.</p>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setEditingEmployee(null)}
                          className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
                        >
                          Hủy
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={isSavingEdit}
                          className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isSavingEdit ? (
                            <RandomLoader />
                          ) : (
                            <>Lưu Thay Đổi</>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </form>"""

new_edit_form = """                  <form onSubmit={(e) => { playConfirmSound(); handleSaveEdit(e); }} className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Edit2 className="w-5 h-5 text-indigo-500" />
                        Hồ Sơ: {editingEmployee.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => { playTabSound(); setEditingEmployee(null); }}
                        className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-500/20 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-6">
                      {/* THÔNG TIN CƠ BẢN */}
                      <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <User className="w-4 h-4 text-indigo-500" />
                          Thông tin cơ bản
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Họ & Tên *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ví dụ: Nguyễn Văn A"
                              value={editName}
                              onChange={(e) => {
                                setEditName(e.target.value);
                                setEditExportName(getExportName(e.target.value));
                              }}
                              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Tên Xuất Báo Cáo / Hiển Thị</label>
                            <input
                              type="text"
                              placeholder="Ví dụ: Nhi, Thuận, Dũng, Hảo..."
                              value={editExportName}
                              onChange={(e) => setEditExportName(e.target.value)}
                              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-950/60 border border-indigo-200 dark:border-indigo-900/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
                            />
                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-semibold leading-relaxed">
                              🔒 Dùng để hiển thị cho Guest hoặc khi xuất PNG/PDF. (Hiện tại: "{editExportName || getExportName(editName)}")
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <span>🎂</span> Sinh Nhật (Bảo mật)
                            </label>
                            <DatePicker
                              value={editBirthday}
                              onChange={setEditBirthday}
                              placeholder="Chọn ngày sinh nhật"
                            />
                            <p className="text-[10px] text-pink-600/70 dark:text-pink-400/70 mt-1 font-medium">Chỉ Admin mới có thể xem thông tin này.</p>
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
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer appearance-none shadow-sm"
                            >
                              <option value="Nhân viên">Nhân viên</option>
                              <option value="Quản lý">Quản lý</option>
                              <option value="Giám đốc">Giám đốc</option>
                              <option value="Thực tập sinh">Thực tập sinh</option>
                              {['Trưởng phòng', 'Phó phòng', 'Chuyên viên'].map(role => (
                                <option key={role} value={role}>
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
                              value={editEmpDepartment}
                              onChange={(e) => setEditEmpDepartment(e.target.value)}
                              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Ngày Vào Làm
                            </label>
                            <DatePicker
                              value={editRegisteredAt}
                              onChange={setEditRegisteredAt}
                              placeholder="Chọn ngày vào làm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-rose-500" /> Ngày Rời Khỏi (Tuỳ chọn)
                            </label>
                            <DatePicker
                              value={editLeftAt}
                              onChange={setEditLeftAt}
                              placeholder="Bỏ trống nếu đang làm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* NGÀY PHÉP */}
                      <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-amber-500" />
                          Thiết lập ngày phép
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                              Điều Chỉnh Bù/Phạt
                            </label>
                            <input
                              type="number"
                              placeholder="Vd: 1 hoặc -1 (Để trống: Tự động)"
                              value={editLeaveAllowance}
                              onChange={(e) => setEditLeaveAllowance(e.target.value)}
                              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
                            />
                            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">Để trống sẽ tính theo mặc định: 1 phép/tháng từ ngày vào làm (tối đa 12 phép).</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                              Số Phép Tồn Năm Ngoái
                            </label>
                            <input
                              type="number"
                              placeholder="Vd: 2 (Để trống: Tự động tính)"
                              value={editLeaveCarryover}
                              onChange={(e) => setEditLeaveCarryover(e.target.value)}
                              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
                            />
                            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">Ghi đè số phép còn dư từ năm trước chuyển sang.</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => { playTabSound(); setEditingEmployee(null); }}
                          className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all cursor-pointer shadow-sm hover:shadow"
                        >
                          Hủy
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={isSavingEdit}
                          className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm hover:shadow-md hover:shadow-indigo-500/20"
                        >
                          {isSavingEdit ? (
                            <RandomLoader />
                          ) : (
                            <>
                              <Edit2 className="w-4 h-4" />
                              Lưu Thay Đổi
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </form>"""

content = content.replace(old_edit_form, new_edit_form)

# Add playConfirmSound to the add employee form's onSubmit
add_form_submit_old = "onSubmit={handleAddEmployee}"
add_form_submit_new = 'onSubmit={(e) => { playConfirmSound(); handleAddEmployee(e); }}'
content = content.replace(add_form_submit_old, add_form_submit_new)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
