import re
with open('src/components/EmployeePortal.tsx', 'r') as f:
    content = f.read()

common_classes = "p-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold transition-colors shrink-0"

old_refresh = """className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:text-emerald-650 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100/30 dark:border-emerald-900/30 rounded-2xl transition-colors shrink-0 cursor-pointer shadow-sm disabled:opacity-50\""""

content = content.replace(old_refresh, f'className="{common_classes} disabled:opacity-50"')

with open('src/components/EmployeePortal.tsx', 'w') as f:
    f.write(content)

print("Updated EmployeePortal.tsx buttons")
