import re
with open('src/components/ReportsTab.tsx', 'r') as f:
    content = f.read()

content = content.replace("const [searchTerm, setSearchTerm] = useState<string>(\"\");",
                          "const [searchTerm, setSearchTerm] = useState<string>(\"\");\n  const [filterDepartment, setFilterDepartment] = useState<string>('Tất cả');")

with open('src/components/ReportsTab.tsx', 'w') as f:
    f.write(content)
