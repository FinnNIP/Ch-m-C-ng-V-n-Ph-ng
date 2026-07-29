with open('src/App.tsx', 'r') as f:
    content = f.read()

old_content = """                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative z-10 flex flex-col items-center"
                  >"""

new_content = """                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                    }}
                    className="relative z-10 flex flex-col items-center"
                  >"""

content = content.replace(old_content, new_content)

old_icon = """<div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-orange-500 rounded-full flex items-center justify-center text-white mb-5 shadow-lg shadow-rose-500/30 border-4 border-white dark:border-slate-800 relative group overflow-hidden">"""
new_icon = """<motion.div variants={{ hidden: { opacity: 0, scale: 0.5 }, visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 15 } } }} className="w-20 h-20 bg-gradient-to-br from-rose-400 to-orange-500 rounded-full flex items-center justify-center text-white mb-5 shadow-[0_8px_30px_rgba(244,63,94,0.4)] border-4 border-white dark:border-slate-800 relative group overflow-hidden">"""
content = content.replace(old_icon, new_icon)
content = content.replace("</Printer className", "</motion.div><Printer className") # oops wait, I don't need to replace the close tag if I just change the opening tag.
# Let's do it safer.

with open('src/App.tsx', 'w') as f:
    f.write(content)
