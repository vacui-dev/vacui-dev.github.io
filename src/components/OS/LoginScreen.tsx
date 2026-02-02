import React, { useState } from 'react';
import { UserProfile } from '../../types/filesystem';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [booting, setBooting] = useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => setBooting(false), 2000);
    return () => clearTimeout(t);
  }, []);

  if (booting) {
    return (
      <div className="absolute inset-0 bg-black flex items-center justify-center pointer-events-auto z-50">
        <div className="text-center space-y-4">
          <div className="font-mono text-cyan-400 text-2xl animate-pulse">VACUI OS</div>
          <div className="font-mono text-cyan-600 text-xs">booting...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center pointer-events-auto z-50">
      <div className="text-center space-y-6">
        <div className="font-mono text-cyan-400 text-3xl">VACUI OS</div>
        <div className="text-xs text-gray-500 font-mono">an open source disaster</div>
        <button
          onClick={() => onLogin({
            id: 'guest',
            displayName: 'Guest',
            desktopConfig: { theme: 'oled' }
          })}
          className="px-6 py-3 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 font-mono text-sm rounded transition-all"
        >
          ENTER AS GUEST
        </button>
      </div>
    </div>
  );
};
