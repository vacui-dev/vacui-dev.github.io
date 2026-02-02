// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect, useMemo } from 'react';
import { fileSystem } from '../../services/FileSystem';
import { VirtualFile } from '../../types/filesystem';
import { Folder, FileText, X, Upload, Box, Table, Terminal, MessageCircle, Image as ImageIcon, Music, Layers, Code, Globe } from 'lucide-react';
import { UrlDialog } from './UrlDialog';

interface FilePickerProps {
    isOpen: boolean;
    title?: string;
    onSelect: (file: VirtualFile) => void;
    onCancel: () => void;
    extensions?: string[]; // e.g. ['image', 'material']
    allowImport?: boolean;
}

export const FilePicker: React.FC<FilePickerProps> = ({ isOpen, title = "Open File", onSelect, onCancel, extensions, allowImport }) => {
    const [folders, setFolders] = useState(fileSystem.getFolders());
    const [currentFolderId, setCurrentFolderId] = useState('home');
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [showUrlDialog, setShowUrlDialog] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFolders([...fileSystem.getFolders()]);
        }
    }, [isOpen]);

    // Calculate filtered list of folders that actually contain relevant files
    const validFolders = useMemo(() => {
        return folders.filter(folder => {
            if (!extensions || extensions.length === 0) return true;
            return folder.files.some(f => extensions.includes(f.type));
        });
    }, [folders, extensions]);

    // Set default folder to first valid one if current is invalid
    useEffect(() => {
        if (isOpen && validFolders.length > 0 && !validFolders.find(f => f.id === currentFolderId)) {
            setCurrentFolderId(validFolders[0].id);
        }
    }, [isOpen, validFolders, currentFolderId]);

    if (!isOpen) return null;

    const currentFolder = folders.find(f => f.id === currentFolderId);
    
    // Filter files based on extensions/types
    const filteredFiles = currentFolder?.files.filter(f => {
        if (!extensions || extensions.length === 0) return true;
        // Check exact type match or simple extension check on name if needed
        return extensions.includes(f.type);
    }) || [];

    const getIconForFile = (file: VirtualFile) => {
        if (file.type === 'simulation') return <Box className="w-4 h-4" style={{ color: 'var(--secondary-color)' }} />;
        if (file.type === 'sheet') return <Table className="w-4 h-4" style={{ color: 'var(--accent-color)' }} />;
        if (file.type === 'system') return <Terminal className="w-4 h-4" style={{ color: 'var(--text-color)' }} />;
        if (file.type === 'chat') return <MessageCircle className="w-4 h-4" style={{ color: '#4ade80' }} />;
        if (file.type === 'image') return <ImageIcon className="w-4 h-4" style={{ color: '#f472b6' }} />;
        if (file.type === 'audio') return <Music className="w-4 h-4" style={{ color: '#60a5fa' }} />;
        if (file.type === 'material') return <Layers className="w-4 h-4" style={{ color: '#eab308' }} />;
        if (file.type === 'shader') return <Code className="w-4 h-4" style={{ color: '#a855f7' }} />;
        return <FileText className="w-4 h-4 opacity-70" />;
    };

    const handleConfirm = () => {
        const file = filteredFiles.find(f => f.id === selectedFileId);
        if (file) {
            onSelect(file);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            Array.from(e.target.files).forEach((file) => fileSystem.ingestFile(file as File));
            // Refresh view after a slight delay to allow ingest
            setTimeout(() => setFolders([...fileSystem.getFolders()]), 200);
        }
    };

    return (
        <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
            <div className="bg-[#1a1a1a] border border-white/20 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col h-[500px] animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#222]">
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                        <Folder className="w-4 h-4 text-cyan-400" />
                        {title}
                    </div>
                    <button onClick={onCancel} className="text-neutral-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* Sidebar */}
                    <div className="w-40 bg-[#111] border-r border-white/10 flex flex-col p-2 gap-1 overflow-y-auto">
                        <div className="text-[10px] font-bold opacity-50 px-2 py-1 mb-1 uppercase tracking-wider">Locations</div>
                        {validFolders.map(f => (
                            <button 
                                key={f.id} 
                                onClick={() => setCurrentFolderId(f.id)}
                                className={`text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${currentFolderId === f.id ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`}
                            >
                                <Folder className={`w-3 h-3 ${currentFolderId === f.id ? 'text-cyan-400' : 'opacity-50'}`} />
                                {f.name}
                            </button>
                        ))}
                    </div>

                    {/* File Grid */}
                    <div className="flex-1 bg-[#0a0a0a] p-4 overflow-y-auto">
                        {filteredFiles.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-neutral-600 italic">
                                <Folder className="w-8 h-8 mb-2 opacity-20" />
                                No compatible files found.
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-3">
                                {filteredFiles.map(file => (
                                    <div 
                                        key={file.id}
                                        onClick={() => setSelectedFileId(file.id)}
                                        onDoubleClick={() => onSelect(file)}
                                        className={`
                                            group flex flex-col items-center gap-2 p-3 rounded border cursor-pointer transition-all
                                            ${selectedFileId === file.id 
                                                ? 'bg-cyan-900/30 border-cyan-500/50 shadow-[0_0_10px_rgba(0,255,255,0.1)]' 
                                                : 'bg-[#161616] border-transparent hover:bg-[#222] hover:border-white/10'
                                            }
                                        `}
                                    >
                                        <div className={`${selectedFileId === file.id ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-white'}`}>
                                            {getIconForFile(file)}
                                        </div>
                                        <span className={`text-[10px] text-center truncate w-full ${selectedFileId === file.id ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                                            {file.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 bg-[#222] border-t border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {allowImport && (
                            <>
                                <label className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer bg-white/5 px-3 py-1.5 rounded border border-white/10 hover:bg-white/10 transition-colors">
                                    <Upload className="w-3 h-3" /> Import
                                    <input type="file" className="hidden" onChange={handleFileUpload} />
                                </label>
                                <button 
                                    onClick={() => setShowUrlDialog(true)}
                                    className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer bg-white/5 px-3 py-1.5 rounded border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    <Globe className="w-3 h-3" /> Web
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onCancel} className="px-4 py-1.5 rounded text-xs hover:bg-white/10 text-neutral-300">Cancel</button>
                        <button 
                            onClick={handleConfirm}
                            disabled={!selectedFileId}
                            className={`px-4 py-1.5 rounded text-xs font-bold bg-cyan-700 text-white flex items-center gap-2 ${!selectedFileId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cyan-600'}`}
                        >
                            Open
                        </button>
                    </div>
                </div>
            </div>

            <UrlDialog 
                isOpen={showUrlDialog} 
                onClose={() => setShowUrlDialog(false)} 
                onDownload={async (url) => {
                    const file = await fileSystem.importFileFromUrl(url, currentFolderId);
                    onSelect(file);
                }}
            />
        </div>
    );
};