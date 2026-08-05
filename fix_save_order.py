import re
with open('src/sheets.ts', 'r') as f:
    content = f.read()

old_order = """  const values = employees.map(emp => [
    emp.name,
    emp.role,
    emp.registeredAt,
    emp.leftAt || "",
    emp.leaveAllowance !== undefined ? emp.leaveAllowance : "",
    emp.leaveCarryover !== undefined ? emp.leaveCarryover : "",
    emp.displayName || ""
  ]);"""

new_order = """  const values = employees.map(emp => [
    emp.name,
    emp.role,
    emp.registeredAt,
    emp.leftAt || "",
    emp.leaveAllowance !== undefined ? emp.leaveAllowance : "",
    emp.leaveCarryover !== undefined ? emp.leaveCarryover : "",
    emp.displayName || "",
    emp.department || ""
  ]);"""
content = content.replace(old_order, new_order)

with open('src/sheets.ts', 'w') as f:
    f.write(content)
