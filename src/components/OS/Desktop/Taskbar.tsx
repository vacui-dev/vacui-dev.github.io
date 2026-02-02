import React from 'react';

interface TaskbarProps {
  onToggleStart: () => void;
  isStartOpen: boolean;
  isStartHovered: boolean;
  setIsStartHovered: (h: boolean) => void;
  startIcons: { smooth: string; sharp: string };
  windows: any[];
  onOpenWindow: (appType: string) => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({ onToggleStart, isStartOpen, isStartHovered, setIsStartHovered, startIcons, windows, onOpenWindow }) => {
  return (
    <div className="h-10 bg-black/80 backdrop-blur-sm border-t border-white/5 flex items-center px-2 gap-2 pointer-events-auto z-50">
      {/* Start Button */}
      <button
        onClick={onToggleStart}
        onMouseEnter={() => setIsStartHovered(true)}
        onMouseLeave={() => setIsStartHovered(false)}
        className={`h-8 w-8 flex items-center justify-center rounded transition-all ${
          isStartOpen ? 'bg-cyan-500/20' : 'hover:bg-white/10'
        }`}
      >
        {startIcons.smooth ? (
          <svg viewBox="0 0 100 100" className="w-5 h-5">
            <path d={isStartHovered ? startIcons.sharp : startIcons.smooth} fill="currentColor" className="text-cyan-400" />
          </svg>
        ) : (
          <div className="w-4 h-4 border border-cyan-400 rounded-sm" />
        )}
      </button>

      {/* Window List */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {windows.filter(w => !w.minimized).map(w => (
          <div key={w.id} className="px-2 py-1 text-xs font-mono text-gray-400 bg-white/5 rounded truncate max-w-32">
            {w.title}
          </div>
        ))}
      </div>

      {/* Clock */}
      <div className="text-xs font-mono text-gray-500 px-2">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
};
