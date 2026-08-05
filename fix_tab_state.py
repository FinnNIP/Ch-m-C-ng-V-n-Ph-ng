import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

content = content.replace("const [empRole, setEmpRole] = useState<string>('Nhân viên');",
                          "const [empRole, setEmpRole] = useState<string>('Nhân viên');\n  const [empDepartment, setEmpDepartment] = useState<string>('');")

content = content.replace("const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);",
                          "const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);\n  const [editEmpDepartment, setEditEmpDepartment] = useState<string>('');")

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
