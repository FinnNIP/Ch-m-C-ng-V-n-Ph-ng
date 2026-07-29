with open('src/App.tsx', 'r') as f:
    c = f.read()

import re

c = re.sub(r'<div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-orange-500 rounded-full flex items-center justify-center text-white mb-5 shadow-lg shadow-rose-500/30 border-4 border-white dark:border-slate-800 relative group overflow-hidden">', 
           r'<motion.div variants={{ hidden: { opacity: 0, scale: 0.5 }, visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 15 } } }} className="w-20 h-20 bg-gradient-to-br from-rose-400 to-orange-500 rounded-full flex items-center justify-center text-white mb-5 shadow-[0_8px_30px_rgba(244,63,94,0.4)] border-4 border-white dark:border-slate-800 relative group overflow-hidden">', c)

c = re.sub(r'<Printer className="w-10 h-10 group-hover:scale-110 transition-transform duration-500" />\s*</div>',
           r'<Printer className="w-10 h-10 group-hover:scale-110 transition-transform duration-500" />\n                    </motion.div>', c)

c = re.sub(r'<h3 className="font-sans font-black text-2xl', r'<motion.h3 variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="font-sans font-black text-2xl', c)
c = re.sub(r'Kế toán viên</h3>', r'Kế toán viên</motion.h3>', c)

c = re.sub(r'<p className="text-xs text-slate-500 dark:text-slate-400 mb-6', r'<motion.p variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="text-xs text-slate-500 dark:text-slate-400 mb-6', c)
c = re.sub(r'Vui lòng nhập Mã khóa bảo mật do Admin cấp riêng để xác thực danh tính.\s*</p>', r'Vui lòng nhập Mã khóa bảo mật do Admin cấp riêng để xác thực danh tính.</motion.p>', c)

c = re.sub(r'<div className="space-y-5 w-full">', r'<motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} className="space-y-5 w-full">', c)
c = re.sub(r'</button>\s*</div>\s*</motion.div>', r'</button>\n                      </motion.div>\n                    </motion.div>', c) # Wait, it's safer to just do manual replace if needed. Let's try this.

with open('src/App.tsx', 'w') as f:
    f.write(c)

