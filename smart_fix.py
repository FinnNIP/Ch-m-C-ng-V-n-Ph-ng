import subprocess
import re

def fix_file(filename):
    res = subprocess.run(['npx', 'tsc', '--noEmit'], capture_output=True, text=True)
    out = res.stdout + res.stderr

    with open(filename, 'r') as f:
        lines = f.read().split('\n')

    fixed_lines = set()

    for line_match in out.splitlines():
        if filename in line_match and "error TS1005:" in line_match:
            # Check if it's "',' expected." or "')' expected."
            if "',' expected" in line_match or "')' expected" in line_match or "'}' expected" in line_match:
                m = re.search(r'\((\d+),\d+\)', line_match)
                if m:
                    err_line = int(m.group(1)) - 1
                    # scan backwards for up to 3 lines
                    for i in range(err_line, max(-1, err_line - 4), -1):
                        if i in fixed_lines:
                            continue
                        if lines[i].strip().endswith('}'):
                            lines[i] = lines[i].rstrip() + ');'
                            fixed_lines.add(i)
                            print(f"Fixed {filename} at line {i+1} (error reported at {err_line+1})")
                            break

    with open(filename, 'w') as f:
        f.write('\n'.join(lines))

fix_file('src/components/AttendanceTab.tsx')
fix_file('src/components/ReportsTab.tsx')
