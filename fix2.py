import re

def rep(file, line, old, new):
    with open(file, 'r') as f:
        lines = f.read().split('\n')
    idx = line - 1
    if old in lines[idx]:
        lines[idx] = lines[idx].replace(old, new)
        with open(file, 'w') as f:
            f.write('\n'.join(lines))
        print(f"Fixed line {line} in {file}")

rep('src/components/AttendanceTab.tsx', 1198, '});', '}')
rep('src/components/AttendanceTab.tsx', 1260, '});', '}')
rep('src/components/AttendanceTab.tsx', 1283, '});', '}')

