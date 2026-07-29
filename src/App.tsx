import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { useSwipeable } from 'react-swipeable';
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
import AiAssistant from './components/AiAssistant';
import { RandomLoader } from './components/RandomLoader';
import { WebGLBackground } from './components/WebGLBackground';
import PlayfulCursor from './components/PlayfulCursor';
import { ThemeToggle } from './components/ThemeToggle';
import SyncProgressBar from './components/SyncProgressBar';
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
  Download,
  Info,
  CheckCircle2,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { playTabSound, playConfirmSound, isSoundEnabled, setSoundEnabled } from './sound';

const MainDigitalClock = () => {
  const [digitalTime, setDigitalTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setDigitalTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="flex items-center gap-3.5 px-4.5 py-2.5 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-sm font-mono text-slate-755 dark:text-slate-300 select-none self-center"
    >
      <div className="flex items-center gap-2 text-sm font-extrabold">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-base leading-none">
          {digitalTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </span>
      </div>
      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
      <div className="text-xs font-sans font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {digitalTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
      </div>
    </motion.div>
  );
};

const SmallHeaderClock = () => {
  const [digitalTime, setDigitalTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setDigitalTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="hidden md:flex items-center gap-2.5 px-3 py-1 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/80 rounded-full font-mono text-slate-700 dark:text-slate-300 no-print shrink-0 whitespace-nowrap text-xs shadow-inner self-end md:self-auto mb-1 md:mb-0">
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
      </span>
      <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-sans tracking-wider font-extrabold mr-0.5 shrink-0">GMT+7</span>
      <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest shrink-0">
        {digitalTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </span>
      <span className="text-[9px] text-slate-400 dark:text-slate-500 border-l border-slate-200 dark:border-slate-800 pl-2 ml-0.5 font-sans font-bold uppercase shrink-0">
        {digitalTime.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
      </span>
    </div>
  );
};

export default function App() {
  const hasLoadedInitialDataRef = useRef<boolean>(false);
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

  // Audio / Sound effects state
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => isSoundEnabled());

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    setSoundEnabled(next);
    if (next) playConfirmSound();
  };

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
  const [swipeDelta, setSwipeDelta] = useState<number>(0);
  const [swipeThreshold, setSwipeThreshold] = useState<number>(20);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setSwipeThreshold(40);
    }
  }, []);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitializingSheets, setIsInitializingSheets] = useState<boolean>(false);
  
  // Custom Accountant Login Modal State
  const [showAccountantModal, setShowAccountantModal] = useState<boolean>(false);
  const [shakeModal, setShakeModal] = useState(false);
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

  // Connection status (Online/Offline)
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Dynamic notification toasts list
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  // Track mouse coordinates for immersive background parallax depth
  const mousePosRef = useRef({ x: 0, y: 0 });
  const sheetsDataLoadedRef = useRef(false);

  useEffect(() => {
    let animationFrameId: number = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Coordinates normalized between -0.5 and 0.5
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      mousePosRef.current = { x, y };
      
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(() => {
          const blobs = document.querySelectorAll('.ambient-blob') as NodeListOf<HTMLElement>;
          if (blobs.length >= 3) {
            blobs[0].style.transform = `translate3d(${mousePosRef.current.x * -45}px, ${mousePosRef.current.y * -45}px, 0)`;
            blobs[1].style.transform = `translate3d(${mousePosRef.current.x * 55}px, ${mousePosRef.current.y * 55}px, 0)`;
            blobs[2].style.transform = `translate3d(${mousePosRef.current.x * -55}px, ${mousePosRef.current.y * 55}px, 0)`;
          }
          animationFrameId = 0;
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Monitor browser online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
        setIsOnline(true);
        const data = await response.json();
        
        const localCachedEmpStr = localStorage.getItem('cached_employees');
        const localCachedLogsStr = localStorage.getItem('cached_timelogs');
        const localCachedEmp = localCachedEmpStr ? JSON.parse(localCachedEmpStr) : [];
        const localCachedLogs = localCachedLogsStr ? JSON.parse(localCachedLogsStr) : [];

        // Trust the server state completely if fetch was successful.
        if (!sheetsDataLoadedRef.current) {
          const serverEmployees = data.employees || [];
          const serverTimeLogs = data.timeLogs || [];
          setEmployees(serverEmployees);
          setTimeLogs(serverTimeLogs);
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
          sessionStorage.setItem('user_role_session', 'accountant');
          sessionStorage.setItem('accountant_key_session', currentKey);
          sessionStorage.setItem('accountant_auth_expiry', (Date.now() + 12 * 60 * 60 * 1000).toString());
        }
      } else if (response.status === 401) {
        const errData = await response.json().catch(() => ({}));
        alert(errData.error || "Mã khóa bảo mật không chính xác. Không thể tải dữ liệu.");
        setRole('admin');
        setNeedsAuth(true);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu từ server:", err);
      setIsOnline(false);
      // Fallback to local cache if offline
      const localCachedEmpStr = localStorage.getItem('cached_employees');
      const localCachedLogsStr = localStorage.getItem('cached_timelogs');
      if (localCachedEmpStr) setEmployees(JSON.parse(localCachedEmpStr));
      if (localCachedLogsStr) setTimeLogs(JSON.parse(localCachedLogsStr));
    } finally {
      hasLoadedInitialDataRef.current = true;
      setIsLoading(false);
    }
  }, []);

  const handleAccountantLoginSubmit = async () => {
    const val = accountantInputKey.trim();
    if (!val) {
      setAccountantError("Vui lòng nhập Mã khóa bảo mật Kế toán!");
      setShakeModal(true);
      setTimeout(() => setShakeModal(false), 500);
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
        
        // Save to sessionStorage with 12 hour expiry as requested
        sessionStorage.setItem('user_role_session', 'accountant');
        sessionStorage.setItem('accountant_key_session', val);
        sessionStorage.setItem('accountant_auth_expiry', (Date.now() + 12 * 60 * 60 * 1000).toString()); // 12 hours
        
        setNeedsAuth(false);
        setShowAccountantModal(false);
        setAccountantError("");
      } else if (response.status === 401) {
        const errData = await response.json().catch(() => ({}));
        setAccountantError(errData.error || "Mã khóa bảo mật không chính xác!");
        setShakeModal(true);
        setTimeout(() => setShakeModal(false), 500);
      } else {
        setAccountantError("Có lỗi xảy ra khi kết nối đến máy chủ.");
        setShakeModal(true);
        setTimeout(() => setShakeModal(false), 500);
      }
    } catch (err) {
      console.error(err);
      setAccountantError("Có lỗi xảy ra khi tải dữ liệu.");
      setShakeModal(true);
      setTimeout(() => setShakeModal(false), 500);
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
    
    // Check session storage
    let sessionRole = sessionStorage.getItem('user_role_session');
    let sessionKey = sessionStorage.getItem('accountant_key_session');
    const expiryStr = sessionStorage.getItem('accountant_auth_expiry');
    
    if (sessionRole === 'accountant' && expiryStr) {
      if (Date.now() > parseInt(expiryStr, 10)) {
        // Expired
        sessionRole = null;
        sessionKey = null;
        sessionStorage.removeItem('user_role_session');
        sessionStorage.removeItem('accountant_key_session');
        sessionStorage.removeItem('accountant_auth_expiry');
      }
    }
    
    const savedRole = localStorage.getItem('user_role');
    // Session role overrides local role for accountant
    const activeRole = queryRole || sessionRole || savedRole || 'admin';
    
    const savedAccountantKey = sessionKey || localStorage.getItem('accountant_key') || 'visual-accounting';

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
    setIsLoggingIn(true);
    const unsubscribe = initAuth(
      async (firebaseUser, cachedToken) => {
        setIsLoggingIn(false);
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
        setIsLoggingIn(false);
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
      sheetsDataLoadedRef.current = true;
      setEmployees(fetchedEmployees);
      setTimeLogs(fetchedLogs);
      setIsOnline(true);
      
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
        .then(() => {
          loadAuditLogs();
          showToast("Đồng bộ dữ liệu với Google Sheets & Máy chủ thành công!", "success");
        })
        .catch(err => {
          console.error("Lỗi đồng bộ cache server:", err);
          showToast("Lỗi đồng bộ bộ nhớ đệm máy chủ. Đang lưu tạm cục bộ.", "error");
        });
    } catch (err) {
      console.error("Lỗi đồng bộ dữ liệu:", err);
      setIsOnline(false);
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
        
        // Đảm bảo là admin khi đăng nhập bằng Google
        setRole('admin');
        localStorage.setItem('user_role', 'admin');
        sessionStorage.removeItem('user_role_session');
        sessionStorage.removeItem('accountant_key_session');
        sessionStorage.removeItem('accountant_auth_expiry');
        
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

  // Periodic background polling from server for guest/employee and accountant views
  // to automatically pull the latest attendance, OT, and employee data in real-time
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const pollData = async () => {
      if (!isMounted) return;
      if (role === 'employee' || role === 'accountant' || (role === 'admin' && !token)) {
        try {
          const params = new URLSearchParams(window.location.search);
          const queryKey = params.get('key') || localStorage.getItem('accountant_key') || 'visual-accounting';
          
          const queryParams = new URLSearchParams();
          queryParams.set('role', role === 'employee' ? 'employee' : role);
          if (role === 'accountant') {
            queryParams.set('key', queryKey);
          }
          
          const res = await fetch(`/api/app-state?${queryParams.toString()}`);
          if (!res.ok) throw new Error('Sync error');
          
          const data = await res.json();
          if (isMounted) {
            setIsOnline(true);
            if (data.employees) {
              setEmployees(data.employees);
              localStorage.setItem('cached_employees', JSON.stringify(data.employees));
            }
            if (data.timeLogs) {
              setTimeLogs(data.timeLogs);
              localStorage.setItem('cached_timelogs', JSON.stringify(data.timeLogs));
            }
          }
        } catch (err) {
          if (isMounted) {
            console.debug("Auto background sync skipped:", err);
            setIsOnline(false);
          }
        } finally {
          if (isMounted) {
            timeoutId = setTimeout(pollData, 15000);
          }
        }
      }
    };

    pollData();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [role, token]);

  const handleGuestRefresh = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const queryRole = params.get('role');
    const savedRole = localStorage.getItem('user_role');
    const activeRole = queryRole || savedRole || 'employee';
    const queryKey = params.get('key') || localStorage.getItem('accountant_key') || 'visual-accounting';
    
    await loadAppStateFromServer(activeRole, queryKey);
  }, [loadAppStateFromServer]);

  // Auto-sync local cache whenever state changes
  useEffect(() => {
    if (hasLoadedInitialDataRef.current) {
      localStorage.setItem('cached_employees', JSON.stringify(employees));
      localStorage.setItem('cached_timelogs', JSON.stringify(timeLogs));
    }
  }, [employees, timeLogs]);

  // Auto-sync state to server when employees or timeLogs change for real-time synchronization
  useEffect(() => {
    if (role === 'admin' && token && hasLoadedInitialDataRef.current) {
      const delayDebounceFn = setTimeout(() => {
        const currentSpreadsheetId = spreadsheetId || localStorage.getItem('cached_spreadsheet_id') || '1WBVOBjsnSOEGKwTuKzf1LVH0ErOdzmAUKk2Bg9MtoTs';
        fetch('/api/app-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employees,
            timeLogs,
            spreadsheetId: currentSpreadsheetId,
            email: user?.email || "Quản trị viên (Admin) - Tự động lưu"
          })
        })
        .then(res => {
          if (!res.ok) throw new Error("Sync failure");
          setIsOnline(true);
          console.log("[AutoSync] Dữ liệu đã được tự động lưu lên máy chủ thành công.");
          showToast("Tự động đồng bộ thay đổi lên máy chủ thành công!", "success");
        })
        .catch(err => {
          console.error("[AutoSync] Lỗi tự động lưu lên máy chủ:", err);
          setIsOnline(false);
          showToast("Lỗi tự động đồng bộ dữ liệu. Đang lưu tạm ngoại tuyến.", "error");
        });
      }, 1500); // 1.5 seconds debounce to batch multiple immediate edits

      return () => clearTimeout(delayDebounceFn);
    }
  }, [employees, timeLogs, role, token, spreadsheetId, user?.email]);

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
      showToast("Đồng bộ dữ liệu nâng cao từ các Sheet tháng thành công!", "success");
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
    if (!hasLoadedInitialDataRef.current) return;
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

  const handleSaveSecurityConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSecurity(true);
    setSecuritySuccessMsg("");
    try {
      localStorage.setItem('security_enabled', editSecurityEnabled ? 'true' : 'false');
      localStorage.setItem('department_emails', editDepartmentEmails.trim());
      localStorage.setItem('department_password', editDepartmentPassword.trim());
      localStorage.setItem('accountant_key', editAccountantKey.trim());
      
      setIsSecurityEnabled(editSecurityEnabled);
      setDepartmentEmails(editDepartmentEmails.trim());
      setDepartmentPassword(editDepartmentPassword.trim());
      setAccountantKey(editAccountantKey.trim());

      setSecuritySuccessMsg("Đã lưu cấu hình bảo mật thành công!");
      setTimeout(() => {
        setSecuritySuccessMsg("");
        setShowSecurityConfig(false);
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleSaveSheetConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingSheet(true);
    setSheetInputError("");
    try {
      const inputVal = sheetUrlInput.trim();
      if (!inputVal) {
        // Reset to default
        setSpreadsheetId(DEFAULT_SPREADSHEET_ID);
        setLocalSpreadsheetId(DEFAULT_SPREADSHEET_ID);
        setIsSuccessfullyConnected(false);
        alert("Đã khôi phục Google Sheets về mặc định!");
        setShowSheetConfig(false);
        triggerRefresh();
        return;
      }

      const extractedId = extractSpreadsheetId(inputVal);
      if (!extractedId) {
        setSheetInputError("Đường dẫn Google Sheets không hợp lệ. Vui lòng kiểm tra lại!");
        return;
      }

      setSpreadsheetId(extractedId);
      setLocalSpreadsheetId(extractedId);
      setIsSuccessfullyConnected(true);

      if (token) {
        setIsInitializingSheets(true);
        try {
          await checkAndSetupSheets(token);
          await loadData(token, user?.email || "");
        } catch (setupErr) {
          console.error("Setup error with new sheet ID:", setupErr);
        } finally {
          setIsInitializingSheets(false);
        }
      }

      setShowSheetConfig(false);
      triggerRefresh();
    } catch (err: any) {
      setSheetInputError(err.message || "Lỗi khi lưu cấu hình bảng tính.");
    } finally {
      setIsUpdatingSheet(false);
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

  const getAvailableTabs = () => {
    let tabs = [];
    if (token) tabs.push('attendance');
    if (token || role === 'accountant') tabs.push('reports');
    if (token) tabs.push('employees');
    tabs.push('guide');
    if (role === 'admin') tabs.push('logs');
    return tabs;
  };

  const swipeHandlers = useSwipeable({
    onSwiping: (e) => {
      const target = e.event.target as HTMLElement;
      console.log('Swipe started on element with tag:', target.tagName, 'classes:', target.className);
      const ignoreSwipeSelectors = ['.overflow-auto', '.overflow-x-auto', '.overflow-y-auto', '.no-swipe', 'table', 'tr', 'td', 'th', 'input', 'textarea', 'select', '[role="dialog"]', '.modal', '.max-h-\\[550px\\]'];
      if (target.closest(ignoreSwipeSelectors.join(', '))) return;
      setSwipeDelta(e.deltaX);
    },
    onSwiped: () => setSwipeDelta(0),
    onSwipedLeft: (e) => {
      const target = e.event.target as HTMLElement;
      const ignoreSwipeSelectors = ['.overflow-auto', '.overflow-x-auto', '.overflow-y-auto', '.no-swipe', 'table', 'tr', 'td', 'th', 'input', 'textarea', 'select', '[role="dialog"]', '.modal', '.max-h-\\[550px\\]'];
      if (target.closest(ignoreSwipeSelectors.join(', '))) return;
      const tabs = getAvailableTabs();
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex !== -1 && currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
    },
    onSwipedRight: (e) => {
      const target = e.event.target as HTMLElement;
      const ignoreSwipeSelectors = ['.overflow-auto', '.overflow-x-auto', '.overflow-y-auto', '.no-swipe', 'table', 'tr', 'td', 'th', 'input', 'textarea', 'select', '[role="dialog"]', '.modal', '.max-h-\\[550px\\]'];
      if (target.closest(ignoreSwipeSelectors.join(', '))) return;
      const tabs = getAvailableTabs();
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
    },
    delta: swipeThreshold,
    preventScrollOnSwipe: false,
    trackMouse: false
  });

  // Render Employee Portal if role is employee (guest)
  if (role === 'employee') {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950/75 text-slate-800 dark:text-slate-100 transition-colors duration-300 relative">
        <SyncProgressBar isLoading={isLoading} isSyncing={isSyncingGrid} />
        <WebGLBackground />
        <PlayfulCursor />
        <EmployeePortal 
          employees={employees} 
          timeLogs={timeLogs} 
          isLoading={isLoading}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onBackToLogin={() => {
            // Remove role from URL query parameter and localStorage, then reload
            localStorage.removeItem('user_role');
            sessionStorage.removeItem('user_role_session');
            sessionStorage.removeItem('accountant_key_session');
            sessionStorage.removeItem('accountant_auth_expiry');
            window.location.href = window.location.pathname;
          }}
          accountantKey={accountantKey}
          departmentPassword={departmentPassword}
          onRefresh={handleGuestRefresh}
          isOnline={isOnline}
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
           <ThemeToggle isDarkMode={isDarkMode} onChange={setIsDarkMode} />
         </div>

        {/* Central Layout Container */}
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center relative z-10 space-y-10">
          
          {/* Header/Branding Center */}
          <div className="flex flex-col items-center text-center space-y-4">
            <motion.div 
              initial={{ rotate: -15, scale: 0.8, opacity: 0 }} 
              animate={{ rotate: 0, scale: 1, opacity: 1 }} 
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-14 h-14 bg-indigo-600 dark:bg-indigo-500 rounded-[22px] flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 dark:shadow-none cursor-pointer"
            >
              <Clock className="w-7 h-7" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="font-sans font-black text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 tracking-tight leading-none pb-2 inline-block border-b-2 border-transparent gradient-border-image">Chấm Công Phòng Visual</h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-450 mt-2 max-w-md">
                Cổng thông tin chấm công hàng ngày, tra cứu ngày phép gối đầu và phân tích thống kê OT tự động.
              </p>
            </motion.div>

            {/* Elegant Real-time Digital Clock */}
            <MainDigitalClock />
          </div>

          {/* Centered Login Control Card */}
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800/80 shadow-xl p-4 sm:p-8 flex flex-col"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-extrabold mb-5 self-start tracking-wide animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Xin chào đồng nghiệp! 👋</span>
            </div>

            <h2 className="font-sans font-extrabold text-xl sm:text-2xl text-slate-850 dark:text-slate-100 mb-2 tracking-tight">Vào Cổng Hệ Thống</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 leading-relaxed">
              Dữ liệu được đồng bộ và bảo mật trực tiếp lên hệ thống Google Sheets phòng ban. Vui lòng chọn cổng truy cập:
            </p>

            {isLoggingIn || isLoading ? (
              <div className="space-y-4 w-full animate-pulse">
                <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full"></div>
                <div className="flex items-center justify-center py-1">
                  <div className="h-px bg-slate-200 dark:bg-slate-800 w-full"></div>
                </div>
                <div className="h-11 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full"></div>
                <div className="h-11 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full"></div>
              </div>
            ) : (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              className="space-y-4"
            >
              {/* Google Admin Login Button */}
              <motion.button
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full h-12 flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-indigo-500/20 cursor-pointer disabled:opacity-50 text-xs"
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
              </motion.button>

              <div className="w-full flex items-center justify-center py-1">
                <span className="w-full border-t border-slate-150 dark:border-slate-800" />
                <span className="px-3 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">Hoặc</span>
                <span className="w-full border-t border-slate-150 dark:border-slate-800" />
              </div>

              {/* Employee Gateway Access */}
              <motion.button
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
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
              </motion.button>
              
              {/* Accountant Gateway Access - Safe custom modal flow */}
              <motion.button
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const savedKey = localStorage.getItem('accountant_key') || 'visual-accounting';
                  setAccountantInputKey(savedKey);
                  setAccountantError("");
                  setShowAccountantModal(true);
                }}
                className="w-full h-11 flex items-center justify-center gap-2.5 bg-rose-50 hover:bg-gradient-to-r hover:from-rose-500 hover:to-orange-500 hover:text-white dark:bg-rose-950/30 dark:hover:from-rose-600 dark:hover:to-orange-500 dark:hover:text-white text-rose-700 dark:text-rose-400 font-extrabold rounded-2xl transition-all duration-300 cursor-pointer text-xs shadow-sm hover:shadow-lg hover:shadow-rose-500/25"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Bộ phận Kế toán (Mã khóa bảo mật)</span>
              </motion.button>
            </motion.div>
            )}

          </motion.div>

          {/* Custom Accountant Login Modal */}
          <AnimatePresence>
            {showAccountantModal && (
              <motion.div
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                className="fixed inset-0 no-swipe bg-slate-900/40 dark:bg-black/60 z-50 flex items-center justify-center p-4"
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.85, y: 40, rotateX: 10 }}
                  animate={
                    shakeModal 
                      ? { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } }
                      : { opacity: 1, scale: 1, y: 0, x: 0, rotateX: 0 }
                  }
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  exit={{ opacity: 0, scale: 0.85, y: 40, rotateX: -10 }}
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
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                    }}
                    className="relative z-10 flex flex-col items-center"
                  >
                    <motion.div variants={{ hidden: { opacity: 0, scale: 0.5 }, visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 15 } } }} className="w-20 h-20 bg-gradient-to-br from-rose-400 to-orange-500 rounded-full flex items-center justify-center text-white mb-5 shadow-[0_8px_30px_rgba(244,63,94,0.4)] border-4 border-white dark:border-slate-800 relative group overflow-hidden">
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Printer className="w-10 h-10 group-hover:scale-110 transition-transform duration-500" />
                    </motion.div>
                    
                    <motion.h3 variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="font-sans font-black text-2xl text-slate-850 dark:text-slate-100 mb-2 text-center tracking-tight">Kế toán viên</motion.h3>
                    <motion.p variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="text-xs text-slate-500 dark:text-slate-400 mb-6 text-center leading-relaxed px-4">
                      Vui lòng nhập Mã khóa bảo mật do Admin cấp riêng để xác thực danh tính.</motion.p>
                    
                    <motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="space-y-5 w-full">
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
                    </motion.div>
                  </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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
            className="w-full h-11 flex items-center justify-center gap-2 hover-gradient-wipe-rose text-white font-bold rounded-full transition-all active:scale-[0.98] cursor-pointer text-sm shadow-md"
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
              className="w-full h-11 flex items-center justify-center gap-2 hover-gradient-wipe text-white font-bold rounded-full transition-all active:scale-[0.98] cursor-pointer text-sm shadow-md"
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
      <SyncProgressBar isLoading={isLoading} isSyncing={isSyncingGrid} />
      <WebGLBackground />
      <PlayfulCursor />

      {/* Interactive Parallax Ambient Glowing Blobs */}
      <div className="pointer-events-none fixed inset-0 no-swipe overflow-hidden z-0">
        <div 
          style={{ transition: "transform 0.1s ease-out" }}
          className="ambient-blob absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-indigo-500/8 dark:bg-indigo-600/4 blur-[130px] mix-blend-screen dark:mix-blend-multiply"
        />
        <div 
          style={{ transition: "transform 0.1s ease-out" }}
          className="ambient-blob absolute top-[25%] -right-[15%] w-[45vw] h-[45vw] rounded-full bg-cyan-400/8 dark:bg-cyan-500/4 blur-[110px] mix-blend-screen dark:mix-blend-multiply"
        />
        <div 
          style={{ transition: "transform 0.1s ease-out" }}
          className="ambient-blob absolute -bottom-[15%] left-[15%] w-[50vw] h-[50vw] rounded-full bg-rose-400/8 dark:bg-rose-500/4 blur-[120px] mix-blend-screen dark:mix-blend-multiply"
        />
      </div>

      {/* Loading Overlay */}
      {isInitializingSheets && (
        <div className="fixed inset-0 no-swipe bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
          <RandomLoader 
            message="Đang cấu hình dữ liệu Google Sheets..." 
            subMessage="Hệ thống đang xây dựng và kết nối các danh mục bảng tính tự động trên tài khoản Google Drive của bạn."
            autoCycle={true}
            cycleIntervalMs={3000}
            themeColor="text-white"
            size="lg"
          />
        </div>
      )}

      {/* Main Header / Navigation */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 shadow-sm sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="min-h-[64px] py-2 sm:py-0 sm:h-16 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
            
            {/* Logo and Greeting */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="shrink-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <h1 className="font-sans font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 whitespace-nowrap">Chấm Công</h1>
                    {role === 'admin' ? (
                      <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/50 whitespace-nowrap">
                        Quản Trị
                      </span>
                    ) : (
                      <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800/50 animate-pulse whitespace-nowrap">
                        Kế Toán
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider block leading-none whitespace-nowrap mt-0.5 sm:mt-1">Phòng Visual</span>
                </div>
              </div>
              
              {/* Connection Status Indicator - Mobile right aligned, Desktop normal */}
              <div 
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold border transition-colors whitespace-nowrap ${
                  isOnline 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-800/50' 
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100/50 dark:border-rose-800/50 animate-pulse'
                }`}
                title={
                  role === 'admin'
                    ? (isOnline ? "Kết nối hoạt động: Đang đồng bộ 2 chiều trực tiếp với Google Sheets" : "Mất kết nối: Đang sử dụng dữ liệu lưu tạm cục bộ")
                    : (isOnline ? "Kết nối hoạt động: Đang đồng bộ thời gian thực từ Máy chủ" : "Mất kết nối: Đang sử dụng dữ liệu lưu tạm cục bộ")
                }
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>{isOnline ? "Đồng bộ" : "Offline"}</span>
              </div>
            </div>
            
            {/* Controls and Theme Toggle */}
            {(user || role === 'accountant') && (
              <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-1.5 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap pt-1 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800/50">
                {user && (
                  <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium hidden md:inline whitespace-nowrap">
                    {user.email}
                  </span>
                )}

                 {/* Dark/Light Switch Button */}
                 <div className="flex items-center gap-1.5">
                   <ThemeToggle isDarkMode={isDarkMode} onChange={setIsDarkMode} />
  
                   {/* Sound Effects Toggle Button */}
                   <button
                     onClick={handleToggleSound}
                     className="p-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold transition-colors shrink-0"
                     title={soundEnabled ? "Âm thanh phản hồi: Bật (Nhấp để Tắt)" : "Âm thanh phản hồi: Tắt (Nhấp để Bật)"}
                   >
                     {soundEnabled ? (
                       <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
                     ) : (
                       <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 dark:text-slate-500" />
                     )}
                   </button>
                 </div>

                <div className="flex items-center gap-1.5">
                  {user && (
                    <button
                      onClick={triggerRefresh}
                      disabled={isLoading}
                      className="p-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold transition-colors shrink-0"
                      title="Tải lại dữ liệu"
                    >
                      <RefreshCw className={`w-4 h-4 text-indigo-500 ${isLoading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline whitespace-nowrap">Tải lại</span>
                    </button>
                  )}
  
                  {token && role === 'admin' && (
                    <button
                      onClick={triggerAdvancedGridSync}
                      disabled={isSyncingGrid || isLoading}
                      className="p-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50 rounded-2xl shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold transition-all shrink-0 whitespace-nowrap active:scale-95 disabled:opacity-50"
                      title="Đồng bộ dữ liệu nâng cao từ các Sheet tháng dạng lưới"
                    >
                      <FileSpreadsheet className={`w-3.5 h-3.5 ${isSyncingGrid ? 'animate-bounce' : ''} shrink-0`} />
                      <span className="hidden lg:inline">{isSyncingGrid ? "Đang đồng bộ..." : "Đồng bộ từ các Sheet tháng"}</span>
                      <span className="hidden sm:inline lg:hidden">{isSyncingGrid ? "Đồng bộ..." : "Đồng bộ Sheet"}</span>
                      <span className="sm:hidden">{isSyncingGrid ? "Đang tải..." : "Đồng bộ"}</span>
                    </button>
                  )}
  
                  {user ? (
                    <button
                      onClick={handleLogout}
                      className="p-1.5 px-3 sm:px-3.5 sm:py-1.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-100 dark:hover:border-rose-800/50 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 rounded-full text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                      title="Đăng xuất"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">Đăng xuất</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        localStorage.removeItem('user_role');
                        localStorage.removeItem('accountant_key');
                        window.location.href = window.location.pathname;
                      }}
                      className="p-1.5 px-3 sm:px-3.5 sm:py-1.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-100 dark:hover:border-rose-800/50 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 rounded-full text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                      title="Quay lại đăng nhập"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">Đăng xuất</span>
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* Sub navigation Tabs - Styled in Material Design 3 Pill format */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 sticky top-16 z-30 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between py-1 gap-4">
            <div className="flex gap-2 items-center py-1.5 overflow-x-auto sm:overflow-visible scrollbar-none flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
            {role === 'admin' && (
              <>
                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    playTabSound();
                    setActiveTab('attendance');
                    setIsAdminDropdownOpen(false);
                  }}
                  className="relative px-6 py-3 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors duration-350 cursor-pointer whitespace-nowrap z-10 focus:outline-none"
                >
                  {activeTab === 'attendance' && (
                    <motion.div
                      layoutId="adminActiveTab"
                      className="absolute inset-0 bg-indigo-600 dark:bg-indigo-500 rounded-full -z-10 shadow-md shadow-indigo-100/50 dark:shadow-none"
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
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
                playTabSound();
                setActiveTab('reports');
                setIsAdminDropdownOpen(false);
              }}
              className="relative px-6 py-3 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors duration-350 cursor-pointer whitespace-nowrap z-10 focus:outline-none"
            >
              {activeTab === 'reports' && (
                <motion.div
                  layoutId="adminActiveTab"
                  className="absolute inset-0 bg-indigo-600 dark:bg-indigo-500 rounded-full -z-10 shadow-md shadow-indigo-100/50 dark:shadow-none"
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
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
                  className="relative px-6 py-3 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors duration-350 cursor-pointer whitespace-nowrap z-10 focus:outline-none"
                >
                  {['employees', 'logs', 'guide'].includes(activeTab) && (
                    <motion.div
                      layoutId="adminActiveTab"
                      className="absolute inset-0 bg-indigo-600 dark:bg-indigo-500 rounded-full -z-10 shadow-md shadow-indigo-100/50 dark:shadow-none"
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    />
                  )}
                  <Settings className={`w-4 h-4 transition-colors duration-300 ${['employees', 'logs', 'guide'].includes(activeTab) ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className={`transition-colors duration-300 ${['employees', 'logs', 'guide'].includes(activeTab) ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'}`}>
                    Quản Lý & Khác
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-colors duration-300 ${['employees', 'logs', 'guide'].includes(activeTab) ? 'text-white' : 'text-slate-500 dark:text-slate-400'} ${isAdminDropdownOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                  {isAdminDropdownOpen && (
                    <>
                      {/* Invisible backdrop to close dropdown on click outside */}
                      <div 
                        className="fixed inset-0 no-swipe z-40" 
                        onClick={() => setIsAdminDropdownOpen(false)}
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        className="fixed top-32 left-4 right-4 sm:absolute sm:top-auto sm:left-0 sm:right-auto sm:mt-2 sm:w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 text-left"
                      >
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Danh mục Quản trị
                        </div>
                        
                        <button
                          onClick={() => {
                            playTabSound();
                            setActiveTab('employees');
                            setIsAdminDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-200 cursor-pointer ${
                            activeTab === 'employees'
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                          }`}
                        >
                          <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>Danh Sách Nhân Viên</span>
                        </button>

                        <button
                          onClick={() => {
                            playTabSound();
                            setActiveTab('logs');
                            setIsAdminDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-200 cursor-pointer ${
                            activeTab === 'logs'
                              ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 font-bold shadow-xs'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-violet-600 dark:hover:text-violet-400'
                          }`}
                        >
                          <Activity className="w-4 h-4 text-violet-500 shrink-0" />
                          <span>Nhật Ký Truy Cập</span>
                        </button>

                        <button
                          onClick={() => {
                            playTabSound();
                            setActiveTab('guide');
                            setIsAdminDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-200 cursor-pointer ${
                            activeTab === 'guide'
                              ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-sky-600 dark:hover:text-sky-400'
                          }`}
                        >
                          <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />
                          <span>Hướng Dẫn Sử Dụng</span>
                        </button>

                        <div className="border-t border-slate-100 dark:border-slate-850/80 my-1" />
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Cấu hình hệ thống
                        </div>

                        <button
                          onClick={() => {
                            setShowSecurityConfig(true);
                            setIsAdminDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-amber-500 dark:hover:text-amber-400 transition-all duration-200 cursor-pointer"
                        >
                          <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Cài Đặt Bảo Mật & PIN</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowSheetConfig(true);
                            setIsAdminDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all duration-200 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Cấu Hình Google Sheets</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowBackupModal(true);
                            setIsAdminDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-200 cursor-pointer"
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
                className="relative px-6 py-3 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors duration-350 cursor-pointer whitespace-nowrap z-10 focus:outline-none"
              >
                {activeTab === 'guide' && (
                  <motion.div
                    layoutId="adminActiveTab"
                    className="absolute inset-0 bg-indigo-600 dark:bg-indigo-500 rounded-full -z-10 shadow-md shadow-indigo-100/50 dark:shadow-none"
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  />
                )}
                <BookOpen className={`w-4 h-4 transition-colors duration-300 ${activeTab === 'guide' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className={`transition-colors duration-300 ${activeTab === 'guide' ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'}`}>
                  Hướng Dẫn Sử Dụng
                </span>
              </motion.button>
            )}
            </div>

            {/* Elegant Digital Clock - Pinned beautifully to the right of navigation tabs */}
            <SmallHeaderClock />
            
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto min-w-0 px-2 sm:px-6 lg:px-8 py-6 sm:py-8" {...swipeHandlers}>
        {/* Swipe Indicator Handle */}
        <div className="w-full flex justify-center mb-4 sm:hidden opacity-50">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
        </div>
        
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
            animate={{ opacity: 1, y: 0, scale: 1, x: swipeDelta ? -swipeDelta * 0.5 : 0 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.45 }}
            className="w-full"
          >
            {token && activeTab === 'attendance' && (
              <AttendanceTab 
                accessToken={token} 
                employees={employees} 
                timeLogs={timeLogs}
                onLogAdded={triggerRefresh} 
                isLoading={isLoading}
              />
            )}

            {token && activeTab === 'employees' && (
              <EmployeesTab 
                accessToken={token} 
                employees={employees} 
                onEmployeeAdded={triggerRefresh} 
                isLoading={isLoading}
              />
            )}

            {(token || role === 'accountant') && activeTab === 'reports' && (
              <ReportsTab 
                accessToken={token || ""}
                employees={employees} 
                timeLogs={timeLogs} 
                onLogUpdated={triggerRefresh}
                role={role}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'guide' && (
              <UserGuide 
                accountantKey={accountantKey}
                departmentPassword={departmentPassword}
                showSensitiveInfo={role === 'admin'}
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
      <AnimatePresence>
        {showBackupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 no-swipe bg-slate-900/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] border border-slate-150 dark:border-slate-800 shadow-2xl overflow-visible transition-colors duration-300 relative my-auto"
            >
              {/* Top accent */}
              <div className="h-1.5 rounded-t-[32px] bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500" />
              
              <div className="p-4 sm:p-8">
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
                      className="h-11 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold rounded-2xl transition-all cursor-pointer text-xs border border-indigo-100/30 dark:border-indigo-900/10 shadow-sm hover:scale-[1.02]"
                    >
                      <Download className="w-4 h-4" />
                      Tải File Sao Lưu
                    </button>

                    {/* Upload/Restore Button */}
                    <label className="h-11 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition-all cursor-pointer text-xs shadow-sm relative overflow-hidden hover:scale-[1.02]">
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
                      className="px-6 py-3 sm:px-5 sm:py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-[1.03]"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSheetConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 no-swipe bg-slate-900/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] border border-slate-150 dark:border-slate-800 shadow-2xl overflow-visible transition-colors duration-300 relative my-auto"
            >
              <div className="h-1.5 rounded-t-[32px] bg-gradient-to-r from-emerald-500 to-teal-500" />
              
              <div className="p-4 sm:p-8">
                <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  Cấu Hình Google Sheets Mới
                </h3>

                <form onSubmit={handleSaveSheetConfig} className="space-y-5">
                  <div className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Đường Dẫn Hoặc ID Google Sheets
                      </label>
                      <input
                        type="text"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={sheetUrlInput}
                        onChange={(e) => setSheetUrlInput(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors"
                      />
                      <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-2 leading-relaxed">
                        Lưu ý: Để trống ô và nhấn Lưu để reset lại dữ liệu về bảng Google Sheets công cộng mặc định của hệ thống.
                      </p>
                    </div>

                    {sheetInputError && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-450 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{sheetInputError}</span>
                      </div>
                    )}

                    <div className="p-4 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 space-y-2 leading-relaxed">
                      <p className="font-bold text-slate-600 dark:text-slate-350">Hướng dẫn chuyển quyền truy cập:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Chia sẻ file Google Sheets của bạn cho email: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded font-mono text-[10px] text-indigo-600 dark:text-indigo-400">client-sheets-access@...</code> (hoặc mở Quyền truy cập cho Bất kỳ ai có đường liên kết với vai trò Người chỉnh sửa).</li>
                        <li>Copy đường link trình duyệt của Sheets đó dán vào đây và ấn Lưu.</li>
                      </ol>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSheetUrlInput("");
                        setSheetInputError("");
                      }}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-850 hover:bg-slate-250 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-[1.03]"
                    >
                      Reset Ô Nhập
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSheetConfig(false)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-[1.03]"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingSheet}
                      className="px-5 py-2 hover-gradient-wipe-emerald text-white rounded-full text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {isUpdatingSheet ? "Đang xử lý..." : "Lưu Cấu Hình"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security & PIN Config Modal */}
      <AnimatePresence>
        {showSecurityConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 no-swipe bg-slate-900/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] border border-slate-150 dark:border-slate-800 shadow-2xl overflow-visible transition-colors duration-300 relative my-auto"
            >
              <div className="h-1.5 rounded-t-[32px] bg-gradient-to-r from-amber-500 to-orange-500" />
              
              <div className="p-4 sm:p-8">
                <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="p-1.5 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  Cài Đặt Bảo Mật & PIN Truy Cập
                </h3>

                <form onSubmit={handleSaveSecurityConfig} className="space-y-4.5">
                  <div className="space-y-4 text-left">
                    {/* Enable Switch */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Chế độ bảo mật</h4>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">Yêu cầu xác thực tài khoản/mật khẩu khi nhân viên vào xem.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editSecurityEnabled}
                          onChange={(e) => setEditSecurityEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    {editSecurityEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 overflow-hidden"
                      >
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Danh sách Email Nhân Viên (phân cách bằng dấu phẩy)
                          </label>
                          <textarea
                            rows={2}
                            placeholder="viet@company.com, hoa@company.com, nam@company.com"
                            value={editDepartmentEmails}
                            onChange={(e) => setEditDepartmentEmails(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100 transition-colors"
                          />
                          <p className="text-[10px] text-slate-450 mt-1 leading-relaxed">
                            Chỉ những nhân viên có email trong danh sách này mới có thể đăng nhập cổng Guest.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                              Mã PIN/Mật Khẩu Nhân Viên
                            </label>
                            <input
                              type="password"
                              placeholder="Nhập mã PIN"
                              value={editDepartmentPassword}
                              onChange={(e) => setEditDepartmentPassword(e.target.value)}
                              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                              Mã Kế Toán (Accountant Key)
                            </label>
                            <input
                              type="text"
                              placeholder="visual-accounting"
                              value={editAccountantKey}
                              onChange={(e) => setEditAccountantKey(e.target.value)}
                              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100 transition-colors"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {securitySuccessMsg && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100/30 dark:border-emerald-900/30 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs">
                        <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span>{securitySuccessMsg}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSecurityConfig(false)}
                      className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-[1.03]"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingSecurity}
                      className="px-6 py-2 hover-gradient-wipe text-white rounded-full text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSavingSecurity ? "Đang lưu..." : "Lưu Cấu Hình"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reassuring Floating Sync Toast Notification Panel */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none" id="toast-notifications-panel">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 40, scale: 0.9, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.85, y: -10, filter: 'blur(8px)', transition: { duration: 0.25 } }}
              className={`pointer-events-auto flex items-start gap-3 px-4.5 py-3.5 rounded-2xl shadow-xl backdrop-blur-xl border transition-all duration-300 ${
                toast.type === 'error'
                  ? 'bg-rose-50/95 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-200/50 dark:border-rose-900/40'
                  : toast.type === 'info'
                  ? 'bg-indigo-50/95 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-200 border-indigo-200/50 dark:border-indigo-900/40'
                  : 'bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200/50 dark:border-emerald-900/40'
              }`}
            >
              <div className={`p-1.5 rounded-xl mt-0.5 shrink-0 ${
                toast.type === 'error'
                  ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
                  : toast.type === 'info'
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                  : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
              }`}>
                {toast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : toast.type === 'info' ? (
                  <Info className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-60 leading-none mb-1">
                  {toast.type === 'error' ? 'Lỗi hệ thống' : toast.type === 'info' ? 'Hệ thống' : 'Đồng bộ Sheets'}
                </p>
                <p className="text-xs font-semibold leading-normal break-words">
                  {toast.message}
                </p>
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer text-current opacity-50 hover:opacity-100 shrink-0 mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Gemini AI Assistant (Powered by Gemini 3.5) */}
      <AiAssistant 
        employees={employees} 
        timeLogs={timeLogs} 
        selectedMonth={new Date().getMonth() + 1} 
        selectedYear={new Date().getFullYear()} 
      />
    </div>
  );
}
