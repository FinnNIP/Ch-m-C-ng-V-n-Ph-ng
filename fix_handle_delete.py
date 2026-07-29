import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

old_delete = """  const handleDelete = async (emp: Employee) => {
    if (!emp.rowIndex) {
      alert("Không thể xóa nhân viên này do thiếu thông tin vị trí dòng (rowIndex).");
      return;
    }
    setDeletingState(emp.name);
    try {
      await deleteEmployee(accessToken, emp.rowIndex);"""

new_delete = """  const handleDelete = async (emp: Employee) => {
    if (!emp.rowIndex) {
      alert("Không thể xóa nhân viên này do thiếu thông tin vị trí dòng (rowIndex).");
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhân viên ${emp.name}? Hành động này không thể hoàn tác.`)) {
      return;
    }
    setDeletingState(emp.name);
    try {
      await deleteEmployee(accessToken, emp.rowIndex);"""

content = content.replace(old_delete, new_delete)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
