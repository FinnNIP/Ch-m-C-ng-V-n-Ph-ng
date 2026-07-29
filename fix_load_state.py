import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

# I will find the start of the block and the end.
start_marker = "// Check if server is empty but client has non-empty cached data"
end_marker = "if (data.spreadsheetId) {"

block = content[content.find(start_marker):content.find(end_marker)]
new_block = """// Trust the server state completely if fetch was successful.
        if (!sheetsDataLoadedRef.current) {
          const serverEmployees = data.employees || [];
          const serverTimeLogs = data.timeLogs || [];
          setEmployees(serverEmployees);
          setTimeLogs(serverTimeLogs);
        }
        
        """

content = content.replace(block, new_block)

with open('src/App.tsx', 'w') as f:
    f.write(content)
