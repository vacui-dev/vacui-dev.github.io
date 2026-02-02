
// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useRef, useEffect } from 'react';
import { UserProfile } from '../../../types/filesystem';
import { Search, LogOut, Users } from 'lucide-react';
import { SYSTEM_APPS } from '../AppRegistry';

interface StartMenuProps {
    currentUser: UserProfile;
    isOpen: boolean;
    onClose: () => void;
    onOpenWindow: (type: any) => void;
    onLogout: () => void;
    onSwitchUser: () => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({ currentUser, isOpen, onClose, onOpenWindow, onLogout, onSwitchUser }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const visibleApps = SYSTEM_APPS.filter(app => !app.hidden);

    return (
        <div ref={menuRef} className="absolute bottom-12 left-0 m-2 w-64 bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-t-lg shadow-2xl flex flex-col pointer-events-auto z-[5001] animate-in slide-in-from-bottom-2 duration-200 font-sans">
            <div className="p-4 bg-gradient-to-r from-cyan-900/50 to-purple-900/50 border-b border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-cyan-400 overflow-hidden">
                    <div className="w-full h-full p-1 text-current" dangerouslySetInnerHTML={{ __html: currentUser.iconSvg }} />
                </div>
                <div>
                    <div className="text-sm font-bold text-white">{currentUser.name.toUpperCase()}</div>
                    <div className="text-[10px] text-cyan-300 font-mono opacity-80">{currentUser.role}</div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-96 py-2 custom-scrollbar">
                <div className="text-[9px] font-bold text-neutral-500 px-4 py-1 uppercase tracking-widest">Applications</div>
                {visibleApps.map(app => (
                    <button
                        key={app.id}
                        onClick={() => { onOpenWindow(app.id); onClose(); }}
                        className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/10 transition-colors text-left group"
                    >
                        <div className="w-4 h-4 text-neutral-400 group-hover:text-cyan-400 transition-colors">
                            {app.icon}
                        </div>
                        <span className="text-xs text-neutral-200 group-hover:text-white">{app.label}</span>
                    </button>
                ))}
            </div>

            <div className="p-2 border-t border-white/10 bg-[#0a0a0a] flex justify-between items-center">
                <button className="p-2 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors">
                    <Search className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                    {currentUser.id !== 'guest' && (
                        <button 
                            onClick={onLogout}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded text-neutral-400 text-xs transition-colors"
                            title="Log Out"
                        >
                            <LogOut className="w-3 h-3" /> Log Out
                        </button>
                    )}
                    <button 
                        onClick={onSwitchUser}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded text-neutral-400 text-xs transition-colors"
                        title="Switch User"
                    >
                        <Users className="w-3 h-3" /> Switch User
                    </button>
                </div>
            </div>
        </div>
    );
};
