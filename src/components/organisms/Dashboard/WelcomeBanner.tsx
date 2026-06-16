import React from 'react';

interface WelcomeBannerProps {
  title: string;
  subtitle: string;
}

export default function WelcomeBanner({ title, subtitle }: WelcomeBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-500 to-blue-light-600 p-8 sm:p-10 text-white shadow-lg">
      {/* Background Decor */}
      <div className="absolute -right-20 -top-20 opacity-20 mix-blend-overlay">
        <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="200" r="200" fill="url(#paint0_linear)" />
          <defs>
            <linearGradient id="paint0_linear" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
              <stop stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative z-10">
        <h3 className="text-sm font-medium tracking-wider uppercase text-white/80 mb-2">{title}</h3>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{subtitle}</h2>
      </div>
    </div>
  );
}
