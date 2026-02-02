import React from 'react';
import { UserProfile } from '../../../types/filesystem';

interface StartMenuProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onOpenWindow: (appType: string) => void;
  onLogout: () => void;
  onSwitchUser: () => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({ currentUser, isOpen, onClose, onOpenWindow, onLogout, onSwitchUser }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-12 left-2 w-64 bg-black/95 border border-white/10 rounded-t-lg p-2 z-50 pointer-events-auto">
      <div className="px-3 py-2 text-xs font-mono text-cyan-400 border-b border-white/5 mb-2">
        {currentUser.displayName}
      </div>
      <button className="w-full text-left px-3 py-2 hover:bg-white/10 text-xs font-mono text-white rounded" onClick={() => { onOpenWindow('file_explorer'); onClose(); }}>File Explorer</button>
      <button className="w-full text-left px-3 py-2 hover:bg-white/10 text-xs font-mono text-white rounded" onClick={() => { onOpenWindow('terminal'); onClose(); }}>Terminal</button>
      <button className="w-full text-left px-3 py-2 hover:bg-white/10 text-xs font-mono text-white rounded" onClick={() => { onOpenWindow('github_mount'); onClose(); }}>GitHub Source</button>
      <div className="border-t border-white/5 mt-2 pt-2">
        <button className="w-full text-left px-3 py-2 hover:bg-white/10 text-xs font-mono text-gray-400 rounded" onClick={onSwitchUser}>Switch User</button>
        <button className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-xs font-mono text-red-400 rounded" onClick={onLogout}>Log Out</button>
      </div>
    </div>
  );
};
