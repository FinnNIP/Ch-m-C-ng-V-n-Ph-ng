import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Add shakeModal state
if "const [shakeModal, setShakeModal]" not in content:
    content = content.replace(
        "const [showAccountantModal, setShowAccountantModal] = useState<boolean>(false);",
        "const [showAccountantModal, setShowAccountantModal] = useState<boolean>(false);\n  const [shakeModal, setShakeModal] = useState(false);"
    )

# 2. Update handleAccountantLoginSubmit
old_submit = """    const val = accountantInputKey.trim();
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
      if (response.ok) {"""

new_submit = """    const val = accountantInputKey.trim();
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
      if (response.ok) {"""
content = content.replace(old_submit, new_submit)

old_submit_success = """        // Success login states
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
  };"""

new_submit_success = """        // Success login states
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
  };"""
content = content.replace(old_submit_success, new_submit_success)

# 3. Modify initial role detection
old_detect = """  // Detect role and access key from URL or LocalStorage fallback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryRole = params.get('role');
    const queryKey = params.get('key');
    
    const savedRole = localStorage.getItem('user_role');
    const activeRole = queryRole || savedRole || 'admin';
    
    const savedAccountantKey = localStorage.getItem('accountant_key') || 'visual-accounting';

    if (activeRole === 'accountant') {"""

new_detect = """  // Detect role and access key from URL or LocalStorage fallback
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

    if (activeRole === 'accountant') {"""
content = content.replace(old_detect, new_detect)

# 4. Modify modal render for shake
old_modal_start = """                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl w-full max-w-md rounded-[32px] border border-slate-150/50 dark:border-slate-800/50 p-8 shadow-[0_0_40px_-15px_rgba(244,63,94,0.3)] relative text-left overflow-hidden"
                >"""

new_modal_start = """                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={
                    shakeModal 
                      ? { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } }
                      : { opacity: 1, scale: 1, y: 0, x: 0 }
                  }
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl w-full max-w-md rounded-[32px] border border-slate-150/50 dark:border-slate-800/50 p-8 shadow-[0_0_40px_-15px_rgba(244,63,94,0.3)] relative text-left overflow-hidden"
                >"""
content = content.replace(old_modal_start, new_modal_start)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Done replacement")
