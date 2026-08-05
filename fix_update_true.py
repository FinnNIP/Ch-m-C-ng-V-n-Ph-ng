import re
with open('src/sheets.ts', 'r') as f:
    content = f.read()

old_google_update = """  // 1. Update the employee row (A is name, B is role, C is registeredAt, D is leftAt, E is leaveAllowance, F is leaveCarryover)
  const range = `DanhSachNhanVien!A${rowIndex}:G${rowIndex}`;
  const values = [[
    newName, 
    newRole, 
    newRegisteredAt, 
    newLeftAt, 
    newLeaveAllowance !== undefined ? newLeaveAllowance : "",
    newLeaveCarryover !== undefined ? newLeaveCarryover : "",
    newDisplayName || ""
  ]];"""

new_google_update = """  // 1. Update the employee row (A to H)
  const range = `DanhSachNhanVien!A${rowIndex}:H${rowIndex}`;
  const values = [[
    newName, 
    newRole, 
    newRegisteredAt, 
    newLeftAt, 
    newLeaveAllowance !== undefined ? newLeaveAllowance : "",
    newLeaveCarryover !== undefined ? newLeaveCarryover : "",
    newDisplayName || "",
    newDepartment || ""
  ]];"""

content = content.replace(old_google_update, new_google_update)

with open('src/sheets.ts', 'w') as f:
    f.write(content)
