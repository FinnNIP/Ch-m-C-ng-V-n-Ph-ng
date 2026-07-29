import re

with open('src/components/AttendanceTab.tsx', 'r') as f:
    lines = f.read().split('\n')

def fix(line_num):
    # line_num is 1-based, array is 0-based. we want to fix line_num-1 (which is line_num - 2 in array)
    idx = line_num - 2
    if lines[idx].strip().endswith('}'):
        lines[idx] = lines[idx].rstrip() + ');'

fix(51)
fix(74)
fix(75)
fix(76)
fix(77)
fix(78)
fix(215)
fix(244)
fix(251)
fix(261)
fix(345)
fix(350)
fix(383)
fix(473)
fix(489)
fix(522)
fix(528)
fix(537)
fix(567)
fix(576)
fix(590)
fix(600)
fix(674)
fix(690)
fix(708)
fix(868)
fix(872)
fix(876)
fix(878)
fix(880)
fix(885)
fix(1160)
fix(1198)
fix(1253)
fix(1260)
fix(1276)
fix(1283)
fix(1415)
fix(1437)
fix(1556)
fix(1673)
fix(1683)

with open('src/components/AttendanceTab.tsx', 'w') as f:
    f.write('\n'.join(lines))
