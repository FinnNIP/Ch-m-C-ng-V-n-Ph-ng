import re
with open('src/components/ReportsTab.tsx', 'r') as f:
    content = f.read()

old_ret = """  return (
    <div className="space-y-8 animate-fadeIn">"""

new_ret = """  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return ['Tất cả', ...Array.from(depts), 'Chưa phân bổ'];
  }, [employees]);

  return (
    <div className="space-y-8 animate-fadeIn">"""
content = content.replace(old_ret, new_ret)

with open('src/components/ReportsTab.tsx', 'w') as f:
    f.write(content)
