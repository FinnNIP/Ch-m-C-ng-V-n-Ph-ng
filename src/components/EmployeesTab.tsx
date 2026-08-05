import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee } from '../types';
import { addEmployee, deleteEmployee, updateEmployee, saveEmployeesOrder, deleteAllData } from '../sheets';
import { Search, User, Briefcase, UserPlus, Calendar, Trash2, Edit2, ChevronUp, ChevronDown, LayoutGrid, List, X, Sliders, Settings, Check } from 'lucide-react';
import DatePicker from './DatePicker';
import { playConfirmSound, playTabSound } from '../sound';
import { RandomLoader } from './RandomLoader';
import { getDisplayNameFromList, getExportName, saveStoredExportName, getStoredExportNames } from '../utils/nameUtils';

interface EmployeesTabProps {
  accessToken: string;
  employees: Employee[];
  onEmployeeAdded: () => void;
  isLoading?: boolean;
}

function SkeletonEmployeesList({ viewMode }: { viewMode: 'grid' | 'table' }) {
  if (viewMode === 'table') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] overflow-hidden shadow-sm transition-colors duration-300">
        <div onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()} className="overflow-x-auto">
          <table className="no-swipe w-full min-w-[800px] md:min-w-0 text-left border-collapse">
            <thead>
              <tr className="no-swipe bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-4 whitespace-nowrap text-center w-12">STT</th>
                <th className="py-4 px-4 whitespace-nowrap">Họ & Tên Nhân Viên</th>
                <th className="py-4 px-4 whitespace-nowrap">Chức Vụ</th>
                <th className="py-4 px-4 whitespace-nowrap">Bộ Phận</th>
                <th className="py-4 px-4 whitespace-nowrap">Ngày Vào Làm</th>
                <th className="py-4 px-4 whitespace-nowrap text-center">Điều Chỉnh Phép</th>
                <th className="py-4 px-4 whitespace-nowrap">Sinh Nhật 🔒</th>
                <th className="py-4 px-4 whitespace-nowrap text-right pr-6">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {Array.from({ length: 6 }).map((_, idx) => (
                <motion.tr 
                  key={idx} 
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: [0.4, 0.85, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: idx * 0.1 }}
                >
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-300 dark:text-slate-700">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-28" />
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-5 bg-indigo-50 dark:bg-indigo-950/40 rounded-full w-20" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-20" />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-lg w-16 mx-auto" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
                  </td>
                  <td className="py-3.5 px-4 text-right pr-6">
                    <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-16 ml-auto" />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 8 }).map((_, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: idx * 0.1 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
          <div className="h-5 bg-indigo-50 dark:bg-indigo-950/40 rounded-full w-24" />
          <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3 mx-auto" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2 mx-auto" />
          </div>
        </motion.div>
      ))}

    </div>
  );
}


const getInitialCarryover = (name: string): number => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('vũ') || nameLower.includes('vu')) return 12;
  if (nameLower.includes('dũng') || nameLower.includes('dung')) return 10;
  if (nameLower.includes('hảo') || nameLower.includes('hao')) return 6;
  return 0;
};

