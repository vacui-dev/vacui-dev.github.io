// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect } from 'react';
import { fileSystem } from '../../services/FileSystem';
import { simulationIO } from '../../services/SimulationIO';
import { VirtualFile } from '../../types/filesystem';
import { WorldConfig } from '../../types/simulation';
import { getAppForFile } from '../../config/fileAssociations';
import { Box, Table, Terminal, Mail, FileText, Home, Folder, MessageCircle, Image, Music, Loader2, Layers, Code, Download, Play, ArrowRight, FolderOpen, Hexagon, HardDrive, Network, Server } from 'lucide-react';
import { UrlDialog } from './UrlDialog';
import { SystemContextMenu, FilePropertiesDialog } from './SystemMenu';

// --- FILE EXPLORER ---
export const FileExplorerApp: React.FC<{ onOpen: (type: any, file?: VirtualFile, folderId?: string) => void }> = ({ onOpen }) => {
    const [folders, setFolders] = useState(fileSystem.getFolders());
    const [currentFolderId, setCurrentFolderId] = useState('home');
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Stack of parent IDs for traversal
    const [pathInput, setPathInput] = useState('/Home');
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, file?: VirtualFile } | null>(null);
    const [showPropertiesFor, setShowPropertiesFor] = useState<VirtualFile | null>(null);
    const [showUrlDialog, setShowUrlDialog] = useState(false);

    useEffect(() => {
        const unsub = fileSystem.subscribe(() => setFolders([...fileSystem.getFolders()]));
        return unsub;
    }, []);

    // Close context menu on global click
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // Sync input with current folder/path
    useEffect(() => {
        const folder = folders.find(f => f.id === currentFolderId);
        if (folder) {
            let pathStr = `/${folder.name}`;
            if (currentPath.length > 0) {
                // Resolve path names
                const pathNames = currentPath.map(id => {
                    const f = folder.files.find(file => file.id === id);
                    return f ? f.name : id;
                });
                pathStr += `/${pathNames.join('/')}`;
            }
            setPathInput(pathStr);
        }
    }, [currentFolderId, currentPath, folders]);

    const currentFolder = folders.find(f => f.id === currentFolderId);
    
    // Filter files based on current path
    const visibleFiles = currentFolder?.files.filter(f => {
        const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : undefined;
        return f.parentId === parentId;
    }) || [];

    const handlePathSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Basic support: navigate to top-level location
        const cleanPath = pathInput.trim().replace(/^\//, '').split('/')[0].toLowerCase();
        const found = folders.find(f => f.id.toLowerCase() === cleanPath || f.name.toLowerCase() === cleanPath);
        if (found) {
            setCurrentFolderId(found.id);
            setCurrentPath([]);
        } else {
            // Revert
            if (currentFolder) setPathInput(`/${currentFolder.name}`);
        }
    };

    const handleNavigateUp = () => {
        if (currentPath.length > 0) {
            setCurrentPath(prev => prev.slice(0, -1));
        }
    };

    const getIconForFile = (file: VirtualFile) => {
        if (file.type === 'folder') return <FolderOpen className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />;
        if (file.type === 'simulation') return <Box className="w-5 h-5" style={{ color: 'var(--secondary-color)' }} />;
        if (file.type === 'sheet') return <Table className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />;
        if (file.type === 'system') return <Terminal className="w-5 h-5" style={{ color: 'var(--text-color)' }} />;
        if (file.type === 'chat') return <MessageCircle className="w-5 h-5" style={{ color: '#4ade80' }} />;
        if (file.type === 'image') return <Image className="w-5 h-5" style={{ color: '#f472b6' }} />;
        if (file.type === 'audio') return <Music className="w-5 h-5" style={{ color: '#60a5fa' }} />;
        if (file.type === 'material') return <Layers className="w-5 h-5" style={{ color: '#eab308' }} />;
        if (file.type === 'shader') return <Code className="w-5 h-5" style={{ color: '#a855f7' }} />;
        if (file.type === 'protocol') return <Hexagon className="w-5 h-5" style={{ color: '#00ff88' }} />;
        if (file.id.includes('msg')) return <Mail className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />;
        return <FileText className="w-5 h-5 opacity-70" />;
    };

    const handleFileClick = (file: VirtualFile) => {
        if (file.type === 'folder') {
            setCurrentPath(prev => [...prev, file.id]);
        } else {
            const appType = getAppForFile(file);
            onOpen(appType, file, currentFolderId);
        }
    };

    // --- CONTEXT MENU HANDLERS ---

    const handleContextMenu = (e: React.MouseEvent, file?: VirtualFile) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, file });
    };

    const handleMenuAction = (action: string) => {
        const file = contextMenu?.file;
        setContextMenu(null);

        if (action === 'new_text') {
            if (!currentFolderId) return;
            const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : undefined;
            const name = `New Text Document ${Date.now()}.txt`;
            fileSystem.createFile(currentFolderId, name, 'text', '', parentId);
        } else if (action === 'download_url') {
            setShowUrlDialog(true);
        } else if (file) {
            if (action === 'open') {
                handleFileClick(file);
            } else if (action === 'delete') {
                if (currentFolderId) fileSystem.deleteFile(currentFolderId, file.id);
            } else if (action === 'duplicate') {
                if (currentFolderId) fileSystem.duplicateFile(currentFolderId, file.id);
            } else if (action === 'properties') {
                setShowPropertiesFor(file);
            }
        }
    };

    // Drag & Drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : undefined;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach(file => {
                fileSystem.ingestFile(file as File, currentFolderId, parentId); 
            });
        }
    };

    // Categorize Folders
    const systemFolders = ['home', 'sims', 'materials', 'textures', 'os', 'shared'];
    const standardFolders = folders.filter(f => systemFolders.includes(f.id));
    const networkFolders = folders.filter(f => !systemFolders.includes(f.id));

    return (
        <div className="flex flex-col h-full font-mono text-xs select-none bg-[#0a0a0a]">
            {/* Navigation Bar */}
            <div className="flex items-center gap-2 p-2 border-b" style={{ borderColor: 'var(--outline-color)', background: 'rgba(0,0,0,0.2)' }}>
                <button 
                    onClick={handleNavigateUp} 
                    disabled={currentPath.length === 0}
                    className={`p-1 hover:bg-white/10 rounded ${currentPath.length === 0 ? 'text-neutral-600' : 'text-white'}`}
                >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
                <div className="flex-1 bg-black/30 border border-white/10 rounded flex items-center px-2">
                    <span className="opacity-50 mr-2">/</span>
                    <form onSubmit={handlePathSubmit} className="flex-1">
                        <input 
                            className="w-full bg-transparent outline-none py-1 text-white"
                            value={pathInput.replace(/^\//, '')}
                            onChange={(e) => setPathInput(`/${e.target.value}`)}
                        />
                    </form>
                </div>
                <button onClick={handlePathSubmit} className="p-1 hover:bg-white/10 rounded text-neutral-400">
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-48 border-r flex flex-col gap-1 overflow-y-auto bg-[#111]" style={{ borderColor: 'var(--outline-color)' }}>
                    
                    <div className="p-2 space-y-1">
                        <div className="text-[10px] font-bold px-2 py-1 mb-1 opacity-50">SYSTEM</div>
                        {standardFolders.map(f => (
                            <button key={f.id} onClick={() => { setCurrentFolderId(f.id); setCurrentPath([]); }} className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${currentFolderId === f.id ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`}>
                                {f.id === 'home' ? <Home className="w-3 h-3" /> : (f.id === 'sims' ? <Box className="w-3 h-3" /> : (f.id === 'materials' ? <Layers className="w-3 h-3" /> : (f.id === 'textures' ? <Image className="w-3 h-3" /> : <Folder className="w-3 h-3" />)))}
                                <span className="truncate">{f.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="p-2 border-t border-white/5 space-y-1">
                        <div className="text-[10px] font-bold px-2 py-1 mb-1 opacity-50 flex items-center gap-2">
                            NETWORK <Network className="w-3 h-3" />
                        </div>
                        {networkFolders.map(f => (
                            <button key={f.id} onClick={() => { setCurrentFolderId(f.id); setCurrentPath([]); }} className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${currentFolderId === f.id ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`}>
                                {f.name.toLowerCase().includes('ssh') ? <Terminal className="w-3 h-3 text-green-400" /> : <HardDrive className="w-3 h-3 text-blue-400" />}
                                <span className="truncate">{f.name}</span>
                            </button>
                        ))}
                        <button 
                            onClick={() => onOpen('local_mount')} 
                            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-neutral-500 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <Server className="w-3 h-3" />
                            <span>Link Local/Net...</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div 
                    className="flex-1 p-4 overflow-y-auto bg-[#0a0a0a]"
                    onContextMenu={(e) => handleContextMenu(e, undefined)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div className="grid grid-cols-4 gap-4">
                        {visibleFiles.map(file => (
                            <div 
                                key={file.id} 
                                onDoubleClick={() => handleFileClick(file)} 
                                onContextMenu={(e) => handleContextMenu(e, file)}
                                className="group flex flex-col items-center gap-2 p-3 rounded hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/5 transition-all relative"
                            >
                                {getIconForFile(file)}
                                <span className="text-center truncate w-full opacity-80 group-hover:opacity-100">{file.name}</span>
                                {!file.loaded && file.url && (
                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 opacity-50" title="Cloud File" />
                                )}
                                {file.remoteSource && (
                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 opacity-50" title="Remote File" />
                                )}
                            </div>
                        ))}
                        {visibleFiles.length === 0 && (
                            <div className="col-span-4 text-center opacity-30 italic mt-10">Empty Folder (Drop files here)</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <SystemContextMenu 
                    x={contextMenu.x} 
                    y={contextMenu.y} 
                    file={contextMenu.file}
                    onClose={() => setContextMenu(null)}
                    onAction={handleMenuAction}
                />
            )}

            {/* File Properties Dialog */}
            {showPropertiesFor && (
                <FilePropertiesDialog file={showPropertiesFor} onClose={() => setShowPropertiesFor(null)} />
            )}

            <UrlDialog 
                isOpen={showUrlDialog} 
                onClose={() => setShowUrlDialog(false)} 
                onDownload={async (url) => { 
                    const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : undefined;
                    await fileSystem.importFileFromUrl(url, currentFolderId, parentId); 
                }}
            />
        </div>
    );
};

// --- FILE EDITOR ---
export const FileEditor: React.FC<{ state: any, onLoadSimulation?: (config: WorldConfig) => void }> = ({ state, onLoadSimulation }) => {
    const file = state.folderId && state.fileId ? fileSystem.getFile(state.folderId, state.fileId) : null;
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (file) {
            if (file.content && typeof file.content === 'string' && file.content.length > 0) {
                setContent(file.content);
                return;
            }
            
            setLoading(true);
            fileSystem.readFile(file).then((data) => {
                // If binary, we can't show it easily in text editor
                if (file.isBinary) {
                    setContent(`[BINARY FILE: ${file.name}]\nSize: ${data.byteLength} bytes`);
                } else {
                    setContent(data);
                }
            }).catch(e => {
                setContent(`Error loading file: ${e.message}`);
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [file]);

    const handleSave = (val: string) => {
        setContent(val);
        if (state.folderId && state.fileId && !file?.isBinary) {
            fileSystem.saveFile(state.folderId, state.fileId, val);
        }
    };

    const handleExport = () => {
        if (file && file.type === 'simulation') {
            try {
                const config = JSON.parse(content);
                const pkg = simulationIO.createPackage(config, file.name.replace('.sim', ''));
                simulationIO.triggerDownload(pkg);
            } catch (e) {
                console.error("Export Failed", e);
            }
        }
    };

    const handleRunSim = () => {
        if (file && file.type === 'simulation' && onLoadSimulation) {
            try {
                const config = JSON.parse(content);
                onLoadSimulation(config);
            } catch (e) {
                console.error("handleRunSim errored", e);
            }
        }
    }

    if (!file) return <div className="p-4 opacity-50">File not found.</div>;

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin opacity-50" /></div>;

    if (state.appType === 'sheet') {
        let data = { columns: [], rows: [] };
        try { data = JSON.parse(content); } catch {}

        return (
            <div className="w-full h-full overflow-auto font-mono text-xs bg-[#0a0a0a]">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="w-8 border bg-white/5" style={{ borderColor: 'var(--outline-color)', background: 'rgba(0,0,0,0.2)' }}></th>
                            {data.columns.map((c: string, i: number) => (
                                <th key={i} className="border bg-white/5 px-2 py-1 text-left font-normal" style={{ borderColor: 'var(--outline-color)' }}>{c}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((row: string[], i: number) => (
                            <tr key={i}>
                                <td className="border bg-white/5 text-center opacity-50" style={{ borderColor: 'var(--outline-color)' }}>{i + 1}</td>
                                {row.map((cell, j) => (
                                    <td key={j} className="border px-2 py-1 bg-transparent outline-none focus:bg-white/10 cursor-text" style={{ borderColor: 'var(--outline-color)' }}>
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a]">
            {file.type === 'simulation' && (
                <div className="h-10 border-b flex items-center px-4 gap-2" style={{ borderColor: 'var(--outline-color)', background: 'rgba(0,0,0,0.1)' }}>
                     <button 
                        onClick={handleRunSim}
                        className="text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                        style={{ background: 'var(--accent-color)' }}
                    >
                        <Play className="w-3 h-3" /> RUN SIM
                    </button>
                    <button 
                        onClick={handleExport}
                        className="text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                        style={{ background: 'var(--tertiary-color)' }}
                    >
                        <Download className="w-3 h-3" /> EXPORT .SIM
                    </button>
                </div>
            )}
            <textarea 
                className="flex-1 w-full bg-transparent p-4 outline-none font-mono text-sm resize-none leading-relaxed"
                style={{ color: 'var(--text-color)' }}
                value={content}
                onChange={(e) => handleSave(e.target.value)}
                spellCheck={false}
                readOnly={file.readOnly || file.isBinary}
            />
        </div>
    );
};