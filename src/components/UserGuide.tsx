import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Users, 
  Printer, 
  ShieldCheck, 
  Clock, 
  Info, 
  Key, 
  ArrowRight,
  Smile,
  FileSpreadsheet
} from 'lucide-react';

interface UserGuideProps {
  accountantKey: string;
  departmentPassword?: string;
}

export default function UserGuide({ accountantKey, departmentPassword = '' }: UserGuideProps) {
  const [copiedType, setCopiedType] = useState<'admin' | 'employee' | 'accountant' | null>(null);
  const [customKey, setCustomKey] = useState(accountantKey || 'visual-accounting');
  const [currentOrigin, setCurrentOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const adminLink = `${currentOrigin}`;
  const employeeLink = `${currentOrigin}?role=employee`;
  const accountantLink = `${currentOrigin}?role=accountant&key=${customKey}`;

  const copyToClipboard = (text: string, type: 'admin' | 'employee' | 'accountant') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }).catch(err => {
      console.error('Không thể sao chép liên kết:', err);
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      
      {/* Introduction Banner */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-900 dark:to-indigo-950 text-white rounded-[32px] p-6 sm:p-8 shadow-xl overflow-hidden">
        <div className="absolute top-[-50%] right-[-10%] w-[320px] h-[320px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-40%] left-[-10%] w-[250px] h-[250px] rounded-full bg-sky-500/10 blur-2xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="space-y-3 text-center md:text-left">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-widest text-indigo-100">
              <BookOpen className="w-3.5 h-3.5" /> Hướng Dẫn Sử Dụng
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-sans tracking-tight">
              Trung Tâm Hỗ Trợ Phòng Visual
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed max-w-xl">
              Cổng thông tin chia sẻ nhanh liên kết truy cập ứng dụng cho Nhân viên & Kế toán. Theo dõi chấm công, ngày phép gối đầu và thống kê OT tức thì.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl p-4 text-center shrink-0 w-full md:w-auto">
            <span className="block text-[10px] text-indigo-200 font-extrabold uppercase tracking-wider">Phiên bản hiện tại</span>
            <span className="text-lg font-black tracking-widest font-mono">v1.2.0 (Stable)</span>
          </div>
        </div>
      </div>

      {/* Share Links Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 sm:p-8 shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-lg text-slate-850 dark:text-slate-100">Liên Kết Chia Sẻ Truy Cập Nhanh</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Sao chép và gửi trực tiếp các liên kết này cho nhân viên hoặc kế toán phòng ban.</p>
          </div>
        </div>

        <div className="space-y-6">
          
          {/* Employee Link Card */}
          <div className="group bg-slate-50/60 dark:bg-slate-950/40 border border-slate-100/80 dark:border-slate-850/60 rounded-2xl p-5 hover:border-indigo-100 dark:hover:border-indigo-900/40 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cổng tra cứu dành cho Nhân Viên</span>
              </div>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100/30 text-indigo-600 dark:text-indigo-400 font-bold px-2.5 py-0.5 rounded-full">Bảo mật riêng tư</span>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Nhân viên sử dụng cổng này để tự tra cứu ngày đi làm, lịch làm việc, thống kê nghỉ phép và giờ tăng ca (OT) của chính mình. <strong>Không thể thay đổi dữ liệu, không cần tài khoản Google.</strong>
            </p>

            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={employeeLink}
                className="flex-1 bg-white dark:bg-slate-950 px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(employeeLink, 'employee')}
                className={`px-4 h-[38px] rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] shrink-0 ${
                  copiedType === 'employee'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-100/50 dark:shadow-none'
                }`}
              >
                {copiedType === 'employee' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Accountant Link Card */}
          <div className="group bg-slate-50/60 dark:bg-slate-950/40 border border-slate-100/80 dark:border-slate-850/60 rounded-2xl p-5 hover:border-rose-100 dark:hover:border-rose-900/40 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cổng báo cáo dành cho Kế Toán</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-rose-50 dark:bg-rose-950/80 border border-rose-100/30 text-rose-600 dark:text-rose-400 font-bold px-2.5 py-0.5 rounded-full">Xác thực bằng Mã bảo mật</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Dành cho Kế toán phòng ban để xem toàn bộ bảng tổng hợp, phân tích biểu đồ, theo dõi phép gối đầu, đối chiếu và <strong>Xuất báo cáo PDF / Excel</strong>. Truy cập trực tiếp qua mã bảo mật được nhúng vào URL.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-4">
              <div className="md:col-span-4 space-y-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Cấu hình Mã khóa bảo mật Kế toán</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="Mã khóa kế toán..."
                    className="w-full bg-white dark:bg-slate-950 pl-8 pr-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="md:col-span-8 space-y-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Liên kết nhúng mã bảo mật tự động</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={accountantLink}
                    className="flex-1 bg-white dark:bg-slate-950 px-3.5 py-2 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 outline-none select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(accountantLink, 'accountant')}
                    className={`px-4 h-[34px] rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] shrink-0 ${
                      copiedType === 'accountant'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-100/50 dark:shadow-none'
                    }`}
                  >
                    {copiedType === 'accountant' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedType === 'accountant' ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Link Card */}
          <div className="group bg-slate-50/60 dark:bg-slate-950/40 border border-slate-100/80 dark:border-slate-850/60 rounded-2xl p-5 hover:border-emerald-100 dark:hover:border-emerald-900/40 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cổng Quản Trị Viên (Admin)</span>
              </div>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-100/30 text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full">Đăng nhập bằng tài khoản Google</span>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Dành riêng cho Quản trị viên phòng Visual. Cho phép chấm công hàng ngày, quản lý danh sách nhân sự, và cấu hình các cài đặt hệ thống. <strong>Yêu cầu xác thực email thuộc danh sách được duyệt.</strong>
            </p>

            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={adminLink}
                className="flex-1 bg-white dark:bg-slate-950 px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(adminLink, 'admin')}
                className={`px-4 h-[38px] rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] shrink-0 ${
                  copiedType === 'admin'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-100/50 dark:shadow-none'
                }`}
              >
                {copiedType === 'admin' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Role Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Employee Guide Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-5 shadow-sm space-y-4">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Smile className="w-5 h-5" />
          </div>
          <h4 className="font-sans font-bold text-sm text-slate-850 dark:text-slate-100">Dành Cho Nhân Viên</h4>
          <ul className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-indigo-500 shrink-0" />
              <span>Sử dụng liên kết dành cho nhân viên để truy cập trực tiếp.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-indigo-500 shrink-0" />
              <span>Gõ tên để tìm kiếm hồ sơ cá nhân và xem thống kê.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-indigo-500 shrink-0" />
              <span>Xem trực quan ngày công, ngày phép còn lại, và tổng giờ tăng ca (OT) trong tháng.</span>
            </li>
          </ul>
        </div>

        {/* Accountant Guide Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-5 shadow-sm space-y-4">
          <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/50 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Printer className="w-5 h-5" />
          </div>
          <h4 className="font-sans font-bold text-sm text-slate-850 dark:text-slate-100">Dành Cho Kế Toán</h4>
          <ul className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-rose-500 shrink-0" />
              <span>Dùng link đã nhúng mã bảo mật để vào trực tiếp mục Báo cáo.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-rose-500 shrink-0" />
              <span>Xem biểu đồ phân tích xu hướng chuyên cần toàn phòng ban.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-rose-500 shrink-0" />
              <span>Sử dụng bảng <strong>Đối Chiếu Phép Chốt Kế Toán</strong> gối đầu chuyển tiếp giữa năm 2025 và 2026.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-rose-500 shrink-0" />
              <span>Xuất bản in PDF chất lượng cao, hoặc xuất dữ liệu Excel với 1 click.</span>
            </li>
          </ul>
        </div>

        {/* Admin Guide Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-5 shadow-sm space-y-4">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="font-sans font-bold text-sm text-slate-850 dark:text-slate-100">Dành Cho Quản Trị Viên</h4>
          <ul className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
              <span>Ghi nhận chấm công nhanh bằng mã QR, nhận diện khuôn mặt giả lập, hoặc biểu mẫu.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
              <span>Thêm mới và cập nhật thông tin nhân viên (Phòng ban, Chức vụ, Ngày tham gia).</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
              <span>Bật bảo mật phòng ban và quản lý danh sách email được cấp phép truy cập.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
              <span>Đồng bộ 2 chiều tức thì với bảng tính Google Sheets để sao lưu.</span>
            </li>
          </ul>
        </div>

      </div>

      {/* Safety Notice & Technical Info */}
      <div className="bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100/40 dark:border-indigo-900/30 rounded-[28px] p-5 flex gap-4 text-xs text-indigo-900 dark:text-indigo-300 leading-relaxed items-start">
        <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold">Lưu ý về tính đồng bộ dữ liệu:</span>
          <p>
            Tất cả dữ liệu chỉnh sửa trên ứng dụng Chấm Công Văn Phòng sẽ được đồng bộ trực tiếp lên tập tin Google Sheets thuộc quyền sở hữu của quản trị viên phòng Visual. Nếu dữ liệu có độ trễ do kết nối, nhấn nút <span className="font-semibold text-indigo-600 dark:text-indigo-400">Tải lại dữ liệu (Refresh)</span> ở đầu thanh công cụ để buộc hệ thống làm mới từ máy chủ.
          </p>
        </div>
      </div>

    </div>
  );
}
