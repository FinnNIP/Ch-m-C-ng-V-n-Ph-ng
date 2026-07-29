import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

content = content.replace("const [showAddForm, setShowAddForm] = useState<boolean>(false);",
                          "const [showAddForm, setShowAddForm] = useState<boolean>(false);\n  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);")

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
