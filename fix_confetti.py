with open('src/components/AttendanceTab.tsx', 'r') as f:
    content = f.read()

# 1. Add import
if "import { ConfettiEffect }" not in content:
    content = content.replace(
        "import { motion, AnimatePresence } from 'framer-motion';",
        "import { motion, AnimatePresence } from 'framer-motion';\nimport { ConfettiEffect } from './ConfettiEffect';"
    )

# 2. Add state
if "const [showConfetti, setShowConfetti] = useState(false);" not in content:
    content = content.replace(
        "const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);",
        "const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);\n  const [showConfetti, setShowConfetti] = useState(false);"
    )

# 3. Trigger confetti on success
if "setShowConfetti(true);" not in content:
    content = content.replace(
        "onLogAdded();",
        "setShowConfetti(true);\n      onLogAdded();"
    )

# 4. Render Confetti component
if "<ConfettiEffect" not in content:
    content = content.replace(
        """  return (
    <div className="space-y-8">""",
        """  return (
    <div className="space-y-8 relative">
      <ConfettiEffect isActive={showConfetti} onComplete={() => setShowConfetti(false)} />"""
    )
    
with open('src/components/AttendanceTab.tsx', 'w') as f:
    f.write(content)
print("Added ConfettiEffect to AttendanceTab")
