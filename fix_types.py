import re
with open('src/types.ts', 'r') as f:
    content = f.read()

content = content.replace("  department?: string; // Chức Vụ\n  department?: string; // Bộ phận", "  department?: string; // Bộ phận")

with open('src/types.ts', 'w') as f:
    f.write(content)
