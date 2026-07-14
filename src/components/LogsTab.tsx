import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Search, 
  RefreshCw, 
  User, 
  Globe, 
  Calendar, 
  Filter, 
  ChevronDown, 
  Database,
  UserCheck,
  Settings,
  ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

interface LogsTabProps {
  logs: AuditLog[];
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
}

export default function LogsTab({ logs, onRefresh, isLoading = false }: LogsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');
  const [selectedActionFilter, setSelectedActionFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle Refreshing state
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Get unique users and actions for filters
  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    logs.forEach(log => {
      if (log.user) users.add(log.user);
    });
    return Array.from(users);
  }, [logs]);

  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    logs.forEach(log => {
      if (log.action) actions.add(log.action);
    });
    return Array.from(actions);
  }, [logs]);

  // Filter logs based on search query, user, and action
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.user?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesUser = selectedUserFilter === 'all' || log.user === selectedUserFilter;
      const matchesAction = selectedActionFilter === 'all' || log.action === selectedActionFilter;

      return matchesSearch && matchesUser && matchesAction;
    });
  }, [logs, searchQuery, selectedUserFilter, selectedActionFilter]);

  // Helper to format timestamps to readable Vietnamese format
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Helper for action badges styling
  const getActionBadgeStyle = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('truy cập') || act.includes('đăng nhập')) {
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-100 dark:border-blue-900/30';
    }
    if (act.includes('đồng bộ') || act.includes('tải dữ liệu') || act.includes('khôi phục')) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30';
    }
    if (act.includes('cập nhật') || act.includes('cấu hình') || act.includes('thiết lập')) {
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-100 dark:border-purple-900/30';
    }
    if (act.includes('lỗi') || act.includes('cảnh báo') || act.includes('sai PIN')) {
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-100 dark:border-rose-900/30';
    }
    return 'bg-slate-50 text-slate-700 dark:bg-slate-950/40 dark:text-slate-300 border-slate-100 dark:border-slate-800/50';
  };

  // Helper for action icon
  const getActionIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('truy cập') || act.includes('đăng nhập')) {
      return <User className="w-3.5 h-3.5" />;
    }
    if (act.includes('đồng bộ') || act.includes('tải dữ liệu') || act.includes('khôi phục')) {
      return <Database className="w-3.5 h-3.5" />;
    }
    if (act.includes('cập nhật') || act.includes('cấu hình') || act.includes('thiết lập')) {
      return <Settings className="w-3.5 h-3.5" />;
    }
    return <Activity className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-6" id="logs-tab-container">
      {/* Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] p-6 shadow-sm transition-colors duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-slate-850 dark:text-slate-100">Nhật Ký Truy Cập Hệ Thống</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Theo dõi tất cả lượt đăng nhập, truy cập, IP và hoạt động thay đổi cấu hình thời gian thực.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-bold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
              Tổng số: {logs.length} bản ghi
            </span>
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-full transition-all cursor-pointer shadow-sm focus:outline-none disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] p-5 shadow-sm space-y-4 transition-colors duration-300">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm IP, tên user, hoặc chi tiết hành động..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none text-slate-800 dark:text-slate-100 transition-all font-medium"
            />
          </div>

          {/* User Filter Dropdown */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </span>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none text-slate-800 dark:text-slate-100 transition-all font-medium appearance-none cursor-pointer"
            >
              <option value="all">Tất cả người dùng (User)</option>
              {uniqueUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>

          {/* Action Filter Dropdown */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Filter className="w-4 h-4" />
            </span>
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none text-slate-800 dark:text-slate-100 transition-all font-medium appearance-none cursor-pointer"
            >
              <option value="all">Tất cả hành động (Action)</option>
              {uniqueActions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Filters state badge */}
        {(searchQuery || selectedUserFilter !== 'all' || selectedActionFilter !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 pt-1 animate-fadeIn">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Bộ lọc đang bật:</span>
            {searchQuery && (
              <span className="text-[10px] font-bold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 rounded-lg flex items-center gap-1">
                Từ khoá: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-indigo-800 font-black">×</button>
              </span>
            )}
            {selectedUserFilter !== 'all' && (
              <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-lg flex items-center gap-1">
                User: {selectedUserFilter}
                <button onClick={() => setSelectedUserFilter('all')} className="hover:text-blue-800 font-black">×</button>
              </span>
            )}
            {selectedActionFilter !== 'all' && (
              <span className="text-[10px] font-bold px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 rounded-lg flex items-center gap-1">
                Action: {selectedActionFilter}
                <button onClick={() => setSelectedActionFilter('all')} className="hover:text-purple-800 font-black">×</button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedUserFilter('all');
                setSelectedActionFilter('all');
              }}
              className="text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 underline"
            >
              Xoá tất cả bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Logs Table Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] overflow-hidden shadow-sm transition-colors duration-300">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80">
                <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide w-48 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Thời gian</th>
                <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide w-56 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Người dùng (User)</th>
                <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide w-64 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Hành động</th>
                <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Chi tiết / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                    {isLoading ? "Đang cập nhật nhật ký..." : "Không tìm thấy bản ghi nhật ký nào khớp với bộ lọc."}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-slate-50/30 dark:hover:bg-slate-950/10 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="p-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatTimestamp(log.timestamp)}</span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2 truncate max-w-[200px]">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </span>
                        <span className="truncate" title={log.user}>{log.user}</span>
                      </div>
                    </td>

                    {/* Action badge */}
                    <td className="p-4 text-xs">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide leading-none uppercase ${getActionBadgeStyle(log.action)}`}>
                        {getActionIcon(log.action)}
                        <span>{log.action}</span>
                      </div>
                    </td>

                    {/* Details / IP */}
                    <td className="p-4 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5 break-all">
                        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="whitespace-normal">{log.details || "N/A"}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
