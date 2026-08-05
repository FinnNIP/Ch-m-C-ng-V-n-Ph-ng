import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

old_call = """        editLeftAt,
        editLeaveAllowance.trim() !== '' ? Number(editLeaveAllowance) : undefined,
        editLeaveCarryover.trim() !== '' ? Number(editLeaveCarryover) : undefined,
        editExportName.trim() !== '' ? editExportName.trim() : undefined
      );"""

new_call = """        editLeftAt,
        editLeaveAllowance.trim() !== '' ? Number(editLeaveAllowance) : undefined,
        editLeaveCarryover.trim() !== '' ? Number(editLeaveCarryover) : undefined,
        editExportName.trim() !== '' ? editExportName.trim() : undefined,
        editEmpDepartment.trim() !== '' ? editEmpDepartment.trim() : undefined
      );"""
content = content.replace(old_call, new_call)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
