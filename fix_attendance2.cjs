const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

const targetStr = `    });
      }).sort((a, b) => b.date.localeCompare(a.date)) : [];

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

const replaceStr = `    });
  }, [employees, timeLogs, currentYear]);`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/AttendanceTab.tsx', code);
