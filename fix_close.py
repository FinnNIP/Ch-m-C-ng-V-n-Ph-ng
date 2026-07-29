with open('src/App.tsx', 'r') as f:
    c = f.read()

c = c.replace("""                        </button>
                      </div>
                    </div>
                  </motion.div>""", """                        </button>
                      </div>
                    </motion.div>
                  </motion.div>""")

with open('src/App.tsx', 'w') as f:
    f.write(c)

