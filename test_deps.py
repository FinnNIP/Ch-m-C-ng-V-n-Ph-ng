import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

new_content = content.replace("const [user, setUser] = useState<FirebaseUser | null>(null);", "const hasLoadedInitialDataRef = useRef<boolean>(false);\n  const [user, setUser] = useState<FirebaseUser | null>(null);")

new_content = new_content.replace("""      setIsLoading(false);
    }
  }, []);""", """      hasLoadedInitialDataRef.current = true;
      setIsLoading(false);
    }
  }, []);""")

new_content = new_content.replace("""  useEffect(() => {
    if (role === 'admin' && token && employees.length > 0) {""", """  useEffect(() => {
    if (role === 'admin' && token && hasLoadedInitialDataRef.current) {""")

new_content = new_content.replace("""  // Auto Backup Effect (Every 5 minutes)
  useEffect(() => {
    if (employees.length === 0 && timeLogs.length === 0) return;""", """  // Auto Backup Effect (Every 5 minutes)
  useEffect(() => {
    if (!hasLoadedInitialDataRef.current) return;
    if (employees.length === 0 && timeLogs.length === 0) return;""")

with open('src/App.tsx', 'w') as f:
    f.write(new_content)
