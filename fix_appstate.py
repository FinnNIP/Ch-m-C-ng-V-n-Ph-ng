with open('src/App.tsx', 'r') as f:
    content = f.read()

old_code = """        if (currentRole === 'accountant' && currentKey) {
          localStorage.setItem('accountant_key', currentKey);
        }"""

new_code = """        if (currentRole === 'accountant' && currentKey) {
          sessionStorage.setItem('user_role_session', 'accountant');
          sessionStorage.setItem('accountant_key_session', currentKey);
          sessionStorage.setItem('accountant_auth_expiry', (Date.now() + 12 * 60 * 60 * 1000).toString());
        }"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Replaced successfully.")
else:
    print("Not found.")
