with open('src/App.tsx', 'r') as f:
    content = f.read()

import re

old_sound = """                    {soundEnabled ? (
                      <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 dark:text-slate-500" />
                    )}"""
new_sound = """                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-4 h-4 text-indigo-500" />
                        <span className="hidden sm:inline whitespace-nowrap">Âm thanh</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span className="hidden sm:inline whitespace-nowrap text-slate-400 dark:text-slate-500">Tắt âm</span>
                      </>
                    )}"""
content = content.replace(old_sound, new_sound)

old_refresh = """<RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`} />"""
new_refresh = """<RefreshCw className={`w-4 h-4 text-indigo-500 ${isLoading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline whitespace-nowrap">Tải lại</span>"""
content = content.replace(old_refresh, new_refresh)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Added text to App.tsx buttons")
