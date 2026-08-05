import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

# Remove the "Quản lý Bộ Phận" button block completely
pattern = r"\s*\{accessToken && \(\s*<motion\.button[^>]*onClick=\{\(\) => setShowDeptManager\(true\)\}[^>]*>[\s\S]*?Quản lý Bộ Phận\s*</motion\.button>\s*\)\}"
content = re.sub(pattern, "", content)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
