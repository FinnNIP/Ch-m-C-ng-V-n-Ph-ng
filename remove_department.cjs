const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeesTab.tsx', 'utf8');

// Remove state
code = code.replace("  const [empDepartment, setEmpDepartment] = useState<string>('');\n", "");
code = code.replace("  const [editEmpDepartment, setEditEmpDepartment] = useState<string>('');\n", "");

// Remove from form logic
code = code.replace("        department: empDepartment.trim() || undefined,\n", "");
code = code.replace("setEditEmpDepartment(emp.department || '');", "");
code = code.replace("        department: editEmpDepartment.trim() !== '' ? editEmpDepartment.trim() : undefined\n", "");

// Remove from tables (th and td)
code = code.replace(/<th className="py-4 px-4 whitespace-nowrap">Bộ Phận<\/th>\n/g, "");
code = code.replace(/<td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500 font-medium">{emp.department \|\| '-'}<\/td>\n/g, "");

// Remove input fields
const addInputRegex = /<div>\s*<label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ phận \(Tuỳ chọn\)<\/label>\s*<input\s*type="text"\s*placeholder="Vd: Kỹ thuật, Văn phòng..."\s*value=\{empDepartment\}\s*onChange=\{\(e\) => setEmpDepartment\(e\.target\.value\)\}\s*className="w-full px-4 py-2\.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-800 dark:text-slate-200"\s*\/>\s*<\/div>/;
code = code.replace(addInputRegex, "");

const editInputRegex = /<div>\s*<label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ phận \(Tuỳ chọn\)<\/label>\s*<input\s*type="text"\s*placeholder="Vd: Kỹ thuật, Văn phòng..."\s*value=\{editEmpDepartment\}\s*onChange=\{\(e\) => setEditEmpDepartment\(e\.target\.value\)\}\s*className="w-full px-4 py-2\.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 text-slate-800 dark:text-slate-200"\s*\/>\s*<\/div>/;
code = code.replace(editInputRegex, "");

fs.writeFileSync('src/components/EmployeesTab.tsx', code);
