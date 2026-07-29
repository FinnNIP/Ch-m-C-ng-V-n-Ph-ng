import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

new_effect = """  // Auto-sync local cache whenever state changes
  useEffect(() => {
    if (hasLoadedInitialDataRef.current) {
      localStorage.setItem('cached_employees', JSON.stringify(employees));
      localStorage.setItem('cached_timelogs', JSON.stringify(timeLogs));
    }
  }, [employees, timeLogs]);

  // Auto-sync state to server when employees or timeLogs change for real-time synchronization"""

content = content.replace("  // Auto-sync state to server when employees or timeLogs change for real-time synchronization", new_effect)

with open('src/App.tsx', 'w') as f:
    f.write(content)
