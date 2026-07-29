with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix onBackToLogin
old_back = """          onBackToLogin={() => {
            // Remove role from URL query parameter and localStorage, then reload
            localStorage.removeItem('user_role');
            window.location.href = window.location.pathname;
          }}"""

new_back = """          onBackToLogin={() => {
            // Remove role from URL query parameter and localStorage, then reload
            localStorage.removeItem('user_role');
            sessionStorage.removeItem('user_role_session');
            sessionStorage.removeItem('accountant_key_session');
            sessionStorage.removeItem('accountant_auth_expiry');
            window.location.href = window.location.pathname;
          }}"""

if old_back in content:
    content = content.replace(old_back, new_back)
    print("Fixed onBackToLogin")
else:
    print("old_back not found")

with open('src/App.tsx', 'w') as f:
    f.write(content)
