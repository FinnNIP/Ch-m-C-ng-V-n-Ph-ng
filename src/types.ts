export interface Employee {
  name: string; // Họ Và Tên (Unique identifier now)
  displayName?: string; // Tên hiển thị khi xuất file PNG/PDF/Excel & Guest mode
  role: string;
  department?: string; // Bộ phận
  registeredAt: string; // Ngày Đăng Ký
  leftAt?: string; // Ngày Rời Khỏi / Nghỉ Việc
  rowIndex?: number; // Vị trí dòng trên Google Sheet để chỉnh sửa/xóa
  leaveAllowance?: number; // Quỹ phép năm được cấp
  leaveCarryover?: number; // Phép gối đầu (tồn) từ năm trước
  dateOfBirth?: string; // Ngày Sinh (DD/MM/YYYY)
}

export interface TimeLog {
  employeeName: string; // Họ Và Tên
  date: string; // YYYY-MM-DD
  status: 'Có đi làm' | 'Không đi làm' | 'Nghỉ phép' | 'Nghỉ lễ';
  otFrom: string; // Giờ bắt đầu OT (e.g. "18:00")
  otTo: string; // Giờ kết thúc OT (e.g. "21:30")
  note: string; // Ghi chú
  rowIndex?: number; // Vị trí dòng trên Google Sheet để chỉnh sửa/xóa
}

export interface DailyStatus {
  date: string;
  status: 'Có đi làm' | 'Không đi làm' | 'Nghỉ phép' | 'Nghỉ lễ' | 'Nghỉ cuối tuần' | 'Ngày lễ' | 'Chưa vào làm' | 'Đã nghỉ việc';
  otFrom: string;
  otTo: string;
  note: string;
  holidayName?: string;
}

export interface EmployeeMonthlyReport {
  employeeName: string;
  role: string;
  department?: string;
  totalDays: number;
  presentDays: number; // Số ngày có đi làm
  absentDays: number; // Số ngày không đi làm
  leaveDays: number; // Số ngày nghỉ phép
  holidayDays: number; // Số ngày nghỉ lễ nhà nước
  totalOtHours: number; // Tổng số giờ OT
  logs: TimeLog[];
  dailyDetails: { [day: number]: DailyStatus };
}
