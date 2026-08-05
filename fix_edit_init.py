import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

old_init = """    setEditRole(emp.role);
    setEditRegisteredAt(emp.registeredAt || '01/01/2026');"""

new_init = """    setEditRole(emp.role);
    setEditEmpDepartment(emp.department || '');
    setEditRegisteredAt(emp.registeredAt || '01/01/2026');"""
content = content.replace(old_init, new_init)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
