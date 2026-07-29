const fs = require('fs');

let a = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8').split('\n');

// Line 1163/1160
a[1160] = '                                            }';
a[1161] = '                                          });'; // wait, it was setCustomTimePicker({ ... });

// Wait, let's just use regex on the exact file content
let text = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

// Fix setCustomTimePicker({ ... } \n }});  -> setCustomTimePicker({ ... }); \n }
text = text.replace(/setCustomTimePicker\(\{\s+isOpen: true,\s+empName: emp.name,\s+isDetailedModal: false,\s+fromVal: companyOtFrom\[emp.name\] \|\| '18:00',\s+toVal: companyOtTo\[emp.name\] \|\| '21:00'\s+\}\s+\}\}\);/g, 
  "setCustomTimePicker({\n                                            isOpen: true,\n                                            empName: emp.name,\n                                            isDetailedModal: false,\n                                            fromVal: companyOtFrom[emp.name] || '18:00',\n                                            toVal: companyOtTo[emp.name] || '21:00'\n                                          });\n                                        }");

fs.writeFileSync('src/components/AttendanceTab.tsx', text);
