const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeesTab.tsx', 'utf8');

// The field in handleSaveEdit:
code = code.replace(/department: editEmpDepartment\.trim\(\) !== '' \? editEmpDepartment\.trim\(\) : undefined,/g, "");

// The field in handleCreateEmployee:
code = code.replace(/department: empDepartment\.trim\(\) \|\| undefined,/g, "");

fs.writeFileSync('src/components/EmployeesTab.tsx', code);
