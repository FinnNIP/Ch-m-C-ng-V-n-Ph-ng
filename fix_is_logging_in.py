with open('src/App.tsx', 'r') as f:
    lines = f.read().split('\n')

for i, line in enumerate(lines):
    if "async (firebaseUser, cachedToken) => {" in line:
        lines.insert(i + 1, "        setIsLoggingIn(false);")
        break

for i, line in enumerate(lines):
    if "() => {" in line and "force redirect to login screen" in lines[i+1]:
        lines.insert(i + 1, "        setIsLoggingIn(false);")
        break

with open('src/App.tsx', 'w') as f:
    f.write('\n'.join(lines))
