const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsTab.tsx', 'utf8');

const target1 = `<td colSpan={9} className="p-1.5 sm:p-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                              <div className="w-1.5 h-4 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                              {dept} <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[10px] ml-1">{reports.length} nhân sự</span>
                          </div>
                            </td>`;
                            
const rep1 = `<td colSpan={9} className="p-1.5 sm:p-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                {dept} <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[10px] ml-1">{reports.length} nhân sự</span>
                              </div>
                            </td>`;

code = code.replace(target1, rep1);
fs.writeFileSync('src/components/ReportsTab.tsx', code);
