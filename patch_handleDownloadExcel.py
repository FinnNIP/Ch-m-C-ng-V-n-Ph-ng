import re
with open('src/components/ReportsTab.tsx', 'r') as f:
    content = f.read()

old_cb = """  const handleDownloadExcel = useCallback(async () => {
    setIsDownloadingExcel(true);
    try {"""

new_cb = """  const handleDownloadExcel = useCallback(async (deptToExport: string = 'Tất cả') => {
    setIsDownloadingExcel(true);
    try {
      const reportsToExport = monthlyReports.filter(report => {
        if (deptToExport === 'Tất cả') return true;
        if (deptToExport === 'Chưa phân bổ') return !report.department;
        return report.department === deptToExport;
      }).filter(report => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          return report.employeeName.toLowerCase().includes(searchLower) ||
            report.role.toLowerCase().includes(searchLower);
        }
        return true;
      });
"""
content = content.replace(old_cb, new_cb)

# Replace filteredReports with reportsToExport in handleDownloadExcel
old_foreach = """      // Add Data rows
      filteredReports.forEach((report, idx) => {"""

new_foreach = """      // Add Data rows
      reportsToExport.forEach((report, idx) => {"""
content = content.replace(old_foreach, new_foreach)

with open('src/components/ReportsTab.tsx', 'w') as f:
    f.write(content)
