import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

common_classes = "p-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold transition-colors shrink-0"
common_classes_danger = "p-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/30 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold transition-colors shrink-0"

old_logout_admin = """className="p-1.5 px-3 sm:px-3.5 sm:py-1.5 bg-slate-50 dark:bg-slate-800/70 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-slate-100 dark:border-slate-700 rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 shrink-0\""""

old_logout_guest = """className="p-1.5 px-3 sm:px-3.5 sm:py-1.5 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 shrink-0\""""

content = content.replace(old_logout_admin, f'className="{common_classes_danger}"')
content = content.replace(old_logout_guest, f'className="{common_classes}"')

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Fixed logout buttons")
