import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "import { Search, User, Briefcase, UserPlus, Calendar, Trash2, Edit2, ChevronUp, ChevronDown, LayoutGrid, List, X, Sliders } from 'lucide-react';",
    "import { Search, User, Briefcase, UserPlus, Calendar, Trash2, Edit2, ChevronUp, ChevronDown, LayoutGrid, List, X, Sliders, Settings } from 'lucide-react';"
)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
print("Done")
