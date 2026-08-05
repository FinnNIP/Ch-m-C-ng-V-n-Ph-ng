import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

# Remove the Manage Departments Modal
# It's at the end of the file.
pattern = r"\s*\{/\* Manage Departments Modal \*/\}[\s\S]*?(?=</div>\s*\);\s*\})"
content = re.sub(pattern, "\n    ", content)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
