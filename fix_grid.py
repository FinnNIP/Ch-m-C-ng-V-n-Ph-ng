import re

with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

# I will find the exact string that closes the employee map and replace it.
old_close = """                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>"""

new_close = """                  );
                })}
                    </motion.div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>"""

content = content.replace(old_close, new_close)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)

print("done")
