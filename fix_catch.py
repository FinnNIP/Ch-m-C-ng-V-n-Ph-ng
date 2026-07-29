import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

catch_block = """    } catch (err) {
      console.error("Lỗi tải dữ liệu từ server:", err);
      setIsOnline(false);
    } finally {"""

new_catch = """    } catch (err) {
      console.error("Lỗi tải dữ liệu từ server:", err);
      setIsOnline(false);
      // Fallback to local cache if offline
      const localCachedEmpStr = localStorage.getItem('cached_employees');
      const localCachedLogsStr = localStorage.getItem('cached_timelogs');
      if (localCachedEmpStr) setEmployees(JSON.parse(localCachedEmpStr));
      if (localCachedLogsStr) setTimeLogs(JSON.parse(localCachedLogsStr));
    } finally {"""

content = content.replace(catch_block, new_catch)

with open('src/App.tsx', 'w') as f:
    f.write(content)
