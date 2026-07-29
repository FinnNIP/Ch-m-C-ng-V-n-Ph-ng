def rep(file, line, new):
    with open(file, 'r') as f:
        lines = f.read().split('\n')
    idx = line - 1
    lines[idx] = new
    with open(file, 'w') as f:
        f.write('\n'.join(lines))

rep('src/components/AttendanceTab.tsx', 1198, "                                        }}")
rep('src/components/AttendanceTab.tsx', 1260, "                             }}")
rep('src/components/AttendanceTab.tsx', 1283, "                             }}")
rep('src/components/AttendanceTab.tsx', 1683, "                    });")
rep('src/components/AttendanceTab.tsx', 1996, "            })()}")

