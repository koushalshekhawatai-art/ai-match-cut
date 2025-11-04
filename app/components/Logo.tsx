import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle */}
      <circle cx="50" cy="50" r="48" fill="url(#gradient)" />

      {/* Film strip frames */}
      <rect x="15" y="25" width="30" height="35" rx="3" fill="white" opacity="0.9" />
      <rect x="55" y="40" width="30" height="35" rx="3" fill="white" opacity="0.9" />

      {/* Face outlines */}
      <ellipse cx="30" cy="42" rx="10" ry="12" stroke="currentColor" strokeWidth="2" fill="none" className="text-blue-600" />
      <ellipse cx="70" cy="57" rx="10" ry="12" stroke="currentColor" strokeWidth="2" fill="none" className="text-blue-600" />

      {/* Eye points for alignment */}
      <circle cx="27" cy="40" r="1.5" fill="currentColor" className="text-blue-600" />
      <circle cx="33" cy="40" r="1.5" fill="currentColor" className="text-blue-600" />
      <circle cx="67" cy="55" r="1.5" fill="currentColor" className="text-blue-600" />
      <circle cx="73" cy="55" r="1.5" fill="currentColor" className="text-blue-600" />

      {/* Alignment lines */}
      <line x1="30" y1="42" x2="70" y2="57" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" className="text-purple-500" opacity="0.6" />

      {/* AI Sparkle */}
      <path d="M85 20 L87 25 L92 27 L87 29 L85 34 L83 29 L78 27 L83 25 Z" fill="currentColor" className="text-yellow-400" />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
