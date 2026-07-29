with open('src/App.tsx', 'r') as f:
    lines = f.read().split('\n')

# Line 1173 (0-indexed 1172) is <div className="space-y-4">
# We'll replace it with the skeleton condition
idx = 1172
lines[idx] = """            {isLoggingIn || isLoading ? (
              <div className="space-y-4 w-full animate-pulse">
                <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full"></div>
                <div className="flex items-center justify-center py-1">
                  <div className="h-px bg-slate-200 dark:bg-slate-800 w-full"></div>
                </div>
                <div className="h-11 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full"></div>
                <div className="h-11 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full"></div>
              </div>
            ) : (
            <div className="space-y-4">"""

# Line 1228 (0-indexed 1227) is </div> (closing space-y-4)
lines[1227] = "            </div>\n            )}"

with open('src/App.tsx', 'w') as f:
    f.write('\n'.join(lines))

