const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

const targetStr = `  const accountantLeaveReports = useMemo(() => {
    const rules = [
      {
        key: 'vu',
        searchNames: ['vũ', 'vu'],
        displayName: 'Anh Vũ',
        category: 'Còn từ năm 2025',
        ruleDesc: 'Còn tồn 12 ngày phép từ năm 2025 chuyển tiếp qua năm 2026. Kế toán lưu ý không tự động gộp phép gối đầu gộp chung.',
        totalEntitled: 12,
        usedByChat: 0,
        remainingByChat: 12,
        chatQuote: 'a Vũ còn 12 ngày phép. Sang năm không gộp phép nữa.'
      },
      {
        key: 'dung',
        searchNames: ['dũng', 'dung'],
        displayName: 'Anh Dũng',
        category: 'Còn từ năm 2025',
        ruleDesc: 'Còn dư 10 ngày phép từ năm 2025 chuyển qua 2026.',
        totalEntitled: 10,
        usedByChat: 0,
        remainingByChat: 10,
        chatQuote: 'a Dũng còn 10 ngày phép.'
      },
      {
        key: 'hao',
        searchNames: ['hảo', 'hao'],
        displayName: 'Anh Hảo',
        category: 'Còn từ năm 2025',
        ruleDesc: 'Còn dư 6 ngày phép từ năm 2025 chuyển qua 2026.',
        totalEntitled: 6,
        usedByChat: 0,
        remainingByChat: 6,
        chatQuote: 'a Hảo còn 6 ngày phép.'
      },
      {
        key: 'thuan',
        searchNames: ['thuận', 'thuan'],
        displayName: 'Anh Thuận (Thuận Tom)',
        category: 'Tích lũy năm 2026 (YTD)',
        ruleDesc: 'Phép năm 2025 dư 2 ngày đã nghỉ hết trong tháng 6/2025 (còn 0). Phép năm 2026 tính đến tháng 7 tích lũy 7 ngày, đã nghỉ 1 ngày trong tháng nên còn 6 ngày phép. Tổng cộng lịch sử đã nghỉ 13 ngày (tính từ năm 2025 đến tháng 7/2026).',
        totalEntitled: 7,
        usedByChat: 1,
        remainingByChat: 6,
        chatQuote: 'Tính theo năm 2026 thì đến tháng 7 anh có 7 ngày phép, đã nghỉ 1 ngày còn 6 ngày. Tính từ năm 2025 - 7/2026 là 13 ngày anh nghỉ.'
      },
      {
        key: 'nhi',
        searchNames: ['nhi'],
        displayName: 'Phạm Thị Anh Nhi',
        category: 'Đặc cách (Làm việc 1 năm)',
        ruleDesc: 'Đang học việc không được hưởng phép theo luật, nhưng do làm tròn 1 năm nên công ty ưu ái đặc cách cấp 6 ngày phép, đã nghỉ 2 ngày, còn lại 4 ngày phép.',
        totalEntitled: 6,
        usedByChat: 2,
        remainingByChat: 4,
        chatQuote: 'Nhi học việc nên theo luật không có ngày phép, nhưng làm được 1 năm nên công ty cho 6 ngày phép, em còn 4 ngày phép.'
      },
      {
        key: 'thuong',
        searchNames: ['thương', 'thuong'],
        displayName: 'Chị Thương',
        category: 'Tích lũy tỷ lệ (11 tháng)',
        ruleDesc: 'Thâm niên làm việc đạt 11 tháng, được tích lũy theo tỷ lệ 11 ngày phép năm, đã nghỉ 5 ngày, còn lại 6 ngày phép.',
        totalEntitled: 11,
        usedByChat: 5,
        remainingByChat: 6,
        chatQuote: 'chị Thương làm được 11 tháng thì có 11 phép, giờ còn 6 phép.'
      },
      {
        key: 'thuc',
        searchNames: ['thức', 'thuc'],
        displayName: 'Anh Thức',
        category: 'Tích lũy tỷ lệ (10 tháng)',
        ruleDesc: 'Thâm niên làm việc đạt 10 tháng, được tích lũy theo tỷ lệ 10 ngày phép năm, chưa sử dụng ngày nào, còn lại 10 ngày phép.',
        totalEntitled: 10,
        usedByChat: 0,
        remainingByChat: 10,
        chatQuote: 'a Thức làm được 10 tháng thì anh đang có 10 ngày phép.'
      }
    ];

    // Group YTD leave logs by employee name for fast lookup
    const ytdLeaveLogsByEmp = new Map<string, TimeLog[]>();
    for (const log of timeLogs) {
      if (log.status === 'Nghỉ phép') {
        const logYear = parseInt(log.date.split('-')[0], 10);
        if (logYear === currentYear) {
          const empKey = log.employeeName.trim().toLowerCase();
          if (!ytdLeaveLogsByEmp.has(empKey)) {
            ytdLeaveLogsByEmp.set(empKey, []);
          }
          ytdLeaveLogsByEmp.get(empKey)!.push(log);
        }
      }
    }

    return rules.map(rule => {
      const matchedEmp = employees.find(emp => {
        const empNameLower = emp.name.toLowerCase();
        return rule.searchNames.some(name => empNameLower.includes(name));
      });

      const empKey = matchedEmp ? matchedEmp.name.trim().toLowerCase() : '';
      const systemLeaveLogs = empKey ? (ytdLeaveLogsByEmp.get(empKey) || []) : [];
      const systemLeaveUsed = systemLeaveLogs.length;

      return {
        ...rule,
        matchedEmployee: matchedEmp,
        systemLeaveUsed,
        systemLeaveLogs,
        isMatched: !!matchedEmp
      };
    });
  }, [employees, timeLogs, currentYear]);`;

