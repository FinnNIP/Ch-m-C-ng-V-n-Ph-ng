const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeesTab.tsx', 'utf8');

const submitReplacement = `      // Save custom export name if entered
      if (empExportName.trim()) {
        saveStoredExportName(empName.trim(), empExportName.trim());
      }
      
      // Save department if it's new
      if (empDepartment.trim() && !departments.includes(empDepartment.trim())) {
        saveDepartments([...departments, empDepartment.trim()]);
      }`;
code = code.replace(/      \/\/ Save custom export name if entered\s*if \(empExportName\.trim\(\)\) \{\s*saveStoredExportName\(empName\.trim\(\), empExportName\.trim\(\)\);\s*\}/, submitReplacement);

const editReplacement = `      // Save custom export name for PNG/PDF/Excel exports
      saveStoredExportName(editName.trim(), editExportName.trim());

      // Save department if it's new
      if (editEmpDepartment.trim() && !departments.includes(editEmpDepartment.trim())) {
        saveDepartments([...departments, editEmpDepartment.trim()]);
      }`;
code = code.replace(/      \/\/ Save custom export name for PNG\/PDF\/Excel exports\s*saveStoredExportName\(editName\.trim\(\), editExportName\.trim\(\)\);/, editReplacement);

fs.writeFileSync('src/components/EmployeesTab.tsx', code);
