const fs = require('fs');

const errorsText = `src/components/AttendanceTab.tsx(51,3): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(74,3): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(75,3): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(76,3): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(77,3): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(78,3): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(215,5): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(244,7): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(251,7): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(261,5): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(345,7): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(350,7): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(383,3): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(473,7): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(489,3): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(522,7): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(528,7): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(537,5): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(567,7): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(576,5): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(590,3): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(600,3): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(674,5): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(690,5): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(708,5): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(868,33): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(872,33): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(876,33): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(878,33): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(880,33): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(885,27): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(1160,45): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(1198,41): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(1253,31): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(1260,29): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(1276,31): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(1283,29): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(1415,31): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(1437,31): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(1556,15): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(1673,17): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(1683,17): error TS1005: ',' expected.
src/components/AttendanceTab.tsx(2561,1): error TS1005: ',' expected.
src/components/ReportsTab.tsx(199,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(254,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(268,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(287,3): error TS1005: ',' expected.
src/components/ReportsTab.tsx(295,3): error TS1005: ',' expected.
src/components/ReportsTab.tsx(303,3): error TS1005: ',' expected.
src/components/ReportsTab.tsx(317,3): error TS1005: ',' expected.
src/components/ReportsTab.tsx(393,5): error TS1005: ',' expected.
src/components/ReportsTab.tsx(408,5): error TS1005: ',' expected.
src/components/ReportsTab.tsx(473,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(507,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(519,5): error TS1005: ',' expected.
src/components/ReportsTab.tsx(521,5): error TS1005: ',' expected.
src/components/ReportsTab.tsx(548,5): error TS1005: ',' expected.
src/components/ReportsTab.tsx(627,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(633,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(706,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(708,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(710,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(792,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(797,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(831,3): error TS1005: ',' expected.
src/components/ReportsTab.tsx(944,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(956,3): error TS1005: ',' expected.
src/components/ReportsTab.tsx(976,5): error TS1005: ',' expected.
src/components/ReportsTab.tsx(1012,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(1020,7): error TS1005: ',' expected.
src/components/ReportsTab.tsx(1039,5): error TS1005: ',' expected.
src/components/ReportsTab.tsx(2330,101): error TS1005: ',' expected.
src/components/ReportsTab.tsx(2443,25): error TS1005: ',' expected.
src/components/ReportsTab.tsx(2445,25): error TS1005: ',' expected.
src/components/ReportsTab.tsx(2943,1): error TS1005: ',' expected.`;

const errors = errorsText.split('\n').filter(l => l.trim().length > 0);

const files = {
  'src/components/AttendanceTab.tsx': fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8').split('\n'),
  'src/components/ReportsTab.tsx': fs.readFileSync('src/components/ReportsTab.tsx', 'utf8').split('\n')
};

for (const err of errors) {
  const m = err.match(/(src\/components\/\w+\.tsx)\((\d+),\d+\):/);
  if (m) {
    const file = m[1];
    const lineNum = parseInt(m[2], 10) - 1; // 0-based
    const lines = files[file];
    
    // search backwards for the first `}` at the end of the line
    for (let i = lineNum; i >= Math.max(0, lineNum - 15); i--) {
      if (lines[i] && lines[i].match(/\}\s*$/)) {
        lines[i] = lines[i].replace(/\}\s*$/, '});');
        console.log(`Fixed ${file} near error line ${lineNum+1} (replaced on line ${i+1})`);
        break; // stop searching backwards for this error
      }
    }
  }
}

fs.writeFileSync('src/components/AttendanceTab.tsx', files['src/components/AttendanceTab.tsx'].join('\n'));
fs.writeFileSync('src/components/ReportsTab.tsx', files['src/components/ReportsTab.tsx'].join('\n'));
