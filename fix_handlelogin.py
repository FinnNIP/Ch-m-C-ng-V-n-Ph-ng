with open('src/App.tsx', 'r') as f:
    content = f.read()

old_login = """  const handleLogin = async () => {
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
  };"""

new_login = """  const handleLogin = async () => {
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
  };"""

if old_login in content:
    content = content.replace(old_login, new_login)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Fixed handleLogin")
else:
    print("handleLogin not found")
