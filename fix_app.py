import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Fix race condition: add sheetsDataLoadedRef
content = content.replace(
    "const mousePosRef = useRef({ x: 0, y: 0 });",
    "const mousePosRef = useRef({ x: 0, y: 0 });\n  const sheetsDataLoadedRef = useRef(false);"
)

# In loadData, set sheetsDataLoadedRef.current = true
content = content.replace(
    "const fetchedLogs = await getTimeLogs(authToken);",
    "const fetchedLogs = await getTimeLogs(authToken);\n      sheetsDataLoadedRef.current = true;"
)

# In loadAppStateFromServer, only update if not loaded from sheets
content = content.replace(
    "// Normal flow: update local state if server has data",
    "// Normal flow: update local state if server has data\n        if (!sheetsDataLoadedRef.current) {"
)
content = content.replace(
    "} else if (localCachedLogs.length > 0) {\n            setTimeLogs(localCachedLogs);\n          }",
    "} else if (localCachedLogs.length > 0) {\n            setTimeLogs(localCachedLogs);\n          }\n        }"
)

# 2. Refine login state handling
# isLoggingIn is already there. Let's make sure it shows loading skeleton.
login_content = """
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
            <div className="space-y-4">
"""

content = content.replace(
    """            <h2 className="font-sans font-extrabold text-xl sm:text-2xl text-slate-850 dark:text-slate-100 mb-2 tracking-tight">Vào Cổng Hệ Thống</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 leading-relaxed">
              Dữ liệu được đồng bộ và bảo mật trực tiếp lên hệ thống Google Sheets phòng ban. Vui lòng chọn cổng truy cập:
            </p>
            <div className="space-y-4">""",
    login_content
)

content = content.replace(
    """              <button
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
            </div>""",
    """              <button
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
            )}"""
)

# We should also ensure isLoggingIn is set during initAuth.
content = content.replace(
    """  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, cachedToken) => {""",
    """  // Initialize Auth
  useEffect(() => {
    setIsLoggingIn(true);
    const unsubscribe = initAuth(
      async (firebaseUser, cachedToken) => {"""
)

content = content.replace(
    """        }
        setToken(cachedToken);
      },
      (error) => {
        console.error("Auth error:", error);
        setNeedsAuth(true);
      }
    );""",
    """        }
        setToken(cachedToken);
        setIsLoggingIn(false);
      },
      (error) => {
        console.error("Auth error:", error);
        setNeedsAuth(true);
        setIsLoggingIn(false);
      }
    );"""
)

with open('src/App.tsx', 'w') as f:
    f.write(content)

