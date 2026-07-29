with open('src/App.tsx', 'r') as f:
    content = f.read()

old_bg = """              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 no-swipe bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              >"""

new_bg = """              <motion.div
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="fixed inset-0 no-swipe bg-slate-900/40 dark:bg-black/60 z-50 flex items-center justify-center p-4"
              >"""

if old_bg in content:
    content = content.replace(old_bg, new_bg)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Fixed modal bg")
else:
    print("modal bg not found")
