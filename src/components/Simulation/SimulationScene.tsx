import React from 'react';
import { WorldConfig } from '../../types/simulation';

interface SimulationSceneProps {
  config: WorldConfig;
  simulationKey: number;
  onObjectSelect: (id: string | null) => void;
}

export const SimulationScene: React.FC<SimulationSceneProps> = ({ config }) => {
  // Placeholder — the full Three.js/WebGL simulation scene goes here
  // For now, render a starfield background
  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      {/* Starfield */}
      {Array.from({ length: 200 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: Math.random() * 2 + 0.5,
            height: Math.random() * 2 + 0.5,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.6 + 0.1,
            animation: `twinkle ${2 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.8; }
        }
      `}</style>
      {/* World info */}
      <div className="absolute bottom-4 right-4 text-xs font-mono text-gray-600">
        {config.description} — {config.entities.length} entities
      </div>
    </div>
  );
};
