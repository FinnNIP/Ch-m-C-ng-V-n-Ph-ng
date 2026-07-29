with open('src/components/AttendanceTab.tsx', 'r') as f:
    content = f.read()

old_code = """      if (newUpdates.size > 0) {
        setRecentUpdates(newUpdates);
        const t = setTimeout(() => setRecentUpdates(new Set()), 3500);
        return () => clearTimeout(t);
      }
      prevTimeLogsRef.current = timeLogs;"""

new_code = """      prevTimeLogsRef.current = timeLogs;
      if (newUpdates.size > 0) {
        setRecentUpdates(newUpdates);
        const t = setTimeout(() => setRecentUpdates(new Set()), 3500);
        return () => clearTimeout(t);
      }"""

content = content.replace(old_code, new_code)
with open('src/components/AttendanceTab.tsx', 'w') as f:
    f.write(content)
