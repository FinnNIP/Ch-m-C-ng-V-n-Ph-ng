with open('src/components/ThemeToggle.tsx', 'r') as f:
    content = f.read()

common_classes = "p-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold transition-colors shrink-0"

import re

# ThemeToggle.tsx
content = re.sub(r'className="[^"]*rounded-2xl[^"]*"', f'className="{common_classes}"', content)
with open('src/components/ThemeToggle.tsx', 'w') as f:
    f.write(content)

# App.tsx
with open('src/App.tsx', 'r') as f:
    app_content = f.read()

# sound button
old_sound_btn = """className="p-2.5 sm:p-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full transition-colors cursor-pointer flex items-center justify-center shrink-0\""""
app_content = app_content.replace(old_sound_btn, f'className="{common_classes}"')

# refresh button
old_refresh_btn = """className="p-2.5 sm:p-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full transition-colors cursor-pointer flex items-center justify-center shrink-0\""""
app_content = app_content.replace(old_refresh_btn, f'className="{common_classes}"')

# advanced grid sync button
old_sync_btn = """className="p-1.5 px-3 sm:px-4 sm:py-1.5 hover-gradient-wipe-emerald text-white rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 shrink-0 whitespace-nowrap\""""
new_sync_btn = """className="p-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50 rounded-2xl shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold transition-all shrink-0 whitespace-nowrap active:scale-95 disabled:opacity-50\""""
app_content = app_content.replace(old_sync_btn, new_sync_btn)

with open('src/App.tsx', 'w') as f:
    f.write(app_content)

print("Updated App.tsx buttons")
