const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /<main className="flex-1 max-w-7xl w-full mx-auto min-w-0 px-2 sm:px-6 lg:px-8 py-6 sm:py-8" \{\.\.\.swipeHandlers\}>\n/,
  `<main className="flex-1 max-w-7xl w-full mx-auto min-w-0 px-2 sm:px-6 lg:px-8 py-6 sm:py-8" {...swipeHandlers}>
        {/* Swipe Indicator Handle */}
        <div className="w-full flex justify-center mb-4 sm:hidden opacity-50">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
        </div>\n`
);

fs.writeFileSync('src/App.tsx', content);
