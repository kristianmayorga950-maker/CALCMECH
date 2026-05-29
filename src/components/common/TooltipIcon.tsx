import React, { useState } from 'react';

interface TooltipIconProps {
  text:      string;
  reference?: string;
}

export const TooltipIcon: React.FC<TooltipIconProps> = ({ text, reference }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-gray-300 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-400"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        aria-label={text}
      >?</button>
      {show && (
        <div className="absolute z-50 left-6 top-0 w-56 bg-gray-800 text-white text-xs rounded p-2 shadow-lg">
          {text}
          {reference && <div className="mt-1 text-gray-400 italic">{reference}</div>}
        </div>
      )}
    </span>
  );
};
