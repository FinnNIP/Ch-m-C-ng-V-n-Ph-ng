def rep(file, line, new):
    with open(file, 'r') as f:
        lines = f.read().split('\n')
    idx = line - 1
    lines[idx] = new
    with open(file, 'w') as f:
        f.write('\n'.join(lines))

rep('src/components/ReportsTab.tsx', 2445, "                          setEditingLog({ ...editingLog, otFrom: '', otTo: '' });")
rep('src/components/ReportsTab.tsx', 2446, "                        }")
rep('src/components/ReportsTab.tsx', 2447, "                      }}")

