with open('src/App.tsx', 'r') as f:
    content = f.read()

old_modal = """                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.4, ease: "easeInOut" }}"""

new_modal = """                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}"""

content = content.replace(old_modal, new_modal)

old_modal_content = """                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={
                    shakeModal 
                      ? { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } }
                      : { opacity: 1, scale: 1, y: 0, x: 0 }
                  }
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}"""

new_modal_content = """                <motion.div 
                  initial={{ opacity: 0, scale: 0.85, y: 40, rotateX: 10 }}
                  animate={
                    shakeModal 
                      ? { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } }
                      : { opacity: 1, scale: 1, y: 0, x: 0, rotateX: 0 }
                  }
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  exit={{ opacity: 0, scale: 0.85, y: 40, rotateX: -10 }}"""

content = content.replace(old_modal_content, new_modal_content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Enhanced accountant modal animations")
