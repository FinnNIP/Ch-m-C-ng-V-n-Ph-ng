const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

const targetStr = `  const accountantLeaveReports = useMemo(() => {`;
const replaceStr = `  const groupedAccountantLeaveReports = useMemo(() => {
    const filtered = accountantLeaveReports.filter(report => report.isMatched && report.displayName.toLowerCase().includes(leaveSearch.toLowerCase()));
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(r => {
      const dept = r.matchedEmployee?.department || 'Chưa phân bổ';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [accountantLeaveReports, leaveSearch]);

  const accountantLeaveReports = useMemo(() => {`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/AttendanceTab.tsx', code);