export default function EmployeesTab({ accessToken, employees, onEmployeeAdded, isLoading }: EmployeesTabProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [departments, setDepartments] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('company_departments');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['Văn phòng', 'Kỹ thuật', 'Marketing', 'Kế toán', 'Nhân sự'];
  });



  const saveDepartments = (depts: string[]) => {
    setDepartments(depts);
    localStorage.setItem('company_departments', JSON.stringify(depts));
  };

  // Form states
  const [empName, setEmpName] = useState<string>('');
  const [empExportName, setEmpExportName] = useState<string>(''); // Tên xuất file / Tên hiển thị (e.g. Nhi)
  const [empRole, setEmpRole] = useState<string>('Nhân viên');
  const [empRegisteredAt, setEmpRegisteredAt] = useState<string>('01/01/2026'); // Default to 01/01/2026 to match user's core requirement
  const [empLeftAt, setEmpLeftAt] = useState<string>(''); // Optional leaving date
  const [empLeaveAllowance, setEmpLeaveAllowance] = useState<string>(''); // Optional custom annual leave allowance
  const [empLeaveCarryover, setEmpLeaveCarryover] = useState<string>(''); // Optional custom carryover leave
  const [empBirthday, setEmpBirthday] = useState<string>(''); // Private birthday
  const [empDepartment, setEmpDepartment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Private birthdays dictionary (keyed by employee name, value is DD/MM/YYYY or similar)
  const [privateBirthdays, setPrivateBirthdays] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('private_birthdays') || '{}');
    } catch {
      return {};
    }
  });

  const updatePrivateBirthday = (name: string, date: string) => {
    const updated = { ...privateBirthdays };
    if (!date) {
      delete updated[name];
    } else {
      updated[name] = date;
    }
    setPrivateBirthdays(updated);
    localStorage.setItem('private_birthdays', JSON.stringify(updated));
  };

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

  // Quick leave adjustment state
  const [updatingLeaveEmp, setUpdatingLeaveEmp] = useState<string | null>(null);

  // Edit states
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editExportName, setEditExportName] = useState<string>(''); // Tên xuất file / Tên hiển thị
  const [editRole, setEditRole] = useState<string>('Nhân viên');
  const [editRegisteredAt, setEditRegisteredAt] = useState<string>('01/01/2026');
  const [editLeftAt, setEditLeftAt] = useState<string>('');
  const [editLeaveAllowance, setEditLeaveAllowance] = useState<string>('');
  const [editLeaveCarryover, setEditLeaveCarryover] = useState<string>('');
  const [editBirthday, setEditBirthday] = useState<string>('');
  const [editEmpDepartment, setEditEmpDepartment] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Filtered list
  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.displayName && e.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.department && e.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedEmployees = useMemo(() => {
    const groups: { department: string; employees: Employee[] }[] = [];
    const deptMap = new Map<string, Employee[]>();
    
    filteredEmployees.forEach(emp => {
      const dept = (emp.department || '').trim() || 'Chưa Phân Bổ';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, []);
      }
      deptMap.get(dept)!.push(emp);
    });

    deptMap.forEach((emps, dept) => {
      groups.push({ department: dept, employees: emps });
    });

    groups.sort((a, b) => {
      if (a.department === 'Chưa Phân Bổ') return 1;
      if (b.department === 'Chưa Phân Bổ') return -1;
      return a.department.localeCompare(b.department);
    });

    return groups;
  }, [filteredEmployees]);


  const handleStartEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditExportName(getExportName(emp.name));
    setEditRole(emp.role);
    
    setEditRegisteredAt(emp.registeredAt || '01/01/2026');
    setEditLeftAt(emp.leftAt || '');
    setEditLeaveAllowance(emp.leaveAllowance !== undefined ? String(emp.leaveAllowance) : '');
    setEditLeaveCarryover(emp.leaveCarryover !== undefined ? String(emp.leaveCarryover) : '');
    setEditBirthday(privateBirthdays[emp.name] || '');
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
        editLeaveCarryover.trim() !== '' ? Number(editLeaveCarryover) : undefined,
        editExportName.trim() !== '' ? editExportName.trim() : undefined,
        undefined
      );

      // Save custom export name for PNG/PDF/Excel exports
      saveStoredExportName(editName.trim(), editExportName.trim());

      // Save department if it's new
      if (editEmpDepartment.trim() && !departments.includes(editEmpDepartment.trim())) {
        saveDepartments([...departments, editEmpDepartment.trim()]);
      }

      // Save private birthday
      if (editName.trim() !== editingEmployee.name) {
        const bday = editBirthday || privateBirthdays[editingEmployee.name];
        const updated = { ...privateBirthdays };
        delete updated[editingEmployee.name];
        if (bday) {
          updated[editName.trim()] = bday;
        }
        setPrivateBirthdays(updated);
        localStorage.setItem('private_birthdays', JSON.stringify(updated));
      } else {
        updatePrivateBirthday(editingEmployee.name, editBirthday);
      }

      showToast("Cập nhật thông tin nhân viên thành công!");
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
        leaveCarryover: empLeaveCarryover.trim() !== '' ? Number(empLeaveCarryover) : undefined,
        displayName: empExportName.trim() || undefined,
        department: empDepartment.trim() || undefined
      };

      await addEmployee(accessToken, newEmp);

      // Save custom export name if entered
      if (empExportName.trim()) {
        saveStoredExportName(empName.trim(), empExportName.trim());
      }
      
      // Save department if it's new
      if (empDepartment.trim() && !departments.includes(empDepartment.trim())) {
        saveDepartments([...departments, empDepartment.trim()]);
      }

      // Save private birthday if entered
      if (empBirthday) {
        updatePrivateBirthday(empName.trim(), empBirthday);
      }

      showToast("Đăng ký hồ sơ nhân viên thành công!");
      onEmployeeAdded();
      setEmpName('');
      setEmpExportName('');
      setEmpLeftAt('');
      setEmpLeaveAllowance('');
      setEmpLeaveCarryover('');
      setEmpBirthday('');
      setShowAddForm(false);
    } catch (err: any) {
      console.error(err);
      alert("Không thể thêm nhân viên mới: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn xóa TOÀN BỘ nhân viên và dữ liệu chấm công liên quan không?\n\nHành động này sẽ làm trống hệ thống để bắt đầu lại từ đầu và KHÔNG THỂ hoàn tác!")) {
      return;
    }
    
    setIsDeletingAll(true);
    try {
      await deleteAllData(accessToken);
      
      // Clear private birthdays
      setPrivateBirthdays({});
      localStorage.removeItem('private_birthdays');
      
      alert("Đã xóa toàn bộ nhân sự và dữ liệu chấm công thành công. Hệ thống đã trở về trạng thái trống!");
      onEmployeeAdded(); // triggers a full refresh in App.tsx
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi xóa toàn bộ dữ liệu: " + err.message);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!emp.rowIndex) {
      alert("Không thể xóa nhân viên này do thiếu thông tin vị trí dòng (rowIndex).");
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhân viên ${emp.name}? Hành động này không thể hoàn tác.`)) {
      return;
    }
    setDeletingState(emp.name);
    try {
      await deleteEmployee(accessToken, emp.rowIndex);

      // Remove private birthday
      const updated = { ...privateBirthdays };
      delete updated[emp.name];
      setPrivateBirthdays(updated);
      localStorage.setItem('private_birthdays', JSON.stringify(updated));

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
        <div className="flex items-center gap-3 w-full sm:w-auto">
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

          {!showAddForm && (
            <div className="hidden sm:flex items-center bg-white dark:bg-slate-900 p-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-full transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Chế độ Thẻ Grid"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden md:inline">Thẻ</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-full transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Chế độ Bảng Danh Sách"
              >
                <List className="w-4 h-4" />
                <span className="hidden md:inline">Bảng</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto flex-col sm:flex-row">
          <motion.button
            whileHover={{ scale: 1.025, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDeleteAll}
            disabled={isDeletingAll || employees.length === 0}
            className="w-full sm:w-auto px-5 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-900/50 rounded-full text-sm font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed justify-center"
          >
            <Trash2 className="w-4 h-4" />
            {isDeletingAll ? "Đang xóa..." : "Xóa tất cả"}
          </motion.button>



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
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showAddForm ? (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.4 }}
            className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-lg max-w-xl mx-auto transition-colors duration-300"
          >
            <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                <UserPlus className="w-5 h-5" />
              </div>
              Nhập Hồ Sơ Nhân Viên Mới
            </h3>

            <form onSubmit={(e) => { playConfirmSound(); handleSubmit(e); }} className="space-y-6">
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
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ Phận</label>
                    <input
                      type="text"
                      list="dept-list"
                      placeholder="Nhập hoặc chọn bộ phận..."
                      value={empDepartment}
                      onChange={(e) => setEmpDepartment(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
                    />
                    <datalist id="dept-list">
                      {departments.map(d => <option key={d} value={d} />)}
                    </datalist>
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
            {isLoading ? (
              
              viewMode === 'table' ? (
                <div className="py-12 flex flex-col items-center justify-center min-h-[250px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px]">
                  <RandomLoader 
                    message="Đang tải dữ liệu chấm công từ máy chủ..." 
                    autoCycle={true}
                    cycleIntervalMs={2000}
                    themeColor="text-indigo-600 dark:text-indigo-400"
                  />
                </div>
              ) : (
                <SkeletonEmployeesList viewMode={viewMode} />
              )
            ) : filteredEmployees.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-[32px] border border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 transition-colors duration-300 shadow-sm">
                <User className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700 animate-pulse" />
                <p className="text-sm">Chưa có nhân viên nào trong danh sách hoặc không tìm thấy kết quả phù hợp</p>
              </div>
            ) : viewMode === 'table' ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] overflow-hidden shadow-sm transition-colors duration-300">
                <div onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()} className="overflow-x-auto">
                  <table className="no-swipe w-full min-w-max text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="no-swipe bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <th className="py-4 px-4 whitespace-nowrap text-center w-12">STT</th>
                        <th className="py-4 px-4 whitespace-nowrap">Họ & Tên Nhân Viên</th>
                        <th className="py-4 px-4 whitespace-nowrap">Chức Vụ</th>
                <th className="py-4 px-4 whitespace-nowrap">Bộ Phận</th>
                <th className="py-4 px-4 whitespace-nowrap">Ngày Vào Làm</th>
                        <th className="py-4 px-4 whitespace-nowrap text-center">Điều Chỉnh Phép</th>
                        <th className="py-4 px-4 whitespace-nowrap">Sinh Nhật 🔒</th>
                        <th className="py-4 px-4 whitespace-nowrap text-right pr-6">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                      {filteredEmployees.map((emp, idx) => {
                        const mainIndex = employees.findIndex(e => e.name === emp.name);
                        const carryover = emp.leaveCarryover !== undefined ? emp.leaveCarryover : getInitialCarryover(emp.name);
                        return (
                          <motion.tr
                            key={emp.name}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.03 }}
                            className="group transition-colors duration-200 cursor-default hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
                                  {emp.name.charAt(0)}
                                </div>
                                <div>
                                  <span className="block font-bold text-sm text-slate-850 dark:text-slate-100">{getDisplayNameFromList(emp.name, !!accessToken, employees)}</span>
                                  <span className="inline-block text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded border border-indigo-100/50 dark:border-indigo-900/30 mt-0.5">
                                    Xuất file: {getExportName(emp.name)}
                                  </span>
                                  {emp.leftAt && (
                                    <span className="text-[10px] text-rose-500 font-mono block mt-0.5">Nghỉ: {emp.leftAt}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] border border-indigo-100/30 dark:border-indigo-900/20">
                                <Briefcase className="w-3 h-3" />
                                {emp.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-sm font-medium">
                              {emp.department || "Chưa phân bổ"}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                              {emp.registeredAt || "N/A"}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block font-mono font-bold px-2.5 py-1 rounded-lg ${
                                carryover > 0 
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
                                  : carryover < 0 
                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}>
                                {carryover > 0 ? `+${carryover}` : carryover} ngày
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                              {privateBirthdays[emp.name] ? (
                                <span className="font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-1">
                                  <span>🎂</span> {privateBirthdays[emp.name]}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(emp)}
                                  className="text-slate-400 hover:text-pink-500 hover:underline cursor-pointer"
                                >
                                  + Thêm
                                </button>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right pr-6">
                              <div className="flex items-center justify-end gap-1.5">
                                {accessToken && mainIndex !== -1 && (
                                  <>
                                    <button
                                      disabled={isReordering || mainIndex === 0}
                                      onClick={() => handleMoveEmployee(emp.name, 'up')}
                                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-400 hover:text-indigo-600 cursor-pointer disabled:opacity-30"
                                      title="Lên"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      disabled={isReordering || mainIndex === employees.length - 1}
                                      onClick={() => handleMoveEmployee(emp.name, 'down')}
                                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-400 hover:text-indigo-600 cursor-pointer disabled:opacity-30"
                                      title="Xuống"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleStartEdit(emp)}
                                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-400 hover:text-indigo-600 cursor-pointer"
                                  title="Chỉnh sửa"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setIsDeleting(emp.name)}
                                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                {groupedEmployees.map((group, groupIdx) => (
                  <div key={group.department} className="space-y-6">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="w-2.5 h-6 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                      {group.department}
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold ml-2 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm">
                        {group.employees.length} nhân sự
                      </span>
                    </h3>
                    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                      {group.employees.map((emp, idx) => {
                  const mainIndex = employees.findIndex(e => e.name === emp.name);
                  return (
                    <motion.div
                      layout
                      key={emp.name}
                      initial={{ opacity: 0, scale: 0.96, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ scale: 1.02, y: -4, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                      transition={{ duration: 0.3, delay: idx * 0.05, ease: "easeOut" }}
                      className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 shadow-sm transition-colors duration-200 flex flex-col items-center relative overflow-hidden group cursor-default"
                    >
                      {/* Design accent in gradient matching M3 feel */}
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500 bg-[length:200%_auto] group-hover:bg-right transition-all duration-500" />

                      {/* Reordering buttons (only visible when logged in and hovered) */}
                      {accessToken && mainIndex !== -1 && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 opacity-100 transition-opacity z-10 no-print">
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
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
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
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
                          </motion.button>
                        </div>
                      )}

                      {/* Action buttons (only visible when not currently confirming) */}
                      {isDeleting !== emp.name && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          {/* Edit button */}
                          <motion.button
                            whileHover={{ scale: 1.12 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(emp);
                            }}
                            className="p-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/30 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/20 transition-all cursor-pointer"
                            title="Chỉnh sửa nhân viên"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </motion.button>

                          {/* Delete button */}
                          <motion.button
                            whileHover={{ scale: 1.12 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDeleting(emp.name);
                            }}
                            className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/20 transition-all cursor-pointer"
                            title="Xóa nhân viên"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      )}

                      {/* Icon Avatar placeholder */}
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: 3 }}
                        transition={{ duration: 0.2 }}
                        className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mt-2 mb-4 transition-colors duration-300 shadow-xs"
                      >
                        <User className="w-8 h-8" />
                      </motion.div>

                      {/* Profile labels */}
                      <h4 className="font-bold text-slate-850 dark:text-slate-100 text-sm text-center mb-0.5 leading-snug line-clamp-1">{getDisplayNameFromList(emp.name, !!accessToken, employees)}</h4>
                      <span className="text-[10px] bg-indigo-50/80 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-md border border-indigo-100/40 dark:border-indigo-900/30 mb-2">
                        Xuất file: {getExportName(emp.name)}
                      </span>
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5 bg-indigo-50/80 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-100/40 dark:border-indigo-900/30 shadow-xs">
                          <Briefcase className="w-3.5 h-3.5" />
                          {emp.role}
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-50/80 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-100/40 dark:border-emerald-900/30 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
                          {emp.department || 'Chưa phân bổ'}
                        </p>
                      </div>

                      {/* Metadata Row */}
                      <div className="w-full border-t border-slate-50 dark:border-slate-800/60 pt-3 mt-auto flex flex-col gap-1 text-[11px] text-slate-450 dark:text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          Vào làm: {emp.registeredAt || "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-indigo-500 font-bold text-xs">★</span>
                          Quỹ phép chuẩn: {emp.leaveAllowance !== undefined ? `${emp.leaveAllowance} ngày` : "Tự động"}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-indigo-500 font-bold text-xs">⚙️</span>
                          Phép điều chỉnh: {emp.leaveCarryover !== undefined ? `${emp.leaveCarryover > 0 ? '+' : ''}${emp.leaveCarryover} ngày` : (() => {
                            const init = getInitialCarryover(emp.name);
                            return init > 0 ? `+${init} ngày` : "0 ngày";
                          })()}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-pink-500 text-[11px]">🎂</span>
                          Sinh nhật: {privateBirthdays[emp.name] ? (
                            <span className="text-slate-700 dark:text-slate-350 font-semibold">{privateBirthdays[emp.name]} <span className="text-[10px] text-pink-500 font-sans" title="Chỉ mình bạn thấy">(Riêng tư 🔒)</span></span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(emp);
                              }}
                              className="text-slate-400 dark:text-slate-500 hover:text-pink-500 dark:hover:text-pink-400 hover:underline cursor-pointer font-sans text-left"
                            >
                              Thêm (Riêng tư 🔒)
                            </button>
                          )}
                        </span>
                        {emp.leftAt && (
                          <span className="flex items-center gap-1 text-rose-500">
                            <Calendar className="w-3 h-3 text-rose-500" />
                            Rời khỏi: {emp.leftAt}
                          </span>
                        )}
                      </div>

                      {/* Quick Leave Adjuster Widget */}
                      <div className="w-full bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/60 mt-3 flex flex-col items-center gap-1.5 no-print">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Phép điều chỉnh nhanh</span>
                        <div className="flex items-center gap-1.5">
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            disabled={updatingLeaveEmp === emp.name || !emp.rowIndex}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!emp.rowIndex) return;
                              const currentVal = emp.leaveCarryover !== undefined ? emp.leaveCarryover : getInitialCarryover(emp.name);
                              const newVal = currentVal - 1;
                              setUpdatingLeaveEmp(emp.name);
                              try {
                                await updateEmployee(
                                  accessToken,
                                  emp.rowIndex,
                                  emp.name,
                                  emp.name,
                                  emp.role,
                                  emp.registeredAt,
                                  emp.leftAt || '',
                                  emp.leaveAllowance,
                                  newVal,
                                  emp.displayName
                                );
                                onEmployeeAdded();
                              } catch (err: any) {
                                alert("Lỗi khi cập nhật phép: " + err.message);
                              } finally {
                                setUpdatingLeaveEmp(null);
                              }
                            }}
                            className="w-7 h-7 rounded-full bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 hover:text-rose-600 border border-slate-150 dark:border-slate-800 flex items-center justify-center font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                            title="Trừ 1 ngày phép"
                          >
                            -
                          </motion.button>
                          
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg min-w-[56px] text-center flex items-center justify-center gap-1 shadow-sm">
                            {updatingLeaveEmp === emp.name ? (
                              <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <span className={
                                (emp.leaveCarryover !== undefined ? emp.leaveCarryover : getInitialCarryover(emp.name)) > 0 
                                  ? "text-emerald-600 dark:text-emerald-400 font-bold" 
                                  : (emp.leaveCarryover !== undefined ? emp.leaveCarryover : getInitialCarryover(emp.name)) < 0 
                                    ? "text-rose-500 font-bold" 
                                    : "text-slate-500"
                              }>
                                {(emp.leaveCarryover !== undefined ? emp.leaveCarryover : getInitialCarryover(emp.name)) > 0 ? "+" : ""}
                                {emp.leaveCarryover !== undefined ? emp.leaveCarryover : getInitialCarryover(emp.name)} ngày
                              </span>
                            )}
                          </span>

                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            disabled={updatingLeaveEmp === emp.name || !emp.rowIndex}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!emp.rowIndex) return;
                              const currentVal = emp.leaveCarryover !== undefined ? emp.leaveCarryover : getInitialCarryover(emp.name);
                              const newVal = currentVal + 1;
                              setUpdatingLeaveEmp(emp.name);
                              try {
                                await updateEmployee(
                                  accessToken,
                                  emp.rowIndex,
                                  emp.name,
                                  emp.name,
                                  emp.role,
                                  emp.registeredAt,
                                  emp.leftAt || '',
                                  emp.leaveAllowance,
                                  newVal,
                                  emp.displayName
                                );
                                onEmployeeAdded();
                              } catch (err: any) {
                                alert("Lỗi khi cập nhật phép: " + err.message);
                              } finally {
                                setUpdatingLeaveEmp(null);
                              }
                            }}
                            className="w-7 h-7 rounded-full bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-slate-500 hover:text-emerald-600 border border-slate-150 dark:border-slate-800 flex items-center justify-center font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                            title="Cộng 1 ngày phép"
                          >
                            +
                          </motion.button>
                        </div>
                      </div>

                      {/* Confirm Deletion Overlay */}
                      {isDeleting === emp.name && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center p-4 z-10"
                        >
                          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-3 text-center leading-relaxed">
                            Xác nhận xóa nhân viên <br />
                            <span className="text-slate-800 dark:text-slate-100 text-sm font-extrabold">{getDisplayNameFromList(emp.name, !!accessToken, employees)}</span>?
                          </p>
                          <div className="flex gap-2 w-full">
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => setIsDeleting(null)}
                              className="flex-1 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                            >
                              Hủy
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => handleDelete(emp)}
                              disabled={deletingState === emp.name}
                              className="flex-1 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              {deletingState === emp.name ? "Đang xóa..." : "Xóa"}
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
                    </motion.div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Employee Modal */}
      <AnimatePresence>
        {editingEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 no-swipe bg-slate-900/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 z-50"
            onClick={() => setEditingEmployee(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-visible transition-colors duration-300 relative my-auto"
            >
              {/* Top accent */}
              <div className="h-1.5 rounded-t-[32px] bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500" />
              
              <div className="p-4 sm:p-8">
                <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  Chỉnh Sửa Hồ Sơ Nhân Viên
                </h3>

                <form onSubmit={handleSaveEdit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Left Column: Basic Information */}
                    <div className="space-y-4 text-left">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Họ Và Tên (Admin Quản Lý)</label>
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
                          className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
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
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ Phận</label>
                        <input
                          type="text"
                          list="edit-dept-list"
                          placeholder="Nhập hoặc chọn bộ phận..."
                          value={editEmpDepartment}
                          onChange={(e) => setEditEmpDepartment(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                        />
                        <datalist id="edit-dept-list">
                          {departments.map(d => <option key={d} value={d} />)}
                        </datalist>
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
                            placeholder="Còn làm"
                            align="right"
                          />
                        </div>
                      </div>

                      {/* Private Birthday Section */}
                      <div className="bg-pink-50/10 dark:bg-pink-950/10 p-4 rounded-2xl border border-pink-100/20 dark:border-pink-900/20 space-y-2.5 text-left">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-pink-100/10 dark:border-pink-900/10 animate-pulse">
                          <span className="text-sm">🎂</span>
                          <h4 className="text-xs font-extrabold text-pink-600 dark:text-pink-400 uppercase tracking-wider">Thông Tin Sinh Nhật Riêng Tư (🔒)</h4>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ngày sinh nhật (Ví dụ: 15/09)</label>
                          <input
                            type="text"
                            placeholder="Nhập ngày sinh nhật (Ví dụ: 15/09)"
                            value={editBirthday}
                            onChange={(e) => setEditBirthday(e.target.value)}
                            className="w-full px-4 py-2 text-sm bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-slate-800 dark:text-slate-100 transition-colors"
                          />
                          <p className="text-[10px] text-pink-600/80 dark:text-pink-400/85 mt-1.5 leading-relaxed font-sans">
                            🔒 Chỉ lưu ở trình duyệt của riêng bạn. Không lưu lên Google Sheets.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Advanced & Leave Settings */}
                    <div className="space-y-4 text-left">
                      {/* Simplified Leave Configuration Section */}
                      <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                          <span className="text-sm">⚙️</span>
                          <h4 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Cấu Hình Ngày Phép Nghỉ</h4>
                        </div>
                        
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Điều Chỉnh Số Ngày Phép (+ hoặc -)</label>
                          <input
                            type="number"
                            placeholder="Ví dụ: +5 hoặc -2"
                            value={editLeaveCarryover}
                            onChange={(e) => setEditLeaveCarryover(e.target.value)}
                            min="-100"
                            max="100"
                            className="w-full px-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-800 dark:text-slate-100 transition-colors"
                          />
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                            Gõ <b className="text-emerald-600 font-bold">+5</b> để cộng thêm, <b className="text-rose-600 font-bold">-2</b> để trừ bớt phép. Để trống để hệ thống tự tính.
                          </p>
                        </div>
                      </div>

                      {/* Explanatory Info Card to balance the layout heights perfectly */}
                      <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                          <span className="text-xs">📌</span>
                          <h4 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Lưu Ý Quan Trọng</h4>
                        </div>
                        <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                          <li>Thay đổi tên hoặc chức vụ sẽ đồng bộ trực tiếp lên hệ thống quản lý Google Sheets chính thức.</li>
                          <li>Ngày nghỉ việc (nếu có) sẽ tự động ngưng tính lương và chấm công của nhân viên kể từ ngày chỉ định.</li>
                          <li>Ngày phép điều chỉnh được tính thêm/trừ đi trên tổng số ngày phép năm tiêu chuẩn của nhân viên.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5 flex justify-end gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => setEditingEmployee(null)}
                      className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm font-bold transition-all cursor-pointer"
                    >
                      Hủy bỏ
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={isSavingEdit}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-full text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {isSavingEdit ? "Đang lưu..." : "Lưu Thay Đổi"}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]"
          >
            <div className="bg-emerald-500 text-white px-5 py-3 rounded-full shadow-lg shadow-emerald-500/20 font-bold text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

