import React from 'react';

interface GradientBackgroundProps {
  fromColor: string;
  toColor: string;
  children: React.ReactNode;
}

export default function GradientBackground({ fromColor, toColor, children }: GradientBackgroundProps) {
  return (
    <div
      className="w-full h-screen flex flex-col items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${fromColor} 0%, ${toColor} 100%)`,
      }}
    >
      {children}
    </div>
  );
}