const fs = require('fs');

function revert(file) {
  let lines = fs.readFileSync(file, 'utf8').split('\n');
  
  // Revert all }); to } inside JSX blocks or in general, except for specific ones
  // Actually, let's just revert ALL }); to } and then ONLY apply to the known ones!
  let newLines = lines.map(line => line.replace(/\}\s*\);\s*$/, '}'));
  fs.writeFileSync(file, newLines.join('\n'));
}

revert('src/components/AttendanceTab.tsx');
revert('src/components/ReportsTab.tsx');
