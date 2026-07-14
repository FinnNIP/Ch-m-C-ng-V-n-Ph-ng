import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee } from '../types';
import { addEmployee, deleteEmployee, updateEmployee, saveEmployeesOrder } from '../sheets';
import { Search, User, Briefcase, UserPlus, Calendar, Trash2, Edit2, ChevronUp, ChevronDown } from 'lucide-react';
import DatePicker from './DatePicker';

interface EmployeesTabProps {
  accessToken: string;
  employees: Employee[];
  onEmployeeAdded: () => void;
}

export default function EmployeesTab({ accessToken, employees, onEmployeeAdded }: EmployeesTabProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Form states
  const [empName, setEmpName] = useState<string>('');
  const [empRole, setEmpRole] = useState<string>('Nhân viên');
  const [empRegisteredAt, setEmpRegisteredAt] = useState<string>('01/01/2026'); // Default to 01/01/2026 to match user's core requirement
  const [empLeftAt, setEmpLeftAt] = useState<string>(''); // Optional leaving date
  const [empLeaveAllowance, setEmpLeaveAllowance] = useState<string>(''); // Optional custom annual leave allowance
  const [empLeaveCarryover, setEmpLeaveCarryover] = useState<string>(''); // Optional custom carryover leave
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sorting / Reordering state
  const [isReordering, setIsReordering] = useState<boolean>(false);

  const handleMoveEmployee = async (name: string, direction: 'up' | 'down') => {
    if (isReordering) return;
    
    // Find the current index of this employee in the original main array
    const index = employees.findIndex(emp => emp.name === name);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= employees.length) return;

    // Swap the elements
    const newEmployees = [...employees];
    const temp = newEmployees[index];
    newEmployees[index] = newEmployees[targetIndex];
    newEmployees[targetIndex] = temp;

    setIsReordering(true);
    try {
      await saveEmployeesOrder(accessToken, newEmployees);
      onEmployeeAdded();
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi sắp xếp lại nhân viên: " + err.message);
    } finally {
      setIsReordering(false);
    }
  };

  // Delete states
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deletingState, setDeletingState] = useState<string | null>(null);

  // Edit states
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editRole, setEditRole] = useState<string>('Nhân viên');
  const [editRegisteredAt, setEditRegisteredAt] = useState<string>('01/01/2026');
  const [editLeftAt, setEditLeftAt] = useState<string>('');
  const [editLeaveAllowance, setEditLeaveAllowance] = useState<string>('');
  const [editLeaveCarryover, setEditLeaveCarryover] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Filtered list
  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditRole(emp.role);
    setEditRegisteredAt(emp.registeredAt || '01/01/2026');
    setEditLeftAt(emp.leftAt || '');
    setEditLeaveAllowance(emp.leaveAllowance !== undefined ? String(emp.leaveAllowance) : '');
    setEditLeaveCarryover(emp.leaveCarryover !== undefined ? String(emp.leaveCarryover) : '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    if (!editName.trim() || !editRole || !editRegisteredAt) {
      alert("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (
      editName.trim().toLowerCase() !== editingEmployee.name.trim().toLowerCase() &&
      employees.some(emp => emp.name.trim().toLowerCase() === editName.trim().toLowerCase())
    ) {
      alert("Nhân viên với tên mới này đã tồn tại trên hệ thống!");
      return;
    }

    if (!editingEmployee.rowIndex) {
      alert("Không thể chỉnh sửa nhân viên này do thiếu thông tin vị trí dòng (rowIndex).");
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateEmployee(
        accessToken,
        editingEmployee.rowIndex,
        editingEmployee.name,
        editName.trim(),
        editRole,
        editRegisteredAt,
        editLeftAt,
        editLeaveAllowance.trim() !== '' ? Number(editLeaveAllowance) : undefined,
        editLeaveCarryover.trim() !== '' ? Number(editLeaveCarryover) : undefined
      );
      alert("Cập nhật thông tin nhân viên thành công!");
      setEditingEmployee(null);
      onEmployeeAdded();
    } catch (err: any) {
      console.error(err);
      alert("Không thể cập nhật nhân viên: " + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empRole || !empRegisteredAt) {
      alert("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (employees.some(emp => emp.name.trim().toLowerCase() === empName.trim().toLowerCase())) {
      alert("Nhân viên này đã tồn tại trên hệ thống Google Sheets!");
      return;
    }

    setIsSubmitting(true);
    try {
      const newEmp: Employee = {
        name: empName.trim(),
        role: empRole,
        registeredAt: empRegisteredAt,
        leftAt: empLeftAt || undefined,
        leaveAllowance: empLeaveAllowance.trim() !== '' ? Number(empLeaveAllowance) : undefined,
        leaveCarryover: empLeaveCarryover.trim() !== '' ? Number(empLeaveCarryover) : undefined
      };

      await addEmployee(accessToken, newEmp);
      alert("Đăng ký hồ sơ nhân viên thành công vào Google Sheet!");
      onEmployeeAdded();
      setEmpName('');
      setEmpLeftAt('');
      setEmpLeaveAllowance('');
      setEmpLeaveCarryover('');
      setShowAddForm(false);
    } catch (err: any) {
      console.error(err);
      alert("Không thể thêm nhân viên mới: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!emp.rowIndex) {
      alert("Không thể xóa nhân viên này do thiếu thông tin vị trí dòng (rowIndex).");
      return;
    }
    setDeletingState(emp.name);
    try {
      await deleteEmployee(accessToken, emp.rowIndex);
      setIsDeleting(null);
      onEmployeeAdded();
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi xóa nhân viên: " + err.message);
    } finally {
      setDeletingState(null);
    }
  };

  return (
    <div id="employees-section" className="space-y-6">
      {/* Search and Action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Tìm nhân viên, chức vụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-800 dark:text-slate-100 transition-colors"
          />
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-full text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 active:scale-[0.98] cursor-pointer self-stretch sm:self-auto justify-center"
        >
          {showAddForm ? (
            <>Quay Lại Danh Sách</>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Đăng Ký Nhân Viên Mới
            </>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showAddForm ? (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.4 }}
            className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-lg max-w-xl mx-auto transition-colors duration-300"
          >
            <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                <UserPlus className="w-5 h-5" />
              </div>
              Nhập Hồ Sơ Nhân Viên Mới
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Họ Và Tên</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chức Vụ / Phòng ban</label>
                <select
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                >
                  <option value="Nhân viên">Nhân viên</option>
                  <option value="Trưởng phòng">Trưởng phòng</option>
                  <option value="Editor">Editor</option>
                  <option value="Designer">Designer</option>
                  <option value="Intern">Intern</option>
                  <option value="3D Generalist">3D Generalist</option>
                  <option value="Developer">Developer</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="HR Manager">HR Manager</option>
                  <option value="Video Editor">Video Editor</option>
                  <option value="Animator">Animator</option>
                  <option value="Marketing Specialist">Marketing Specialist</option>
                  <option value="Business Analyst">Business Analyst</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ngày Vào Làm</label>
                  <DatePicker
                    required
                    value={empRegisteredAt}
                    onChange={(val) => setEmpRegisteredAt(val)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ngày Rời Khỏi (Không bắt buộc)</label>
                  <DatePicker
                    value={empLeftAt}
                    onChange={(val) => setEmpLeftAt(val)}
                    placeholder="Bỏ trống nếu đang làm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Quỹ phép năm (Không bắt buộc)</label>
                  <input
                    type="number"
                    placeholder="Tự động theo ngày công & thâm niên"
                    value={empLeaveAllowance}
                    onChange={(e) => setEmpLeaveAllowance(e.target.value)}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Phép tồn năm 2025 (Không bắt buộc)</label>
                  <input
                    type="number"
                    placeholder="Bỏ trống để tự động gộp"
                    value={empLeaveCarryover}
                    onChange={(e) => setEmpLeaveCarryover(e.target.value)}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm font-bold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-full text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? "Đang đồng bộ..." : "Hoàn Tất Đăng Ký"}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="grid-list"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.4 }}
          >
            {filteredEmployees.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-[32px] border border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 transition-colors duration-300 shadow-sm">
                <User className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700 animate-pulse" />
                <p className="text-sm">Chưa có nhân viên nào trong danh sách hoặc không tìm thấy kết quả phù hợp</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fadeIn">
                {filteredEmployees.map((emp) => {
                  const mainIndex = employees.findIndex(e => e.name === emp.name);
                  return (
                    <div
                      key={emp.name}
                      className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center relative overflow-hidden group"
                    >
                      {/* Design accent in gradient matching M3 feel */}
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-sky-500" />

                      {/* Reordering buttons (only visible when logged in and hovered) */}
                      {accessToken && mainIndex !== -1 && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 opacity-100 transition-opacity z-10 no-print">
                          <button
                            disabled={isReordering || mainIndex === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveEmployee(emp.name, 'up');
                            }}
                            className={`p-1 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-150 dark:border-slate-700 transition-all cursor-pointer ${
                              mainIndex === 0 ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                            title="Di chuyển lên"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={isReordering || mainIndex === employees.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveEmployee(emp.name, 'down');
                            }}
                            className={`p-1 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-150 dark:border-slate-700 transition-all cursor-pointer ${
                              mainIndex === employees.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                            title="Di chuyển xuống"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Action buttons (only visible when not currently confirming) */}
                      {isDeleting !== emp.name && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          {/* Edit button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(emp);
                            }}
                            className="p-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/30 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/20 transition-all cursor-pointer"
                            title="Chỉnh sửa nhân viên"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDeleting(emp.name);
                            }}
                            className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/20 transition-all cursor-pointer"
                            title="Xóa nhân viên"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Icon Avatar placeholder */}
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mt-2 mb-4 transition-colors duration-300">
                        <User className="w-8 h-8" />
                      </div>

                      {/* Profile labels */}
                      <h4 className="font-bold text-slate-850 dark:text-slate-100 text-sm text-center mb-1 leading-snug line-clamp-1">{emp.name}</h4>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-4 flex items-center gap-1.5 bg-indigo-50/50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-full border border-indigo-100/20 dark:border-indigo-900/20">
                        <Briefcase className="w-3.5 h-3.5" />
                        {emp.role}
                      </p>

                      {/* Metadata Row */}
                      <div className="w-full border-t border-slate-50 dark:border-slate-800/60 pt-3 mt-auto flex flex-col gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          Vào làm: {emp.registeredAt || "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-indigo-500 font-bold text-xs">★</span>
                          Quỹ phép năm: {emp.leaveAllowance !== undefined ? `${emp.leaveAllowance} ngày` : "Tự động"}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-indigo-500 font-bold text-xs">⚡</span>
                          Phép tồn 2025: {emp.leaveCarryover !== undefined ? `${emp.leaveCarryover} ngày` : (() => {
                            const nameLower = emp.name.toLowerCase();
                            if (nameLower.includes('vũ') || nameLower.includes('vu')) return "12 ngày (Gối đầu)";
                            if (nameLower.includes('dũng') || nameLower.includes('dung')) return "10 ngày (Gối đầu)";
                            if (nameLower.includes('hảo') || nameLower.includes('hao')) return "6 ngày (Gối đầu)";
                            return "0 ngày";
                          })()}
                        </span>
                        {emp.leftAt && (
                          <span className="flex items-center gap-1 text-rose-500">
                            <Calendar className="w-3 h-3 text-rose-500" />
                            Rời khỏi: {emp.leftAt}
                          </span>
                        )}
                      </div>

                      {/* Confirm Deletion Overlay */}
                      {isDeleting === emp.name && (
                        <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center p-4 z-10 animate-fadeIn">
                          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-3 text-center leading-relaxed">
                            Xác nhận xóa nhân viên <br />
                            <span className="text-slate-800 dark:text-slate-100 text-sm font-extrabold">{emp.name}</span>?
                          </p>
                          <div className="flex gap-2 w-full">
                            <button
                              onClick={() => setIsDeleting(null)}
                              className="flex-1 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                            >
                              Hủy
                            </button>
                            <button
                              onClick={() => handleDelete(emp)}
                              disabled={deletingState === emp.name}
                              className="flex-1 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              {deletingState === emp.name ? "Đang xóa..." : "Xóa"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-visible transition-colors duration-300 relative">
            {/* Top accent */}
            <div className="h-1.5 rounded-t-[32px] bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500" />
            
            <div className="p-6 sm:p-8">
              <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                Chỉnh Sửa Hồ Sơ Nhân Viên
              </h3>

              <form onSubmit={handleSaveEdit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Họ Và Tên</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chức Vụ / Phòng ban</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                  >
                    <option value="Nhân viên">Nhân viên</option>
                    <option value="Trưởng phòng">Trưởng phòng</option>
                    <option value="Editor">Editor</option>
                    <option value="Designer">Designer</option>
                    <option value="Intern">Intern</option>
                    <option value="3D Generalist">3D Generalist</option>
                    <option value="Developer">Developer</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="HR Manager">HR Manager</option>
                    <option value="Video Editor">Video Editor</option>
                    <option value="Animator">Animator</option>
                    <option value="Marketing Specialist">Marketing Specialist</option>
                    <option value="Business Analyst">Business Analyst</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ngày Vào Làm</label>
                    <DatePicker
                      required
                      value={editRegisteredAt}
                      onChange={(val) => setEditRegisteredAt(val)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ngày Rời Khỏi (Để trống nếu còn làm)</label>
                    <DatePicker
                      value={editLeftAt}
                      onChange={(val) => setEditLeftAt(val)}
                      placeholder="Bỏ trống nếu đang làm"
                      align="right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Quỹ phép năm (Không bắt buộc)</label>
                    <input
                      type="number"
                      placeholder="Tự động theo ngày công & thâm niên"
                      value={editLeaveAllowance}
                      onChange={(e) => setEditLeaveAllowance(e.target.value)}
                      min="0"
                      max="100"
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Phép tồn năm 2025 (Không bắt buộc)</label>
                    <input
                      type="number"
                      placeholder="Bỏ trống để tự động gộp"
                      value={editLeaveCarryover}
                      onChange={(e) => setEditLeaveCarryover(e.target.value)}
                      min="0"
                      max="100"
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(null)}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm font-bold transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-full text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingEdit ? "Đang lưu..." : "Lưu Thay Đổi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
