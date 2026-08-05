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

with open('src/sheets.ts', 'w') as f:
    f.write(content)
