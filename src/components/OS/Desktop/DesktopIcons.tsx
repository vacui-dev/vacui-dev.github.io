import React from 'react';
import { Folder, Terminal, Globe, Github } from 'lucide-react';

interface DesktopIconsProps {
  onOpenWindow: (appType: string) => void;
  onContextMenu: (e: React.MouseEvent, file?: any) => void;
}

export const DesktopIcons: React.FC<DesktopIconsProps> = ({ onOpenWindow, onContextMenu }) => {
  const icons = [
    { id: 'files', label: 'Files', icon: Folder, app: 'file_explorer' },
    { id: 'terminal', label: 'Terminal', icon: Terminal, app: 'terminal' },
    { id: 'browser', label: 'Browser', icon: Globe, app: 'browser' },
    { id: 'github', label: 'Source Code', icon: Github, app: 'github_mount' },
  ];

  return (
    <div
      className="absolute top-4 left-4 flex flex-col gap-4 pointer-events-auto"
      onContextMenu={(e) => onContextMenu(e)}
    >
      {icons.map(icon => (
        <button
          key={icon.id}
          className="flex flex-col items-center gap-1 w-16 p-2 rounded hover:bg-white/10 transition-all group"
          onDoubleClick={() => onOpenWindow(icon.app)}
          onContextMenu={(e) => { e.stopPropagation(); onContextMenu(e); }}
        >
          <icon.icon className="w-8 h-8 text-cyan-400/60 group-hover:text-cyan-400" />
          <span className="text-[10px] font-mono text-gray-400 group-hover:text-white text-center leading-tight">
            {icon.label}
          </span>
        </button>
      ))}
    </div>
  );
};
