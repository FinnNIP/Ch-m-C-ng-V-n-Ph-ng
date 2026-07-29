import re
with open('src/App.tsx', 'r') as f:
    c = f.read()
    
btns = re.findall(r'<button[^>]*>[\s\S]*?</button>', c)
for b in btns:
    print("---")
    print(b[:150] + "...")
