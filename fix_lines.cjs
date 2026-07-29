const fs = require('fs');

function fixLine(file, lineIdx, newText) {
  let lines = fs.readFileSync(file, 'utf8').split('\n');
  lines[lineIdx] = newText;
  fs.writeFileSync(file, lines.join('\n'));
}

fixLine('src/components/AttendanceTab.tsx', 1259, '                             }');
fixLine('src/components/AttendanceTab.tsx', 1282, '                             }');
fixLine('src/components/AttendanceTab.tsx', 1414, '                               });');
fixLine('src/components/AttendanceTab.tsx', 1415, '                             }}');
fixLine('src/components/AttendanceTab.tsx', 1436, '                               });');
fixLine('src/components/AttendanceTab.tsx', 1437, '                               }');
fixLine('src/components/AttendanceTab.tsx', 1555, '               };'); // it was `};` but was replaced with `});`? 
fixLine('src/components/AttendanceTab.tsx', 1672, '                 }');
fixLine('src/components/AttendanceTab.tsx', 1682, '                   });');
