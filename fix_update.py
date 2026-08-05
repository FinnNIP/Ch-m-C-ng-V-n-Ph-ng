import re
with open('src/sheets.ts', 'r') as f:
    content = f.read()

old_sig = """export async function updateEmployee(
  accessToken: string,
  rowIndex: number,
  oldName: string,
  newName: string,
  newRole: string,
  newRegisteredAt: string,
  newLeftAt: string,
  newLeaveAllowance?: number,
  newLeaveCarryover?: number,
  newDisplayName?: string
): Promise<void> {"""

new_sig = """export async function updateEmployee(
  accessToken: string,
  rowIndex: number,
  oldName: string,
  newName: string,
  newRole: string,
  newRegisteredAt: string,
  newLeftAt: string,
  newLeaveAllowance?: number,
  newLeaveCarryover?: number,
  newDisplayName?: string,
  newDepartment?: string
): Promise<void> {"""
content = content.replace(old_sig, new_sig)

old_local_update = """      data.employees[empIndex] = {
        ...data.employees[empIndex],
        name: newName,
        role: newRole,
        registeredAt: newRegisteredAt,
        leftAt: newLeftAt,
        leaveAllowance: newLeaveAllowance,
        leaveCarryover: newLeaveCarryover,
        displayName: newDisplayName
      };"""

new_local_update = """      data.employees[empIndex] = {
        ...data.employees[empIndex],
        name: newName,
        role: newRole,
        registeredAt: newRegisteredAt,
        leftAt: newLeftAt,
        leaveAllowance: newLeaveAllowance,
        leaveCarryover: newLeaveCarryover,
        displayName: newDisplayName,
        department: newDepartment
      };"""
content = content.replace(old_local_update, new_local_update)

old_google_update = """  const range = `DanhSachNhanVien!A${rowIndex}:H${rowIndex}`;
  const values = [
    [
      newName,
      newRole,
      newRegisteredAt,
      newLeftAt || "",
      newLeaveAllowance !== undefined ? newLeaveAllowance : "",
      newLeaveCarryover !== undefined ? newLeaveCarryover : "",
      newDisplayName || "",
      ""
    ]
  ];"""

new_google_update = """  const range = `DanhSachNhanVien!A${rowIndex}:H${rowIndex}`;
  const values = [
    [
      newName,
      newRole,
      newRegisteredAt,
      newLeftAt || "",
      newLeaveAllowance !== undefined ? newLeaveAllowance : "",
      newLeaveCarryover !== undefined ? newLeaveCarryover : "",
      newDisplayName || "",
      newDepartment || ""
    ]
  ];"""
content = content.replace(old_google_update, new_google_update)

# Oh wait, earlier when I replaced `updateEmployee`, did I hardcode `""` for department or `employee.department || ""` ?
# Let's just fix it generally.