const replaceStr = `  const accountantLeaveReports = useMemo(() => {
    // Group YTD leave logs by employee name for fast lookup
    const ytdLeaveLogsByEmp = new Map<string, TimeLog[]>();
    for (const log of timeLogs) {
      if (log.status === 'Nghỉ phép') {
        const logYear = parseInt(log.date.split('-')[0], 10);
        if (logYear === currentYear) {
          const empKey = log.employeeName.trim().toLowerCase();
          if (!ytdLeaveLogsByEmp.has(empKey)) {
            ytdLeaveLogsByEmp.set(empKey, []);
          }
          ytdLeaveLogsByEmp.get(empKey)!.push(log);
        }
      }
    }

    return employees.map(emp => {
      const empKey = emp.name.trim().toLowerCase();
      const systemLeaveLogs = ytdLeaveLogsByEmp.get(empKey) || [];
      const systemLeaveUsed = systemLeaveLogs.length;
      
      const carryover = emp.leaveCarryover || 0;
      const allowance = emp.leaveAllowance !== undefined ? emp.leaveAllowance : 12; // default 12 if not set
      const totalEntitled = carryover + allowance;
      const remainingByChat = totalEntitled - systemLeaveUsed;
      
      return {
        key: emp.name,
        displayName: getEmployeeDisplayName(emp.name, isAdmin, false, emp.displayName),
        category: carryover > 0 ? 'Có phép gối đầu' : 'Phép chuẩn',
        ruleDesc: carryover > 0 
          ? \`Phép gối đầu: \${carryover} ngày. Phép năm nay: \${allowance} ngày. Tổng cộng: \${totalEntitled} ngày.\` 
          : \`Phép năm nay: \${allowance} ngày.\`,
        totalEntitled,
        usedByChat: systemLeaveUsed, // we trust the system now
        remainingByChat,
        chatQuote: '',
        matchedEmployee: emp,
        systemLeaveUsed,
        systemLeaveLogs,
        isMatched: true
      };
    });
  }, [employees, timeLogs, currentYear]);`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/AttendanceTab.tsx', code);
