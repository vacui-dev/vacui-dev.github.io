// Copyright (c) 2025 vacui.dev, all rights reserved

import React from 'react';
import { FolderOpen, Copy, Trash2, Info, Globe, FilePlus, X } from 'lucide-react';
import { VirtualFile } from '../../types/filesystem';

interface ContextMenuProps {
    x: number;
    y: number;
    file?: VirtualFile;
    onClose: () => void;
    onAction: (action: 'open' | 'duplicate' | 'delete' | 'properties' | 'new_text' | 'download_url') => void;
    customItems?: React.ReactNode;
}

export const SystemContextMenu: React.FC<ContextMenuProps> = ({ x, y, file, onAction, customItems }) => {
    // Prevent click propagation to parents (which might close the menu)
    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div 
            className="fixed pointer-events-auto bg-[#1a1a1a] border border-white/20 shadow-2xl rounded-md py-1 flex flex-col z-[9999] min-w-[180px] font-sans text-xs text-neutral-200 animate-in fade-in duration-100"
            style={{ left: Math.min(x, window.innerWidth - 200), top: Math.min(y, window.innerHeight - 200) }}
            onMouseDown={handleMouseDown}
        >
            {file && (
                <>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-500 uppercase border-b border-white/10 mb-1 truncate max-w-[200px]">
                        {file.name}
                    </div>
                    <MenuButton icon={<FolderOpen className="w-3 h-3" />} label="Open" onClick={() => onAction('open')} />
                    <MenuButton icon={<Copy className="w-3 h-3" />} label="Duplicate" onClick={() => onAction('duplicate')} />
                    <MenuButton icon={<Info className="w-3 h-3" />} label="Properties" onClick={() => onAction('properties')} />
                    <div className="h-px bg-white/10 my-1" />
                    <MenuButton icon={<Trash2 className="w-3 h-3 text-red-400" />} label="Delete" onClick={() => onAction('delete')} color="text-red-400" />
                    <div className="h-px bg-white/10 my-1" />
                </>
            )}

            {!file && (
                <>
                    <MenuButton icon={<FilePlus className="w-3 h-3" />} label="New Text Document" onClick={() => onAction('new_text')} />
                    <MenuButton icon={<Globe className="w-3 h-3" />} label="Download from URL" onClick={() => onAction('download_url')} />
                    <div className="h-px bg-white/10 my-1" />
                </>
            )}

            {customItems}
        </div>
    );
};

const MenuButton = ({ icon, label, onClick, color = "text-neutral-200" }: any) => (
    <button 
        className={`text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2 transition-colors ${color}`} 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
        {icon}
        <span>{label}</span>
    </button>
);

export const FilePropertiesDialog: React.FC<{ file: VirtualFile, onClose: () => void }> = ({ file, onClose }) => {
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={onClose}>
            <div className="bg-[#1a1a1a] border border-white/20 rounded-lg shadow-2xl w-80 p-4 text-xs font-mono" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                    <div className="font-bold text-white flex items-center gap-2">
                        <Info className="w-4 h-4 text-cyan-400" />
                        Properties
                    </div>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                
                <div className="space-y-3 text-neutral-300">
                    <PropRow label="Name" value={file.name} />
                    <PropRow label="Type" value={file.type.toUpperCase()} />
                    <PropRow label="ID" value={file.id} />
                    <PropRow label="Size" value={typeof file.content === 'string' ? `${file.content.length} chars` : (file.content?.byteLength ? `${file.content.byteLength} bytes` : 'Unknown')} />
                    <PropRow label="Modified" value={new Date(file.updatedAt).toLocaleString()} />
                    <PropRow label="Location" value={file.parentId || 'root'} />
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded text-white">Close</button>
                </div>
            </div>
        </div>
    );
};

const PropRow = ({ label, value }: { label: string, value: string }) => (
    <div className="grid grid-cols-[80px_1fr] gap-2">
        <div className="text-neutral-500">{label}:</div>
        <div className="truncate select-all">{value}</div>
    </div>
);