const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /const swipeHandlers = useSwipeable\(\{[\s\S]*?trackMouse: false\n  \}\);/,
  `const swipeHandlers = useSwipeable({
    onSwipedLeft: (e) => {
      if ((e.event.target).closest?.('.overflow-x-auto, .no-swipe, table')) return;
      const tabs = getAvailableTabs();
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex !== -1 && currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
    },
    onSwipedRight: (e) => {
      if ((e.event.target).closest?.('.overflow-x-auto, .no-swipe, table')) return;
      const tabs = getAvailableTabs();
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
    },
    delta: 30,
    preventScrollOnSwipe: false,
    trackMouse: false
  });`
);

fs.writeFileSync('src/App.tsx', content);
