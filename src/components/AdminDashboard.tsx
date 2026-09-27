import React, { useMemo } from 'react';
import { Employee } from '../types';
import { Gift, AlertTriangle, Info, PartyPopper } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminDashboardProps {
  employees: Employee[];
  leaveReports: any[];
  currentMonth: number;
}

export function AdminDashboard({ employees, leaveReports, currentMonth }: AdminDashboardProps) {
  // 1. Sinh nhật trong tháng
  const birthdaysInMonth = useMemo(() => {
    return employees.filter(emp => {
      if (!emp.dateOfBirth) return false;
      const parts = emp.dateOfBirth.split('/');
      if (parts.length >= 2) {
        const month = parseInt(parts[1], 10);
        return month === currentMonth;
      }
      return false;
    });
  }, [employees, currentMonth]);

  // 2. Sắp hết hạn phép năm (còn nhiều phép mà sắp hết năm/hết hạn gối đầu) & Hết phép
  const { expiredSoon, usedUp } = useMemo(() => {
    const expiredSoon: typeof leaveReports = [];
    const usedUp: typeof leaveReports = [];

    leaveReports.forEach(report => {
      if (report.leaveRemaining <= 0) {
        usedUp.push(report);
      } else if (report.leaveRemaining >= 5) { // Ví dụ: còn >= 5 ngày phép là "tồn nhiều/đến hạn chỉ tiêu"
        expiredSoon.push(report);
      }
    });

    return { expiredSoon, usedUp };
  }, [leaveReports]);

  if (birthdaysInMonth.length === 0 && expiredSoon.length === 0 && usedUp.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6"
    >
      {/* Sinh nhật */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 p-5 rounded-[24px] shadow-sm flex flex-col transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-50 dark:bg-pink-950/40 text-pink-500 dark:text-pink-400 rounded-xl flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Sự kiện</span>
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 leading-tight">Sinh nhật tháng {currentMonth}</h3>
            </div>
          </div>
          <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-lg">{birthdaysInMonth.length}</span>
        </div>
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-[120px]">
          {birthdaysInMonth.length > 0 ? birthdaysInMonth.map(emp => (
            <div key={emp.name} className="flex justify-between items-center group">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-400"></div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{emp.name.split(' ').pop()}</span>
              </div>
              <span className="text-xs font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10 px-2 py-1 rounded-md border border-pink-100 dark:border-pink-500/20">{emp.dateOfBirth}</span>
            </div>
          )) : <div className="text-xs text-slate-400 flex items-center h-full">Không có sinh nhật tháng này.</div>}
        </div>
      </div>

      {/* Tồn phép nhiều */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 p-5 rounded-[24px] shadow-sm flex flex-col transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Cần lưu ý</span>
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 leading-tight">Chưa đạt chỉ tiêu phép</h3>
            </div>
          </div>
          <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-lg">{expiredSoon.length}</span>
        </div>
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-[120px]">
          {expiredSoon.length > 0 ? expiredSoon.map(r => (
            <div key={r.employee.name} className="flex justify-between items-center group">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{r.employee.name.split(' ').pop()}</span>
              </div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-500/20">Còn {r.leaveRemaining} ngày</span>
            </div>
          )) : <div className="text-xs text-slate-400 flex items-center h-full">Tất cả đều nghỉ phép đúng tiến độ.</div>}
        </div>
      </div>

      {/* Hết phép */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 p-5 rounded-[24px] shadow-sm flex flex-col transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Cảnh báo</span>
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 leading-tight">Đã dùng hết quỹ phép</h3>
            </div>
          </div>
          <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-lg">{usedUp.length}</span>
        </div>
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-[120px]">
          {usedUp.length > 0 ? usedUp.map(r => (
            <div key={r.employee.name} className="flex justify-between items-center group">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">{r.employee.name.split(' ').pop()}</span>
              </div>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-md border border-rose-100 dark:border-rose-500/20">
                {r.leaveRemaining === 0 ? "Vừa hết" : `Vượt ${Math.abs(r.leaveRemaining)} ngày`}
              </span>
            </div>
          )) : <div className="text-xs text-slate-400 flex items-center h-full">Chưa có ai dùng hết quỹ phép.</div>}
        </div>
      </div>

    </motion.div>
  );
}

