import React from 'react';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onChange: (isDark: boolean) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDarkMode, onChange }) => {
  // In CodePen:
  // checked = Light Mode (Day)
  // unchecked = Dark Mode (Night)
  const isChecked = !isDarkMode;

  const handleChange = () => {
    onChange(!isDarkMode);
  };

  return (
    <div className="relative flex items-center justify-center w-12 h-12 select-none rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-indigo-500/20 border border-transparent hover:border-indigo-400/25 hover:bg-gradient-to-br hover:from-indigo-500/10 hover:to-purple-500/10 dark:hover:from-indigo-400/20 dark:hover:to-purple-400/20">
      {/* Self-contained CSS for the custom CodePen animations */}
      <style>{`
        .dl-toggle-container {
          --BackgroundLightMood: black;
          --BackgroundDarkMood: white;
          --ButtonSize: 0.42;
          --SunRiseSet: #ffa31a;
          --Sun: #e6b800;
          --SunShadow: inset -15px -3px 30px rgba(230, 138, 0, 0.8);
          --Moon: #cccccc;
          --ButtonBGDay: #f2f2f2;
          --ButoonBGNDay: #f2f2f2;
          --DayShadow: -2px 5px 10px rgba(0, 0, 0, 0.5);
          --ButtonBGNight: #06062d;
          --ButoonBGNight: #06062d;
          --NightShadow: 2px -5px 10px rgba(191, 191, 191, 0.5);
          
          width: 50px;
          height: 50px;
          position: relative;
        }

        .DLbottonBox {
          border-radius: 50%;
          width: 110px;
          height: 110px;
          display: inline-block;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(var(--ButtonSize));
        }

        .DLbutton {
          width: 90px;
          height: 90px;
          cursor: pointer;
          border-radius: 50%;
          background-color: var(--ButtonBGNight);
          box-shadow: 0px -5px 10px rgba(191, 191, 191, 0);
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .DLbutton::after {
          border-radius: 50%;
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          box-shadow: var(--NightShadow);
          opacity: 1;
        }

        .DLcheckbox {
          opacity: 0;
          width: 0px;
          height: 0px;
          position: absolute;
        }

        .sun {
          border-radius: 50%;
          margin-top: -3px; 
          margin-left: -9px;
          width: 0px;
          height: 0px;
          background-color: var(--Sun);
          box-shadow: var(--SunShadow);
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          transition: 0.2s;
        }

        .DLcheckbox:checked ~ .DLbottonBox > .DLbutton > .sun {
          border-radius: 50%;
          width: 55px; 
          height: 55px;
          background-color: var(--Sun);
          position: absolute;
          margin: 0;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .Moon {
          width: 55px;
          height: 55px;
          fill: var(--Moon);
          stroke-width: 0px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
        }

        /* Light Mood */

        .DLcheckbox:checked ~ .DLbottonBox > .DLbutton {
          animation-name: DayBackgorund;
          animation-timing-function: linear;
          animation-duration: 1s;
          animation-fill-mode: forwards;
        }

        @keyframes DayBackgorund {
          0% {background-color: var(--ButoonBGNight);}
          100% {background-color: var(--ButoonBGNDay);}
        }

        .DLcheckbox:checked ~ .DLbottonBox > .DLbutton::after {
          animation-name: DayBackgorundShadow;
          animation-timing-function: linear;
          animation-duration: 1s;
          animation-fill-mode: forwards;
        }

        @keyframes DayBackgorundShadow {
          0% {box-shadow: var(--NightShadow);}
          100% {box-shadow: var(--DayShadow);}
        }

        .DLcheckbox:checked ~ .DLbottonBox > .DLbutton > .sun {
          animation-name: Sunrise;
          animation-duration: 1s;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
        }

        @keyframes Sunrise {
          0% {width: 25px; height: 25px; margin-top: -3px; margin-left: 0px; background-color: var(--SunRiseSet); z-index:1; box-shadow: var(--SunShadow);}
          50% {width: 30px; height: 30px; margin-left: 15px; margin-top: -10px; box-shadow: var(--SunShadow)}
          100% {width: 50px; height: 50px; background-color: var(--Sun); z-index:3; margin-top: 0px; margin-left: 0px; box-shadow: var(--SunShadow);}
        }

        .DLcheckbox:checked ~ .DLbottonBox > .DLbutton > .Moon {
          animation-name: Moonset;
          animation-duration: 1s;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
        }

        @keyframes Moonset {
          0% {width: 55px; height: 55px;}
          50% {width: 30px; height: 30px; margin-left: -15px; margin-top: 10px;}
          100% {width: 0px; height: 0px;}
        }

        /* Night Mood */

        .DLcheckbox:not(:checked) ~ .DLbottonBox > .DLbutton {
          animation-name: NightBackgorund;
          animation-timing-function: linear;
          animation-duration: 1s;
          animation-fill-mode: forwards;
        }

        @keyframes NightBackgorund {
          from {background-color: var(--ButoonBGNDay);}
          to {background-color: var(--ButtonBGNight);}
        }

        .DLcheckbox:not(:checked) ~ .DLbottonBox > .DLbutton::after {
          animation-name: NightBackgorundShadow;
          animation-timing-function: linear;
          animation-duration: 1s;
          animation-fill-mode: forwards;
        }

        @keyframes NightBackgorundShadow {
          from {box-shadow: var(--DayShadow);}
          to {box-shadow: var(--NightShadow);}
        }

        .DLcheckbox:not(:checked) ~ .DLbottonBox > .DLbutton > .sun {
          animation-name: Sunset;
          animation-duration: 1s;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
        }

        @keyframes Sunset {
          0% {width: 55px; height: 55px; margin-top: 0px; margin-left: 0px; background-color: var(--Sun); z-index:3; box-shadow: var(--SunShadow);}
          50% {width: 30px; height: 30px; margin-left: -15px; margin-top: 10px; box-shadow: var(--SunShadow);}
          100% {width: 0px; height: 0px; margin-left: 0px; margin-top: 0px; background-color:var(--SunRiseSet); z-index:1; margin-top: -3px; margin-left: -9px; box-shadow: var(--SunShadow);}
        }

        .DLcheckbox:not(:checked) ~ .DLbottonBox > .DLbutton > .Moon {
          animation-name: Moonrise;
          animation-duration: 1s;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
        }

        @keyframes Moonrise {
          0% {width: 0px; height: 0px;}
          50% {width: 30px; height: 30px; margin-left: 15px; margin-top: -10px;}
          100% {width: 55px; height: 55px;}
        }
      `}</style>

      <div className="dl-toggle-container">
        <input 
          type="checkbox" 
          id="DLcheckbox" 
          className="DLcheckbox"
          checked={isChecked}
          onChange={handleChange}
        />
        <div className="DLbottonBox">
          <label className="DLbutton" htmlFor="DLcheckbox">
            <div className="sun" id="sun"></div>
            <svg 
              className="Moon" 
              version="1.1" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 179.77 210.11"
            >
              <path d="M104.78,0c3.15,0.26,6.44-0.22,8.96,0.96c2.68,1.26,6.17,3.89,6.47,6.28c0.29,2.37-2.36,6.09-4.74,7.63
                C101.6,23.82,90.15,35.08,82.89,49.9c-7.06,14.4-9.35,29.69-7.38,45.91c2.47,20.33,10.73,37.38,25.57,51.22
                c11.24,10.48,24.45,17.45,39.65,20.27c10.03,1.86,20.02,2.96,30.21,0.28c3.47-0.91,6.25,1.48,8.01,5.08
                c2.13,4.37-0.36,7.16-2.89,9.5c-12.21,11.31-26.29,19.46-42.41,23.87c-16.6,4.54-33.37,5.51-50.25,1.77
                c-21.19-4.7-39.67-14.54-54.58-30.4c-14.11-15.01-23.08-32.75-26.92-53.12c-4.67-24.74-0.72-48.04,11.1-70.05
                c9.19-17.12,22.66-30.1,39.41-39.82C63.73,7.84,75.91,3.76,88.68,1.47C94.02,0.52,99.51,0.46,104.78,0z"
              />
            </svg>
          </label>
        </div>
      </div>
    </div>
  );
};
