import re
with open('src/components/EmployeePortal.tsx', 'r') as f:
    content = f.read()

common_classes = "p-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold transition-colors shrink-0"

old_guide = """className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/30 dark:border-indigo-900/30 rounded-2xl transition-colors shrink-0 cursor-pointer shadow-sm\""""

old_back = """className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-colors shrink-0 cursor-pointer shadow-sm ml-auto\""""

content = content.replace(old_guide, f'className="{common_classes}"')
content = content.replace(old_back, f'className="{common_classes} ml-auto"')

with open('src/components/EmployeePortal.tsx', 'w') as f:
    f.write(content)

print("Updated EmployeePortal.tsx remaining header buttons")
