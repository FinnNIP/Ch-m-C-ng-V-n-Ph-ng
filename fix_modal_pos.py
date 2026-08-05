import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

# First, extract the modal code. It starts with `{/* Manage Departments Modal */}`
modal_start = content.find("      {/* Manage Departments Modal */}")
if modal_start != -1:
    # Find the end of the modal (</AnimatePresence>)
    modal_end = content.find("      </AnimatePresence>", modal_start) + len("      </AnimatePresence>")
    modal_code = content[modal_start:modal_end]
    
    # Remove the modal from its current position
    # The previous script replaced "    </div>\n  );\n}" with "    </div>\n  );\n}\n" + modal_code
    # Wait, the previous script did content.replace("    </div>\n  );\n}", modal_injection)
    # Let's just remove the exact modal string
    content = content[:modal_start] + content[modal_end:]
    
    # Now, add it to the very end of the EmployeesTab return statement
    # The end of the file should be:
    #                     </motion.button>
    #                   </div>
    #                 </form>
    #               </div>
    #             </motion.div>
    #           </motion.div>
    #         )}
    #       </AnimatePresence>
    #     </div>
    #   );
    # }
    
    # Let's search for the last AnimatePresence in the file.
    last_animate_presence = content.rfind("      </AnimatePresence>")
    
    if last_animate_presence != -1:
        # Insert the modal_code just before the final </div> of the component return
        # Wait, the modal is AnimatePresence itself, we can insert it right after the last AnimatePresence
        insertion_point = last_animate_presence + len("      </AnimatePresence>")
        
        new_content = content[:insertion_point] + "\n" + modal_code + content[insertion_point:]
        
        with open('src/components/EmployeesTab.tsx', 'w') as f:
            f.write(new_content)
