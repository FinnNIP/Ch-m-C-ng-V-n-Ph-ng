import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  googleSignIn, 
  initAuth, 
  logout 
} from './firebase';
import { 
  checkAndSetupSheets, 
  getEmployees, 
  getTimeLogs, 
  getSpreadsheetId,
  setSpreadsheetId,
  extractSpreadsheetId,
  syncGridDataToStandardSheets,
  DEFAULT_SPREADSHEET_ID
} from './sheets';
import { Employee, TimeLog } from './types';
import AttendanceTab from './components/AttendanceTab';
import EmployeesTab from './components/EmployeesTab';
import ReportsTab from './components/ReportsTab';
import EmployeePortal from './components/EmployeePortal';
import UserGuide from './components/UserGuide';
import LogsTab from './components/LogsTab';
import { WebGLBackground } from './components/WebGLBackground';
import { ThemeToggle } from './components/ThemeToggle';
import { 
  Clock, 
  Users, 
  FileSpreadsheet, 
  LogOut, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle,
  Sun,
  Moon,
  Coffee,
  Sparkles,
  Smile,
  Lock,
  Key,
  Share2,
  Copy,
  Check,
  Search,
  Activity,
  UserCheck,
  Printer,
  BookOpen,
  ArrowRight,
  ChevronDown,
  Settings,
  Save,
  Upload,
  Database,
  Download
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Google Sheets state
  const [spreadsheetId, setLocalSpreadsheetId] = useState<string>(() => {
    return getSpreadsheetId();
  });
  const [sheetUrlInput, setSheetUrlInput] = useState<string>(() => {
    const id = getSpreadsheetId();
    return id === DEFAULT_SPREADSHEET_ID ? "" : `https://docs.google.com/spreadsheets/d/${id}/edit`;
  });
  const [sheetInputError, setSheetInputError] = useState<string>("");
  const [isUpdatingSheet, setIsUpdatingSheet] = useState<boolean>(false);
  const [showSheetConfig, setShowSheetConfig] = useState<boolean>(false);
  const [isSuccessfullyConnected, setIsSuccessfullyConnected] = useState<boolean>(() => {
    const id = getSpreadsheetId();
    return id !== DEFAULT_SPREADSHEET_ID;
  });

  // Dark Mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  
  // App states
  const [activeTab, setActiveTab] = useState<'attendance' | 'employees' | 'reports' | 'guide' | 'logs'>('attendance');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitializingSheets, setIsInitializingSheets] = useState<boolean>(false);
  
  // Custom Accountant Login Modal State
  const [showAccountantModal, setShowAccountantModal] = useState<boolean>(false);
  const [accountantInputKey, setAccountantInputKey] = useState<string>("");
  const [accountantError, setAccountantError] = useState<string>("");

  // Security & Share state
  const [isSecurityEnabled, setIsSecurityEnabled] = useState<boolean>(() => {
    return localStorage.getItem('security_enabled') === 'true';
  });
  const [departmentEmails, setDepartmentEmails] = useState<string>(() => {
    return localStorage.getItem('department_emails') || '';
  });
  const [departmentPassword, setDepartmentPassword] = useState<string>(() => {
    return localStorage.getItem('department_password') || '';
  });
  const [accountantKey, setAccountantKey] = useState<string>(() => {
    return localStorage.getItem('accountant_key') || 'visual-accounting';
  });
  
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    const enabled = localStorage.getItem('security_enabled') === 'true';
    if (!enabled) return true;
    return sessionStorage.getItem('is_unlocked_session') === 'true';
  });

  const [showSecurityConfig, setShowSecurityConfig] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Editing state for security form
  const [editSecurityEnabled, setEditSecurityEnabled] = useState<boolean>(() => {
    return localStorage.getItem('security_enabled') === 'true';
  });
  const [editDepartmentEmails, setEditDepartmentEmails] = useState<string>(() => {
    return localStorage.getItem('department_emails') || '';
  });
  const [editDepartmentPassword, setEditDepartmentPassword] = useState<string>(() => {
    return localStorage.getItem('department_password') || '';
  });
  const [editAccountantKey, setEditAccountantKey] = useState<string>(() => {
    return localStorage.getItem('accountant_key') || 'visual-accounting';
  });
  const [isSavingSecurity, setIsSavingSecurity] = useState<boolean>(false);
  const [securitySuccessMsg, setSecuritySuccessMsg] = useState<string>("");

  // Auto Backup and Local JSON State
  const [lastBackupTime, setLastBackupTime] = useState<string>(() => {
    return localStorage.getItem('last_auto_backup_time') || '';
  });
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);

  // PIN Unlock state
  const [pinInput, setPinInput] = useState<string>(() => "");
  const [pinError, setPinError] = useState<string>(() => "");

  // Role based access control (Admin vs Accountant vs Employee)
  const [role, setRole] = useState<'admin' | 'accountant' | 'employee'>('admin');

  // Dropdown open state for admin tools
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState<boolean>(false);

  // Audit Logs for Admin tracking
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState<boolean>(false);

  const loadAuditLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/audit-logs');
      if (response.ok) {
        const logs = await response.json();
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error("Lỗi khi tải audit logs từ server:", err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  // Fetch state from server database
  const loadAppStateFromServer = useCallback(async (currentRole: string, currentKey?: string, currentEmail?: string) => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (currentRole) queryParams.set('role', currentRole);
      if (currentKey) queryParams.set('key', currentKey);
      if (currentEmail) queryParams.set('email', currentEmail);

      const response = await fetch(`/api/app-state?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        
        const localCachedEmpStr = localStorage.getItem('cached_employees');
        const localCachedLogsStr = localStorage.getItem('cached_timelogs');
        const localCachedEmp = localCachedEmpStr ? JSON.parse(localCachedEmpStr) : [];
        const localCachedLogs = localCachedLogsStr ? JSON.parse(localCachedLogsStr) : [];

        // Check if server is empty but client has non-empty cached data
        const serverIsEmpty = (!data.employees || data.employees.length === 0) && (!data.timeLogs || data.timeLogs.length === 0);
        const clientHasCache = localCachedEmp.length > 0 || localCachedLogs.length > 0;

        if (serverIsEmpty && clientHasCache) {
          console.log("Phát hiện máy chủ trống nhưng trình duyệt có dữ liệu cache. Đang tự động khôi phục lên máy chủ...");
          setEmployees(localCachedEmp);
          setTimeLogs(localCachedLogs);
          
          // Silently push client cache to server in background to heal it
          const currentSpreadsheetId = data.spreadsheetId || localStorage.getItem('cached_spreadsheet_id') || '1WBVOBjsnSOEGKwTuKzf1LVH0ErOdzmAUKk2Bg9MtoTs';
          fetch('/api/app-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employees: localCachedEmp,
              timeLogs: localCachedLogs,
              spreadsheetId: currentSpreadsheetId,
              email: "Hệ thống tự khôi phục (Client Cache)"
            })
          }).catch(err => console.error("Lỗi tự động khôi phục dữ liệu lên máy chủ:", err));
        } else {
          // Normal flow: update local state if server has data
          if (data.employees && data.employees.length > 0) {
            setEmployees(data.employees);
            localStorage.setItem('cached_employees', JSON.stringify(data.employees));
          } else if (localCachedEmp.length > 0) {
            setEmployees(localCachedEmp);
          }

          if (data.timeLogs && data.timeLogs.length > 0) {
            setTimeLogs(data.timeLogs);
            localStorage.setItem('cached_timelogs', JSON.stringify(data.timeLogs));
          } else if (localCachedLogs.length > 0) {
            setTimeLogs(localCachedLogs);
          }
        }

        if (data.spreadsheetId) {
          setLocalSpreadsheetId(data.spreadsheetId);
          setSpreadsheetId(data.spreadsheetId);
          localStorage.setItem('cached_spreadsheet_id', data.spreadsheetId);
        }

        if (data.security) {
          setIsSecurityEnabled(data.security.securityEnabled);
          setDepartmentEmails(data.security.departmentEmails);
          setAccountantKey(data.security.accountantKey);
          
          setEditSecurityEnabled(data.security.securityEnabled);
          setEditDepartmentEmails(data.security.departmentEmails);
          setEditAccountantKey(data.security.accountantKey);
          if (data.security.departmentPassword) {
            setEditDepartmentPassword(data.security.departmentPassword);
          }
        }
        if (currentRole === 'accountant' && currentKey) {
          localStorage.setItem('accountant_key', currentKey);
        }
      } else if (response.status === 401) {
        const errData = await response.json().catch(() => ({}));
        alert(errData.error || "Mã khóa bảo mật không chính xác. Không thể tải dữ liệu.");
        setRole('admin');
        setNeedsAuth(true);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu từ server:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAccountantLoginSubmit = async () => {
    const val = accountantInputKey.trim();
    if (!val) {
      setAccountantError("Vui lòng nhập Mã khóa bảo mật Kế toán!");
      return;
    }
    
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.set('role', 'accountant');
      queryParams.set('key', val);
      
      const response = await fetch(`/api/app-state?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.employees) setEmployees(data.employees);
        if (data.timeLogs) setTimeLogs(data.timeLogs);
        if (data.spreadsheetId) {
          setLocalSpreadsheetId(data.spreadsheetId);
          setSpreadsheetId(data.spreadsheetId);
        }
        if (data.security) {
          setIsSecurityEnabled(data.security.securityEnabled);
          setDepartmentEmails(data.security.departmentEmails);
          setAccountantKey(data.security.accountantKey);
          
          setEditSecurityEnabled(data.security.securityEnabled);
          setEditDepartmentEmails(data.security.departmentEmails);
          setEditAccountantKey(data.security.accountantKey);
          if (data.security.departmentPassword) {
            setEditDepartmentPassword(data.security.departmentPassword);
          }
        }
        
        // Success login states
        setRole('accountant');
        setActiveTab('reports');
        localStorage.setItem('user_role', 'accountant');
        localStorage.setItem('accountant_key', val);
        setNeedsAuth(false);
        setShowAccountantModal(false);
        setAccountantError("");
      } else if (response.status === 401) {
        const errData = await response.json().catch(() => ({}));
        setAccountantError(errData.error || "Mã khóa bảo mật không chính xác!");
      } else {
        setAccountantError("Có lỗi xảy ra khi kết nối đến máy chủ.");
      }
    } catch (err) {
      console.error(err);
      setAccountantError("Có lỗi xảy ra khi tải dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load cached data from local storage on startup for instant display & offline capability
  useEffect(() => {
    try {
      const cachedEmp = localStorage.getItem('cached_employees');
      const cachedLogs = localStorage.getItem('cached_timelogs');
      if (cachedEmp) {
        setEmployees(JSON.parse(cachedEmp));
      }
      if (cachedLogs) {
        setTimeLogs(JSON.parse(cachedLogs));
      }
    } catch (e) {
      console.error("Lỗi đọc dữ liệu cache:", e);
    }
  }, []);

  // Detect role and access key from URL or LocalStorage fallback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryRole = params.get('role');
    const queryKey = params.get('key');
    
    const savedRole = localStorage.getItem('user_role');
    const activeRole = queryRole || savedRole || 'admin';
    
    const savedAccountantKey = localStorage.getItem('accountant_key') || 'visual-accounting';

    if (activeRole === 'accountant') {
      const activeKey = queryKey || savedAccountantKey;
      setRole('accountant');
      setActiveTab('reports'); // Accountant defaults to Reports Tab
      setNeedsAuth(false); // Skip google sign in screen
      loadAppStateFromServer('accountant', activeKey);
    } else if (activeRole === 'employee' || activeRole === 'guest') {
      setRole('employee');
      setNeedsAuth(false);
      loadAppStateFromServer('employee');
    } else {
      setRole('admin');
      loadAppStateFromServer('admin');
    }
  }, [loadAppStateFromServer]);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, cachedToken) => {
        // If we are currently in accountant or employee mode, do NOT let normal Google auth overwrite it
        const params = new URLSearchParams(window.location.search);
        const queryRole = params.get('role');
        const savedRole = localStorage.getItem('user_role');
        const activeRole = queryRole || savedRole;
        if (activeRole === 'accountant') {
          return;
        }
        if (activeRole === 'employee' || activeRole === 'guest') {
          return;
        }

        setUser(firebaseUser);
        setToken(cachedToken);
        setNeedsAuth(false);
        // Refresh audit logs for logged in admin
        if (firebaseUser?.email) {
          loadAuditLogs();
        }
      },
      () => {
        // If we are currently in accountant or employee mode, do NOT force redirect to login screen
        const params = new URLSearchParams(window.location.search);
        const queryRole = params.get('role');
        const savedRole = localStorage.getItem('user_role');
        const activeRole = queryRole || savedRole;
        if (activeRole === 'accountant') {
          return;
        }
        if (activeRole === 'employee' || activeRole === 'guest') {
          return;
        }

        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, [loadAuditLogs]);

  // Fetch all data from Google Sheet & Cache it
  const loadData = useCallback(async (authToken: string, userEmail?: string) => {
    setIsLoading(true);
    try {
      const fetchedEmployees = await getEmployees(authToken);
      const fetchedLogs = await getTimeLogs(authToken);
      setEmployees(fetchedEmployees);
      setTimeLogs(fetchedLogs);
      
      // Cache data for read-only view or offline fallbacks
      localStorage.setItem('cached_employees', JSON.stringify(fetchedEmployees));
      localStorage.setItem('cached_timelogs', JSON.stringify(fetchedLogs));

      // Sync data to Server cache in the background so other guests can access on other devices instantly
      const currentSpreadsheetId = getSpreadsheetId();
      fetch('/api/app-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: fetchedEmployees,
          timeLogs: fetchedLogs,
          spreadsheetId: currentSpreadsheetId,
          email: userEmail || user?.email || "Quản trị viên (Admin)"
        })
      })
        .then(() => loadAuditLogs())
        .catch(err => console.error("Lỗi đồng bộ cache server:", err));
    } catch (err) {
      console.error("Lỗi đồng bộ dữ liệu:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, loadAuditLogs]);

  // Sync / setup sheets when token is obtained or changed
  useEffect(() => {
    if (token) {
      const setup = async () => {
        setIsInitializingSheets(true);
        try {
          await checkAndSetupSheets(token);
          await loadData(token, user?.email || "");
        } catch (err) {
          console.error("Lỗi thiết lập Google Sheets:", err);
        } finally {
          setIsInitializingSheets(false);
        }
      };
      setup();
    }
  }, [token, loadData, spreadsheetId]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error("Đăng nhập thất bại:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setRole('admin');
    localStorage.removeItem('user_role');
    setNeedsAuth(true);
    sessionStorage.removeItem('is_unlocked_session');
  };

  const triggerRefresh = async () => {
    if (token) {
      await loadData(token);
    }
  };

  const [isSyncingGrid, setIsSyncingGrid] = useState<boolean>(false);

  const triggerAdvancedGridSync = useCallback(async () => {
    if (!token) {
      alert("Bạn cần đăng nhập bằng tài khoản Google để thực hiện đồng bộ từ Google Sheets.");
      return;
    }
    setIsSyncingGrid(true);
    try {
      const confirmSync = window.confirm(
        "Hệ thống sẽ quét toàn bộ các sheet tháng dạng lưới (như JANUARY, FEBRUARY, v.v.) trong file Google Sheets của bạn và đồng bộ vào bảng lịch tổng hợp. Quá trình này có thể mất vài giây. Bạn có muốn tiếp tục?"
      );
      if (!confirmSync) {
        setIsSyncingGrid(false);
        return;
      }

      await syncGridDataToStandardSheets(token);
      await loadData(token, user?.email || "");
      alert("Đồng bộ dữ liệu nâng cao từ các sheet tháng thành công!");
    } catch (err: any) {
      console.error("Lỗi đồng bộ nâng cao:", err);
      alert(`Đồng bộ thất bại: ${err.message}`);
    } finally {
      setIsSyncingGrid(false);
    }
  }, [token, user, loadData]);

  // Listen to custom event from ReportsTab
  useEffect(() => {
    const handleSyncEvent = () => {
      triggerAdvancedGridSync();
    };
    window.addEventListener('trigger-advanced-grid-sync', handleSyncEvent);
    return () => {
      window.removeEventListener('trigger-advanced-grid-sync', handleSyncEvent);
    };
  }, [triggerAdvancedGridSync]);

  // Auto Backup Effect (Every 5 minutes)
  useEffect(() => {
    if (employees.length === 0 && timeLogs.length === 0) return;

    const performBackup = () => {
      try {
        const backupData = {
          timestamp: new Date().toISOString(),
          version: "backup-v1",
          employees,
          timeLogs,
          spreadsheetId: spreadsheetId || localStorage.getItem('cached_spreadsheet_id') || ''
        };
        localStorage.setItem('local_backup_data', JSON.stringify(backupData));
        const now = new Date();
        const displayTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        localStorage.setItem('last_auto_backup_time', displayTime);
        setLastBackupTime(displayTime);
        console.log(`[AutoBackup] Đã tự động tạo bản sao lưu dữ liệu cục bộ vào lúc ${displayTime}`);
      } catch (err) {
        console.error("Lỗi khi thực hiện sao lưu tự động:", err);
      }
    };

    // Wait 10 seconds initially, then back up
    const initialBackupTimeout = setTimeout(performBackup, 10000);
    // Repeat every 5 minutes (300,000 ms)
    const intervalId = setInterval(performBackup, 300000);

    return () => {
      clearTimeout(initialBackupTimeout);
      clearInterval(intervalId);
    };
  }, [employees, timeLogs, spreadsheetId]);

  const downloadBackupJSON = () => {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        version: "backup-v1",
        employees,
        timeLogs,
        spreadsheetId: spreadsheetId || localStorage.getItem('cached_spreadsheet_id') || ''
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const dateStr = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(now.getDate()).padStart(2, '0')}`;
      link.href = url;
      link.download = `cham_cong_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi khi tải file sao lưu:", err);
      alert("Lỗi khi tải file sao lưu.");
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') return;
        const backupData = JSON.parse(text);

        if (!backupData.employees || !Array.isArray(backupData.employees)) {
          alert("File JSON không đúng định dạng sao lưu (Thiếu danh sách nhân viên).");
          return;
        }

        if (window.confirm(`Bạn có chắc chắn muốn khôi phục dữ liệu từ bản sao lưu ngày ${new Date(backupData.timestamp || Date.now()).toLocaleString('vi-VN')}? Hành động này sẽ thay thế hoàn toàn dữ liệu hiện tại.`)) {
          setEmployees(backupData.employees);
          if (backupData.timeLogs && Array.isArray(backupData.timeLogs)) {
            setTimeLogs(backupData.timeLogs);
          }
          if (backupData.spreadsheetId) {
            setLocalSpreadsheetId(backupData.spreadsheetId);
            setSpreadsheetId(backupData.spreadsheetId);
          }

          // Cache locally
          localStorage.setItem('cached_employees', JSON.stringify(backupData.employees));
          if (backupData.timeLogs) {
            localStorage.setItem('cached_timelogs', JSON.stringify(backupData.timeLogs));
          }

          setIsLoading(true);
          const response = await fetch('/api/app-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employees: backupData.employees,
              timeLogs: backupData.timeLogs || [],
              spreadsheetId: backupData.spreadsheetId || spreadsheetId,
              email: user?.email || "Khôi phục từ file JSON"
            })
          });

          if (response.ok) {
            alert("Khôi phục dữ liệu cục bộ và đồng bộ lên máy chủ thành công!");
            setShowBackupModal(false);
            triggerRefresh();
          } else {
            alert("Đã khôi phục cục bộ, nhưng không thể đồng bộ lên máy chủ.");
          }
        }
      } catch (err: any) {
        console.error("Lỗi khi đọc file sao lưu:", err);
        alert("Lỗi khi giải mã file sao lưu: " + err.message);
      } finally {
        setIsLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Check if logged in user is in whitelisted emails
  const isUserAuthorized = useMemo(() => {
    if (role === 'accountant') return true; // Accountant view bypasses Google login email checks
    if (!user) return false;
    if (!isSecurityEnabled) return true;
    
    const allowed = departmentEmails
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);
      
    if (allowed.length === 0) return true; // If empty, anyone is authorized
    return allowed.includes(user.email?.toLowerCase() || '');
  }, [user, isSecurityEnabled, departmentEmails, role]);

  const isPinRequired = useMemo(() => {
    if (role === 'accountant') return false; // Accountant bypasses PIN lock
    if (!isSecurityEnabled) return false;
    if (!departmentPassword.trim()) return false;
    return !isUnlocked;
  }, [role, isSecurityEnabled, departmentPassword, isUnlocked]);

  // Render Employee Portal if role is employee (guest)
  if (role === 'employee') {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950/75 text-slate-800 dark:text-slate-100 transition-colors duration-300 relative">
        <WebGLBackground />
        <EmployeePortal 
          employees={employees} 
          timeLogs={timeLogs} 
          isLoading={isLoading}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onBackToLogin={() => {
            // Remove role from URL query parameter and localStorage, then reload
            localStorage.removeItem('user_role');
            window.location.href = window.location.pathname;
          }}
          accountantKey={accountantKey}
          departmentPassword={departmentPassword}
        />
      </div>
    );
  }

  // Render Login UI if unauthenticated
  if (needsAuth) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950/75 text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 py-12 sm:py-16 font-sans relative overflow-y-auto">
        <WebGLBackground />
        
        {/* Decorative dynamic Material Design 3 ambient blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-indigo-400/10 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-sky-400/10 blur-[110px] pointer-events-none" />

         {/* Floating Theme Toggle */}
         <div className="absolute top-6 right-6 z-50">
           <motion.button
             whileHover={{ scale: 1.05, y: -2 }}
             whileTap={{ scale: 0.95 }}
             onClick={() => setIsDarkMode(!isDarkMode)}
             className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shadow-md cursor-pointer flex items-center justify-center gap-2 text-xs font-bold"
             title="Chuyển đổi giao diện"
           >
             <AnimatePresence mode="wait" initial={false}>
               <motion.div
                 key={isDarkMode ? "sun" : "moon"}
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 transition={{ type: "spring", stiffness: 300, damping: 20 }}
                 className="flex items-center gap-2"
               >
                 {isDarkMode ? (
                   <>
                     <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
                     <span className="hidden sm:inline">Giao diện sáng</span>
                   </>
                 ) : (
                   <>
                     <Moon className="w-4 h-4 text-indigo-500" />
                     <span className="hidden sm:inline">Giao diện tối</span>
                   </>
                 )}
               </motion.div>
             </AnimatePresence>
           </motion.button>
         </div>

        {/* Central Layout Container */}
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center relative z-10 space-y-10">
          
          {/* Header/Branding Center */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-indigo-600 dark:bg-indigo-500 rounded-[22px] flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 dark:shadow-none animate-bounce-slow">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-sans font-black text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 tracking-tight leading-none">Chấm Công Phòng Visual</h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-450 mt-2 max-w-md">
                Cổng thông tin chấm công hàng ngày, tra cứu ngày phép gối đầu và phân tích thống kê OT tự động.
              </p>
            </div>
          </div>

          {/* Centered Login Control Card */}
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800/80 shadow-xl p-6 sm:p-8 flex flex-col"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-extrabold mb-5 self-start tracking-wide animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Xin chào đồng nghiệp! 👋</span>
            </div>

            <h2 className="font-sans font-extrabold text-xl sm:text-2xl text-slate-850 dark:text-slate-100 mb-2 tracking-tight">Vào Cổng Hệ Thống</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 leading-relaxed">
              Dữ liệu được đồng bộ và bảo mật trực tiếp lên hệ thống Google Sheets phòng ban. Vui lòng chọn cổng truy cập:
            </p>

            <div className="space-y-3.5">
              {/* Google Admin Login Button */}
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full h-12 flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-md hover:shadow-lg hover:shadow-indigo-500/20 cursor-pointer disabled:opacity-50 text-xs"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>Cổng Quản trị viên (Admin)</span>
                  </>
                )}
              </button>

              <div className="w-full flex items-center justify-center py-1">
                <span className="w-full border-t border-slate-150 dark:border-slate-800" />
                <span className="px-3 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">Hoặc</span>
                <span className="w-full border-t border-slate-150 dark:border-slate-800" />
              </div>

              {/* Employee Gateway Access */}
              <button
                onClick={() => {
                  setRole('employee');
                  localStorage.setItem('user_role', 'employee');
                  setNeedsAuth(false);
                  loadAppStateFromServer('employee');
                }}
                className="w-full h-11 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-sky-500 hover:text-white dark:bg-indigo-950/40 dark:hover:from-indigo-500 dark:hover:to-sky-400 dark:hover:text-white text-indigo-700 dark:text-indigo-400 font-extrabold rounded-2xl transition-all duration-300 active:scale-[0.98] cursor-pointer text-xs shadow-sm hover:shadow-lg hover:shadow-indigo-500/25"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Xem & Tra cứu Công / Phép Nhân Viên</span>
              </button>
              
              {/* Accountant Gateway Access - Safe custom modal flow */}
              <button
                onClick={() => {
                  const savedKey = localStorage.getItem('accountant_key') || 'visual-accounting';
                  setAccountantInputKey(savedKey);
                  setAccountantError("");
                  setShowAccountantModal(true);
                }}
                className="w-full h-11 flex items-center justify-center gap-2.5 bg-rose-50 hover:bg-gradient-to-r hover:from-rose-500 hover:to-orange-500 hover:text-white dark:bg-rose-950/30 dark:hover:from-rose-600 dark:hover:to-orange-500 dark:hover:text-white text-rose-700 dark:text-rose-400 font-extrabold rounded-2xl transition-all duration-300 active:scale-[0.98] cursor-pointer text-xs shadow-sm hover:shadow-lg hover:shadow-rose-500/25"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Bộ phận Kế toán (Mã khóa bảo mật)</span>
              </button>
            </div>

          </motion.div>

          {/* Custom Accountant Login Modal */}
          {showAccountantModal && (
            <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
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
                      className="flex-1 h-11 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Xác nhận
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Bottom Help/Role Guide - Extremely clear and safe text guidance */}
          <div className="w-full max-w-4xl space-y-4 pt-4 border-t border-slate-150 dark:border-slate-800/80">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full">
                Bạn chưa biết cách sử dụng? Hãy đọc hướng dẫn dưới đây
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Employee Guide Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[24px] p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shrink-0">
                    <Smile className="w-5 h-5" />
                  </div>
                  <h4 className="font-sans font-bold text-xs text-slate-850 dark:text-slate-100 uppercase tracking-wide">Dành Cho Nhân Viên</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Nhấp vào nút <strong>"Xem & Tra cứu Công / Phép Nhân Viên"</strong> phía trên. Hệ thống sẽ tự động chuyển sang chế độ tra cứu cá nhân. Bạn chỉ cần gõ tên của mình để tìm kiếm lịch sử đi làm, tổng ngày phép năm còn lại và giờ OT đã chốt.
                  </p>
                </div>
                <div className="pt-2 text-[10px] text-indigo-500 font-extrabold flex items-center gap-1">
                  <span>Không cần mật khẩu</span>
                </div>
              </div>

              {/* Accountant Guide Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[24px] p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3 shrink-0">
                    <Printer className="w-5 h-5" />
                  </div>
                  <h4 className="font-sans font-bold text-xs text-slate-850 dark:text-slate-100 uppercase tracking-wide">Dành Cho Kế Toán</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Để truy cập trang Báo cáo chi tiết, đối chiếu phép năm gối đầu chuyển tiếp và xuất file PDF/Excel, hãy nhấp vào nút <strong>"Bộ phận Kế toán"</strong> và nhập Mã khóa bảo mật do Admin cấp riêng.
                  </p>
                </div>
                <div className="pt-2 text-[10px] text-rose-500 font-extrabold flex items-center gap-1">
                  <span>Yêu cầu Mã khóa Admin cấp</span>
                </div>
              </div>

              {/* Admin Guide Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[24px] p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-sans font-bold text-xs text-slate-850 dark:text-slate-100 uppercase tracking-wide">Dành Cho Quản Trị Viên</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Sử dụng tài khoản Google để đăng nhập. Chỉ các email thuộc danh sách whitelist được Quản trị viên chỉ định mới có thể truy cập để ghi nhận chấm công hàng ngày, quản lý nhân viên và thay đổi cấu hình.
                  </p>
                </div>
                <div className="pt-2 text-[10px] text-emerald-500 font-extrabold flex items-center gap-1">
                  <span>Yêu cầu Tài khoản Google duyệt</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Whitelist block screen if user is logged in but not in whitelist
  if (user && !isUserAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950/75 text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col justify-center items-center px-4 py-12 font-sans relative overflow-hidden">
        <WebGLBackground />
        <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] rounded-full bg-rose-400/10 blur-[80px]" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[32px] border border-rose-100 dark:border-rose-950/40 shadow-xl p-8 flex flex-col items-center relative z-10 text-center"
        >
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          
          <h2 className="font-sans font-extrabold text-xl text-slate-800 dark:text-slate-100 mb-3">Quyền truy cập bị từ chối ⚠️</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
            Tài khoản email <strong className="text-slate-800 dark:text-slate-200">{user.email}</strong> chưa được đăng ký trong danh sách được phép truy cập của Phòng Visual.
          </p>
          
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 text-xs text-left mb-6 leading-relaxed text-slate-600 dark:text-slate-400 w-full">
            <p className="font-bold mb-1 text-slate-800 dark:text-slate-200">Lưu ý bảo mật:</p>
            Vui lòng liên hệ với Quản trị viên phòng của bạn để thêm email này vào danh sách thành viên phòng ban trong cài đặt bảo mật.
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full h-11 flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-950 font-bold rounded-full transition-all active:scale-[0.98] cursor-pointer text-sm font-semibold"
          >
            Đăng xuất & Đăng nhập lại
          </button>
        </motion.div>
      </div>
    );
  }

  // Render PIN / Password block screen if app is locked
  if (user && isPinRequired) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950/75 text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col justify-center items-center px-4 py-12 font-sans relative overflow-hidden">
        <WebGLBackground />
        <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-400/10 blur-[80px]" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl p-8 flex flex-col items-center relative z-10"
        >
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 shadow-inner">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          
          <h2 className="font-sans font-extrabold text-xl text-slate-800 dark:text-slate-100 mb-2">Nhập mật khẩu phòng ban</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs text-center mb-6 leading-relaxed">
            Dữ liệu phòng Visual đã được khóa bảo mật. Vui lòng nhập mật khẩu được đồng nghiệp cung cấp để tiếp tục.
          </p>
          
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (pinInput.trim() === departmentPassword.trim()) {
                setIsUnlocked(true);
                sessionStorage.setItem('is_unlocked_session', 'true');
                setPinError("");
              } else {
                setPinError("Mật khẩu không chính xác. Vui lòng thử lại!");
              }
            }}
            className="w-full space-y-4"
          >
            <div className="space-y-1">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError("");
                }}
                placeholder="Nhập mật khẩu truy cập phòng..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-center font-sans tracking-widest text-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 shadow-inner"
                autoFocus
              />
              {pinError && (
                <p className="text-rose-500 text-[11px] text-center font-semibold mt-1 animate-pulse">
                  {pinError}
                </p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full h-11 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all active:scale-[0.98] cursor-pointer text-sm shadow-md"
            >
              Xác nhận mở khóa
            </button>
          </form>
          
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold mt-6 underline cursor-pointer"
          >
            Đăng xuất tài khoản Google
          </button>
        </motion.div>
      </div>
    );
  }

  const handleSaveSecurity = () => {
    setIsSavingSecurity(true);
    setSecuritySuccessMsg("");
    try {
      localStorage.setItem('security_enabled', editSecurityEnabled ? 'true' : 'false');
      localStorage.setItem('department_emails', editDepartmentEmails);
      localStorage.setItem('department_password', editDepartmentPassword);
      localStorage.setItem('accountant_key', editAccountantKey);

      setIsSecurityEnabled(editSecurityEnabled);
      setDepartmentEmails(editDepartmentEmails);
      setDepartmentPassword(editDepartmentPassword);
      setAccountantKey(editAccountantKey);

      if (!editSecurityEnabled) {
        setIsUnlocked(true);
        sessionStorage.setItem('is_unlocked_session', 'true');
      } else {
        // If security is enabled, check if PIN matches to keep it unlocked, or lock again
        if (sessionStorage.getItem('is_unlocked_session') !== 'true') {
          setIsUnlocked(false);
        }
      }

      setSecuritySuccessMsg("Cập nhật cài đặt bảo mật thành công!");
      setTimeout(() => setSecuritySuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSecurity(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50/70 dark:bg-slate-950/75 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 relative">
      <WebGLBackground />
      {/* Loading Overlay */}
      {isInitializingSheets && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
          <RefreshCw className="w-10 h-10 animate-spin mb-4 text-indigo-400" />
          <h3 className="text-lg font-bold">Đồng bộ hóa Google Sheets...</h3>
          <p className="text-xs text-slate-300 dark:text-slate-400 mt-1">Hệ thống đang cấu hình các Tab bảng tính tự động trên tài khoản Google của bạn</p>
        </div>
      )}

      {/* Main Header / Navigation */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 shadow-sm sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex justify-between items-center">
            
            {/* Logo and Greeting */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-sans font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">Chấm Công Văn Phòng</h1>
                  {role === 'admin' ? (
                    <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                      Quản Trị
                    </span>
                  ) : (
                    <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800/50 animate-pulse">
                      Kế Toán
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider block leading-none">Phòng Visual</span>
              </div>
            </div>

            {/* Controls and Theme Toggle */}
            {(user || role === 'accountant') && (
              <div className="flex items-center gap-3">
                {user && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden md:inline">
                    {user.email}
                  </span>
                )}

                 {/* Dark/Light Switch Button */}
                 <ThemeToggle isDarkMode={isDarkMode} onChange={setIsDarkMode} />

                {user && (
                  <button
                    onClick={triggerRefresh}
                    disabled={isLoading}
                    className="p-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                    title="Tải lại dữ liệu"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                )}

                {token && role === 'admin' && (
                  <button
                    onClick={triggerAdvancedGridSync}
                    disabled={isSyncingGrid || isLoading}
                    className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                    title="Đồng bộ dữ liệu nâng cao từ các Sheet tháng dạng lưới"
                  >
                    <FileSpreadsheet className={`w-3.5 h-3.5 ${isSyncingGrid ? 'animate-bounce' : ''}`} />
                    <span>{isSyncingGrid ? "Đang đồng bộ..." : "Đồng bộ từ các Sheet tháng"}</span>
                  </button>
                )}

                {user ? (
                  <button
                    onClick={handleLogout}
                    className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-100 dark:hover:border-rose-800/50 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Đăng xuất
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      localStorage.removeItem('user_role');
                      localStorage.removeItem('accountant_key');
                      window.location.href = window.location.pathname;
                    }}
                    className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-100 dark:hover:border-rose-800/50 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Quay lại đăng nhập
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      </header>

      {/* Sub navigation Tabs - Styled in Material Design 3 Pill format */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 sticky top-16 z-30 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 items-center py-2.5 overflow-visible">
            {role === 'admin' && (
              <>
                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setActiveTab('attendance');
                    setIsAdminDropdownOpen(false);
                  }}
                  className="relative px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors duration-350 cursor-pointer whitespace-nowrap z-10 focus:outline-none"
                >
                  {activeTab === 'attendance' && (
                    <motion.div
                      layoutId="adminActiveTab"
                      className="absolute inset-0 bg-indigo-600 dark:bg-indigo-500 rounded-full -z-10 shadow-md shadow-indigo-100/50 dark:shadow-none"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                  <Clock className={`w-4 h-4 transition-colors duration-300 ${activeTab === 'attendance' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className={`transition-colors duration-300 ${activeTab === 'attendance' ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'}`}>
                    Ghi Nhận Chấm Công
                  </span>
                </motion.button>
              </>
            )}

            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setActiveTab('reports');
                setIsAdminDropdownOpen(false);
              }}
              className="relative px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors duration-350 cursor-pointer whitespace-nowrap z-10 focus:outline-none"
            >
              {activeTab === 'reports' && (
                <motion.div
                  layoutId="adminActiveTab"
                  className="absolute inset-0 bg-indigo-600 dark:bg-indigo-500 rounded-full -z-10 shadow-md shadow-indigo-100/50 dark:shadow-none"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              <FileSpreadsheet className={`w-4 h-4 transition-colors duration-300 ${activeTab === 'reports' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
              <span className={`transition-colors duration-300 ${activeTab === 'reports' ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'}`}>
                Báo Cáo & Thống Kê {role === 'accountant' && "(Chỉ Xem)"}
              </span>
            </motion.button>

            {role === 'admin' ? (
              <div className="relative inline-block text-left z-20">
                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                  className={`relative px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all duration-350 cursor-pointer whitespace-nowrap focus:outline-none ${
                    ['employees', 'logs', 'guide'].includes(activeTab)
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30 font-bold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Quản lý & Khác</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isAdminDropdownOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                  {isAdminDropdownOpen && (
                    <>
                      {/* Invisible backdrop to close dropdown on click outside */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsAdminDropdownOpen(false)}
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="absolute right-0 sm:left-0 mt-2 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-20 flex flex-col gap-1 text-left"
                      >
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                          Danh mục Quản trị
                        </div>
                        
                        <button
                          onClick={() => {
                            setActiveTab('employees');
                            setIsAdminDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                            activeTab === 'employees'
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                              : 'text-slate-750 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Users className="w-4 h-4 shrink-0 text-indigo-500" />
                          <span>Danh Sách Nhân Viên</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('logs');
                            setIsAdminDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                            activeTab === 'logs'
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                              : 'text-slate-750 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Activity className="w-4 h-4 shrink-0 text-violet-500" />
                          <span>Nhật Ký Truy Cập</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('guide');
                            setIsAdminDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                            activeTab === 'guide'
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                              : 'text-slate-750 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <BookOpen className="w-4 h-4 shrink-0 text-sky-500" />
                          <span>Hướng Dẫn Sử Dụng</span>
                        </button>

                        <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                          Cấu hình hệ thống
                        </div>

                        <button
                          onClick={() => {
                            setShowSecurityConfig(true);
                            setIsAdminDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left text-slate-750 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                        >
                          <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Cài Đặt Bảo Mật & PIN</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowSheetConfig(true);
                            setIsAdminDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left text-slate-750 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Cấu Hình Google Sheets</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowBackupModal(true);
                            setIsAdminDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left text-slate-750 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                        >
                          <Database className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>Quản Lý Sao Lưu (JSON)</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setActiveTab('guide');
                  setIsAdminDropdownOpen(false);
                }}
                className="relative px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors duration-350 cursor-pointer whitespace-nowrap z-10 focus:outline-none"
              >
                {activeTab === 'guide' && (
                  <motion.div
                    layoutId="adminActiveTab"
                    className="absolute inset-0 bg-indigo-600 dark:bg-indigo-500 rounded-full -z-10 shadow-md shadow-indigo-100/50 dark:shadow-none"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <BookOpen className={`w-4 h-4 transition-colors duration-300 ${activeTab === 'guide' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className={`transition-colors duration-300 ${activeTab === 'guide' ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'}`}>
                  Hướng Dẫn Sử Dụng
                </span>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dynamic Tip Banner */}
        {role === 'admin' && (
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100/70 dark:border-indigo-900/40 rounded-2xl p-4.5 mb-6 flex items-start gap-3 text-indigo-800 dark:text-indigo-300 text-xs shadow-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
            <div className="space-y-1">
              <strong>Mẹo quản lý phòng Visual:</strong> Dữ liệu chấm công và tăng ca (OT) được cập nhật đồng thời lên <strong>Google Sheets</strong> để đảm bảo tính minh bạch.
            </div>
          </div>
        )}


        {/* Tab Animation Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.45 }}
          >
            {token && activeTab === 'attendance' && (
              <AttendanceTab 
                accessToken={token} 
                employees={employees} 
                timeLogs={timeLogs}
                onLogAdded={triggerRefresh} 
              />
            )}

            {token && activeTab === 'employees' && (
              <EmployeesTab 
                accessToken={token} 
                employees={employees} 
                onEmployeeAdded={triggerRefresh} 
              />
            )}

            {(token || role === 'accountant') && activeTab === 'reports' && (
              <ReportsTab 
                accessToken={token || ""}
                employees={employees} 
                timeLogs={timeLogs} 
                onLogUpdated={triggerRefresh}
                role={role}
              />
            )}

            {activeTab === 'guide' && (
              <UserGuide 
                accountantKey={accountantKey}
                departmentPassword={departmentPassword}
              />
            )}

            {role === 'admin' && activeTab === 'logs' && (
              <LogsTab 
                logs={auditLogs} 
                onRefresh={loadAuditLogs}
                isLoading={isLoading}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 py-6 mt-12 text-center text-xs text-slate-400 dark:text-slate-500 font-mono transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4">
          Bảng Chấm Công Phòng Visual
          {role === 'admin' && (
            <>
              {" • Google Sheets ID: "}
              <a 
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-500 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                {spreadsheetId.slice(0, 10)}... <FileSpreadsheet className="w-3.5 h-3.5" />
              </a>
            </>
          )}
        </div>
      </footer>

      {/* Local Backup Manager Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] border border-slate-150 dark:border-slate-800 shadow-2xl overflow-visible transition-colors duration-300 relative">
            {/* Top accent */}
            <div className="h-1.5 rounded-t-[32px] bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500" />
            
            <div className="p-6 sm:p-8">
              <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <Database className="w-5 h-5" />
                </div>
                Quản Lý Sao Lưu Cục Bộ (JSON)
              </h3>

              <div className="space-y-6">
                {/* Auto-backup status panel */}
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Tự động sao lưu đang chạy</h4>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-0.5 font-medium">Sao lưu dữ liệu định kỳ mỗi 5 phút vào bộ nhớ trình duyệt.</p>
                    </div>
                  </div>
                  {lastBackupTime && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-100/40 dark:border-emerald-900/10 flex justify-between items-center text-[11px] font-mono text-slate-500 dark:text-slate-450">
                      <span>Bản sao lưu gần nhất:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{lastBackupTime}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Để bảo vệ dữ liệu khi mất kết nối internet đột ngột, bạn có thể tải bản sao lưu đầy đủ dưới dạng file JSON hoặc khôi phục dữ liệu từ một bản sao lưu trước đó.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Download button */}
                  <button
                    onClick={downloadBackupJSON}
                    className="h-11 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold rounded-2xl transition-all cursor-pointer text-xs border border-indigo-100/30 dark:border-indigo-900/10 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Tải File Sao Lưu
                  </button>

                  {/* Upload/Restore Button */}
                  <label className="h-11 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition-all cursor-pointer text-xs shadow-sm relative overflow-hidden">
                    <Upload className="w-4 h-4" />
                    <span>Khôi Phục Dữ Liệu</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreBackup}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5 flex justify-end">
                  <button
                    onClick={() => setShowBackupModal(false)}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold transition-all cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
