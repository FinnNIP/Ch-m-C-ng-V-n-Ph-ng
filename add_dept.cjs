const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeesTab.tsx', 'utf8');

// Insert State
code = code.replace("  const [empBirthday, setEmpBirthday] = useState<string>(''); // Private birthday\n", 
  "  const [empBirthday, setEmpBirthday] = useState<string>(''); // Private birthday\n" +
  "  const [empDepartment, setEmpDepartment] = useState<string>('');\n"
);

code = code.replace("  const [editBirthday, setEditBirthday] = useState<string>('');\n",
  "  const [editBirthday, setEditBirthday] = useState<string>('');\n" +
  "  const [editEmpDepartment, setEditEmpDepartment] = useState<string>('');\n"
);

// Insert into handleCreateEmployee logic
code = code.replace("        displayName: empExportName.trim() || undefined\n", 
  "        displayName: empExportName.trim() || undefined,\n" +
  "        department: empDepartment.trim() || undefined\n"
);

// Insert into handleSaveEdit logic
code = code.replace("        editExportName.trim() !== '' ? editExportName.trim() : undefined\n", 
  "        editExportName.trim() !== '' ? editExportName.trim() : undefined,\n" +
  "        editEmpDepartment.trim() !== '' ? editEmpDepartment.trim() : undefined\n"
);
code = code.replace("setEditBirthday(getPrivateBirthday(emp.name) || '');\n",
  "setEditBirthday(getPrivateBirthday(emp.name) || '');\n" +
  "    setEditEmpDepartment(emp.department || '');\n"
);

// We need to add the select for department back to the Add form and Edit form.
// In Add form, there's a grid with role and registered at maybe?
// Let's find the role input in Add Form.
const addRoleRegex = /<div>\s*<label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chức vụ \(Vd: Nhân sự\)<\/label>\s*<div className="relative">/;

// I will insert it after the role div? No, I will replace the grid container.
fs.writeFileSync('src/components/EmployeesTab.tsx', code);
