import re
with open('src/components/ReportsTab.tsx', 'r') as f:
    content = f.read()

old_filter = """  const filteredReports = useMemo(() => {
    return monthlyReports.filter(r => 
      r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [monthlyReports, searchTerm]);"""

new_filter = """  const filteredReports = useMemo(() => {
    return monthlyReports.filter(r => {
      const matchSearch = r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || r.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = filterDepartment === 'Tất cả' || r.department === filterDepartment || (!r.department && filterDepartment === 'Chưa phân bổ');
      return matchSearch && matchDept;
    });
  }, [monthlyReports, searchTerm, filterDepartment]);"""
content = content.replace(old_filter, new_filter)

with open('src/components/ReportsTab.tsx', 'w') as f:
    f.write(content)
