import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

old_emp = """        leftAt: empLeftAt || undefined,
        leaveAllowance: empLeaveAllowance.trim() !== '' ? Number(empLeaveAllowance) : undefined,
        leaveCarryover: empLeaveCarryover.trim() !== '' ? Number(empLeaveCarryover) : undefined
      };"""

new_emp = """        leftAt: empLeftAt || undefined,
        leaveAllowance: empLeaveAllowance.trim() !== '' ? Number(empLeaveAllowance) : undefined,
        leaveCarryover: empLeaveCarryover.trim() !== '' ? Number(empLeaveCarryover) : undefined,
        department: empDepartment.trim() || undefined
      };"""
content = content.replace(old_emp, new_emp)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
