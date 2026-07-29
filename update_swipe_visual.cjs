const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Add state for swipeDelta
if (!content.includes('const [swipeDelta, setSwipeDelta]')) {
  content = content.replace(
    /const \[activeTab, setActiveTab\] = useState<string>\(role === 'accountant' \? 'reports' : 'attendance'\);/,
    `const [activeTab, setActiveTab] = useState<string>(role === 'accountant' ? 'reports' : 'attendance');
  const [swipeDelta, setSwipeDelta] = useState<number>(0);`
  );
}

// Update useSwipeable
content = content.replace(
  /const swipeHandlers = useSwipeable\(\{[\s\S]*?trackMouse: false\n  \}\);/,
  `const swipeHandlers = useSwipeable({
    onSwiping: (e) => {
      if ((e.event.target as HTMLElement).closest('.overflow-x-auto, .no-swipe, table, .max-h-\\\\[550px\\\\]')) return;
      setSwipeDelta(e.deltaX);
    },
    onSwiped: () => setSwipeDelta(0),
    onSwipedLeft: (e) => {
      if ((e.event.target as HTMLElement).closest('.overflow-x-auto, .no-swipe, table, .max-h-\\\\[550px\\\\]')) return;
      const tabs = getAvailableTabs();
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex !== -1 && currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
    },
    onSwipedRight: (e) => {
      if ((e.event.target as HTMLElement).closest('.overflow-x-auto, .no-swipe, table, .max-h-\\\\[550px\\\\]')) return;
      const tabs = getAvailableTabs();
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
    },
    delta: 30,
    preventScrollOnSwipe: false,
    trackMouse: false
  });`
);

// Apply swipeDelta to the motion.div wrapper of tab content
content = content.replace(
  /<AnimatePresence mode="wait">\n\s*<motion\.div\n\s*key=\{activeTab\}\n\s*initial=\{\{ opacity: 0, y: 16, scale: 0\.985 \}\}\n\s*animate=\{\{ opacity: 1, y: 0, scale: 1 \}\}\n\s*exit=\{\{ opacity: 0, y: -16, scale: 0\.985 \}\}\n\s*transition=\{\{ ease: \[0\.3, 0, 0\.2, 1\], duration: 0\.45 \}\}\n\s*>/,
  `<AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: swipeDelta ? -swipeDelta * 0.5 : 0 }}
            exit={{ opacity: 0, y: -16, scale: 0.985 }}
            transition={{ ease: [0.3, 0, 0.2, 1], duration: 0.45 }}
            className="w-full"
          >`
);

fs.writeFileSync('src/App.tsx', content);
