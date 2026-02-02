
// Copyright (c) 2025 vacui.dev, all rights reserved

import React from 'react';
import { WindowState } from '../Window';
import { SlopMeter } from './SlopMeter';
import { ClockWidget } from './ClockWidget';
import { getAppInfo } from '../AppRegistry';

interface TaskbarProps {
    onToggleStart: () => void;
    isStartOpen: boolean;
    isStartHovered: boolean;
    setIsStartHovered: (v: boolean) => void;
    startIcons: { smooth: string, sharp: string };
    windows: WindowState[];
    onOpenWindow: (type: any) => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({ 
    onToggleStart, isStartOpen, isStartHovered, setIsStartHovered, startIcons, windows, onOpenWindow 
}) => {
    
    const pinnedAppIds = [
        'test_suite',
        'explorer',
        'holon_construct',
        'warzone',
        'bbs',
        'ganglion',
        'architect',
        'wordless',
        'midi_player',
    ];

    return (
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/10 flex items-center px-2 gap-1 pointer-events-auto z-[5000] shadow-2xl">
            <button 
                onClick={onToggleStart}
                onMouseEnter={() => setIsStartHovered(true)}
                onMouseLeave={() => setIsStartHovered(false)}
                className={`
                    flex items-center justify-center px-3 py-1.5 mx-1 rounded transition-all gap-2 group border border-transparent
                    ${isStartOpen 
                        ? 'bg-gradient-to-r from-cyan-900/50 to-blue-900/50 text-white shadow-[0_0_10px_rgba(0,255,255,0.3)] border-cyan-500/30' 
                        : 'hover:bg-white/10 hover:border-white/5'
                    }
                `}
                title="Start"
            >
                <div className={`w-6 h-6 transition-colors duration-300 ${isStartOpen ? 'text-[#00ffff]' : 'text-[#d4621a]'}`}>
                    <svg viewBox={isStartHovered ? "0 0 445 711" : "0 0 180 488"} className="w-full h-full fill-current">
                         {!!(startIcons.smooth && startIcons.sharp) ? (
                             isStartHovered ? (
                                 <g transform="translate(0,711) scale(0.1,-0.1)">
                                     <path d={startIcons.sharp} />
                                 </g>
                             ) : (
                                 <g transform="translate(0,488) scale(0.1,-0.1)">
                                     <path d={startIcons.smooth} />
                                 </g>
                             )
                         ) : (
                             <circle cx="90" cy="244" r="100" fill="currentColor"/>
                         )}
                    </svg>
                </div>
                <span className="text-xs font-bold font-mono tracking-widest hidden md:block text-current">START</span>
            </button>
            
            <div className="w-px h-6 bg-white/10 mx-2" />

            <div className="flex items-center gap-1 flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide">
                {pinnedAppIds.map(id => {
                    const app = getAppInfo(id);
                    if (!app) return null;
                    const isOpen = windows.some(w => w.appType === id);
                    
                    return (
                        <button
                            key={id}
                            onClick={() => onOpenWindow(id)}
                            className={`
                                p-2 rounded transition-all group relative flex items-center justify-center w-10 h-10
                                ${isOpen ? 'bg-white/10 border-b-2 border-cyan-500' : 'hover:bg-white/5 border-b-2 border-transparent'}
                            `}
                            title={app.label}
                        >
                            <div className={`text-neutral-400 group-hover:text-white transition-transform group-hover:scale-110 group-hover:-translate-y-0.5`}>
                                {React.isValidElement(app.icon) ? React.cloneElement(app.icon as React.ReactElement<any>, { className: "w-5 h-5" }) : app.icon}
                            </div>
                        </button>
                    );
                })}
            </div>

            <SlopMeter onOpenWindow={onOpenWindow} />

            <div className="w-px h-6 bg-white/10 mx-1" />

            <ClockWidget />
            
            <button className="w-2 h-full border-l border-white/10 hover:bg-white/10 ml-1" title="Show Desktop" />
        </div>
    );
};
