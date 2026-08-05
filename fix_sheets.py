import re
with open('src/sheets.ts', 'r') as f:
    content = f.read()

content = content.replace('"DanhSachNhanVien!A:G"', '"DanhSachNhanVien!A:H"')
content = content.replace('`DanhSachNhanVien!A2:G${employees.length + 1}`', '`DanhSachNhanVien!A2:H${employees.length + 1}`')
content = content.replace('DanhSachNhanVien!A2:G1000', 'DanhSachNhanVien!A2:H1000')

old_add = """    [
      employee.name,
      employee.role,
      employee.registeredAt,
      employee.leftAt || "",
      employee.leaveAllowance !== undefined ? employee.leaveAllowance : "",
      employee.leaveCarryover !== undefined ? employee.leaveCarryover : "",
      employee.displayName || ""
    ]"""

new_add = """    [
      employee.name,
      employee.role,
      employee.registeredAt,
      employee.leftAt || "",
      employee.leaveAllowance !== undefined ? employee.leaveAllowance : "",
      employee.leaveCarryover !== undefined ? employee.leaveCarryover : "",
      employee.displayName || "",
      employee.department || ""
    ]"""
content = content.replace(old_add, new_add)

old_bulk = """  const values = employees.map(emp => [
    emp.name,
    emp.role,
    emp.registeredAt,
    emp.leftAt || "",
    emp.leaveAllowance !== undefined ? emp.leaveAllowance : "",
    emp.leaveCarryover !== undefined ? emp.leaveCarryover : "",
    emp.displayName || ""
  ]);"""

new_bulk = """  const values = employees.map(emp => [
    emp.name,
    emp.role,
    emp.registeredAt,
    emp.leftAt || "",
    emp.leaveAllowance !== undefined ? emp.leaveAllowance : "",
    emp.leaveCarryover !== undefined ? emp.leaveCarryover : "",
    emp.displayName || "",
    emp.department || ""
  ]);"""
content = content.replace(old_bulk, new_bulk)

old_update = """  const range = `DanhSachNhanVien!A${employee.rowIndex}:G${employee.rowIndex}`;
  const values = [
    [
      employee.name,
      employee.role,
      employee.registeredAt,
      employee.leftAt || "",
      employee.leaveAllowance !== undefined ? employee.leaveAllowance : "",
      employee.leaveCarryover !== undefined ? employee.leaveCarryover : "",
      employee.displayName || ""
    ]
  ];"""

new_update = """  const range = `DanhSachNhanVien!A${employee.rowIndex}:H${employee.rowIndex}`;
  const values = [
    [
      employee.name,
      employee.role,
      employee.registeredAt,
      employee.leftAt || "",
      employee.leaveAllowance !== undefined ? employee.leaveAllowance : "",
      employee.leaveCarryover !== undefined ? employee.leaveCarryover : "",
      employee.displayName || "",
      employee.department || ""
    ]
  ];"""
content = content.replace(old_update, new_update)


with open('src/sheets.ts', 'w') as f:
    f.write(content)

