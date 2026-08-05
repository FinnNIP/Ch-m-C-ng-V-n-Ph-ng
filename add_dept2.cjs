const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeesTab.tsx', 'utf8');

// ADD FORM
const addRoleBlock = `                    </select>
                  </div>
                </div>`;
const addRoleReplacement = `                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ Phận</label>
                    <input
                      type="text"
                      list="dept-list"
                      placeholder="Nhập hoặc chọn bộ phận..."
                      value={empDepartment}
                      onChange={(e) => setEmpDepartment(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
                    />
                    <datalist id="dept-list">
                      {departments.map(d => <option key={d} value={d} />)}
                    </datalist>
                  </div>
                </div>`;
code = code.replace(addRoleBlock, addRoleReplacement);


// EDIT FORM
const editRoleBlock = `                        </select>
                      </div>
                      `;
const editRoleReplacement = `                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bộ Phận</label>
                        <input
                          type="text"
                          list="edit-dept-list"
                          placeholder="Nhập hoặc chọn bộ phận..."
                          value={editEmpDepartment}
                          onChange={(e) => setEditEmpDepartment(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                        />
                        <datalist id="edit-dept-list">
                          {departments.map(d => <option key={d} value={d} />)}
                        </datalist>
                      </div>
                      `;
code = code.replace(editRoleBlock, editRoleReplacement);

// ALSO restore the columns in Table and Grid modes!
// Search for Chức Vụ in table headers and add Bộ Phận
const theadRegex = /<th className="py-4 px-4 whitespace-nowrap">Chức Vụ<\/th>\s*<th className="py-4 px-4 whitespace-nowrap">Ngày Vào Làm<\/th>/g;
code = code.replace(theadRegex, '<th className="py-4 px-4 whitespace-nowrap">Chức Vụ</th>\n                <th className="py-4 px-4 whitespace-nowrap">Bộ Phận</th>\n                <th className="py-4 px-4 whitespace-nowrap">Ngày Vào Làm</th>');

const tbodyRegex = /<td className="py-4 px-4 whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">\{emp.role\}<\/td>\s*<td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">/g;
code = code.replace(tbodyRegex, '<td className="py-4 px-4 whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">{emp.role}</td>\n<td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500 font-medium">{emp.department || \'-\'}</td>\n<td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">');

// Grid mode: find emp.role and add department
const gridRoleRegex = /<div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">\{emp\.role\}<\/div>/g;
code = code.replace(gridRoleRegex, '<div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{emp.role}</div>\n                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">{emp.department || \'Chưa phân bổ\'}</div>');

fs.writeFileSync('src/components/EmployeesTab.tsx', code);
