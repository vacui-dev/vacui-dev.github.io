// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

export interface MenuItem {
    // FIX: Make label optional to support dividers
    label?: string;
    action?: () => void;
    shortcut?: string;
    divider?: boolean;
    disabled?: boolean;
    children?: MenuItem[];
}

export interface MenuBarProps {
    menus: {
        label: string;
        items: MenuItem[];
    }[];
}

export const MenuBar: React.FC<MenuBarProps> = ({ menus }) => {
    const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpenMenuIndex(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex items-center h-7 bg-[#1a1a1a] border-b border-white/10 px-1 select-none text-xs font-sans relative z-[100]" ref={containerRef}>
            {menus.map((menu, index) => (
                <div key={index} className="relative">
                    <button 
                        className={`px-3 py-1 rounded hover:bg-white/10 transition-colors ${openMenuIndex === index ? 'bg-white/10 text-white' : 'text-neutral-300'}`}
                        onClick={() => setOpenMenuIndex(openMenuIndex === index ? null : index)}
                        onMouseEnter={() => { if (openMenuIndex !== null) setOpenMenuIndex(index); }}
                    >
                        {menu.label}
                    </button>
                    
                    {openMenuIndex === index && (
                        <div className="absolute top-full left-0 min-w-[200px] bg-[#1a1a1a] border border-white/20 shadow-2xl rounded-b-md py-1 flex flex-col animate-in fade-in slide-in-from-top-1 duration-100">
                            {menu.items.map((item, idx) => (
                                <MenuEntry key={idx} item={item} closeMenu={() => setOpenMenuIndex(null)} />
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const MenuEntry: React.FC<{ item: MenuItem, closeMenu: () => void }> = ({ item, closeMenu }) => {
    if (item.divider) {
        return <div className="h-px bg-white/10 my-1 mx-2" />;
    }

    return (
        <button 
            className={`flex items-center justify-between px-4 py-1.5 text-left hover:bg-cyan-900/30 hover:text-white group transition-colors ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'text-neutral-300'}`}
            onClick={() => {
                if (!item.disabled && item.action) {
                    item.action();
                    closeMenu();
                }
            }}
            disabled={item.disabled}
        >
            <span>{item.label}</span>
            {item.shortcut && <span className="text-[9px] opacity-50 ml-4 font-mono">{item.shortcut}</span>}
            {item.children && <ChevronRight className="w-3 h-3 opacity-50" />}
        </button>
    );
};