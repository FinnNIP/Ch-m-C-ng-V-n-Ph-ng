import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'whileHover={{ y: -6, scale: 1.018, boxShadow: "0 20px 30px -10px rgba(99, 102, 241, 0.15)" }}',
    'whileHover={{ scale: 1.02, y: -4, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}'
)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
print("Done")
