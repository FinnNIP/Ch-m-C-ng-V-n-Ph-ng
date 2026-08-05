const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

// Revert the previous bad change
const badCode = `  const groupedAccountantLeaveReports = useMemo(() => {
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

code = code.replace(badCode, "  const accountantLeaveReports = useMemo(() => {");

// Now apply it correctly AFTER accountantLeaveReports
const targetStr2 = `  }, [employees, timeLogs, currentYear]);

  const handleSubmit = async (e: React.FormEvent) => {`;

const replaceStr2 = `  }, [employees, timeLogs, currentYear]);

  const groupedAccountantLeaveReports = useMemo(() => {
    const filtered = accountantLeaveReports.filter(report => report.isMatched && report.displayName.toLowerCase().includes(leaveSearch.toLowerCase()));
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(r => {
      const dept = r.matchedEmployee?.department || 'Chưa phân bổ';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [accountantLeaveReports, leaveSearch]);

  const handleSubmit = async (e: React.FormEvent) => {`;

code = code.replace(targetStr2, replaceStr2);
fs.writeFileSync('src/components/AttendanceTab.tsx', code);
