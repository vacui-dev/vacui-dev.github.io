
// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect } from 'react';
import { fileSystem } from '../../../services/FileSystem';
import { VirtualFile } from '../../../types/filesystem';
import { 
    Folder, FilePlus, Image as ImageIcon, Gamepad2, Globe, 
    Activity, GitFork, MessageSquare, Zap, Edit3, Brain, BookOpen, 
    Youtube, Music, Layers, Box, Calendar, Disc, HelpCircle, Terminal,
    FileText, Table, MessageCircle, Code, Sword
} from 'lucide-react';
import { getAppForFile } from '../../../config/fileAssociations';
import { getAppIcon } from '../AppRegistry';

interface DesktopIconsProps {
    onOpenWindow: (type: any, file?: VirtualFile, folderId?: string) => void;
    onContextMenu: (e: React.MouseEvent, file?: VirtualFile) => void;
}

// Fallback icon lookup for "Icon Name" strings in shortcuts
const getIconByName = (name: string) => {
    const props = { className: "w-8 h-8" };
    switch (name) {
        case 'Activity': return <Activity {...props} />;
        case 'Folder': return <Folder {...props} />;
        case 'GitFork': return <GitFork {...props} />;
        case 'MessageSquare': return <MessageSquare {...props} />;
        case 'Zap': return <Zap {...props} />;
        case 'Edit3': return <Edit3 {...props} />;
        case 'Gamepad2': return <Gamepad2 {...props} />;
        case 'Brain': return <Brain {...props} />;
        case 'BookOpen': return <BookOpen {...props} />;
        case 'Youtube': return <Youtube {...props} />;
        case 'Music': return <Music {...props} />;
        case 'Image': return <ImageIcon {...props} />;
        case 'Layers': return <Layers {...props} />;
        case 'Box': return <Box {...props} />;
        case 'Calendar': return <Calendar {...props} />;
        case 'Disc': return <Disc {...props} />;
        case 'HelpCircle': return <HelpCircle {...props} />;
        case 'Terminal': return <Terminal {...props} />;
        case 'Sword': return <Sword {...props} />;
        default: return <Globe {...props} />;
    }
};

export const DesktopIcons: React.FC<DesktopIconsProps> = ({ onOpenWindow, onContextMenu }) => {
    const [desktopFiles, setDesktopFiles] = useState<VirtualFile[]>([]);
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

    useEffect(() => {
        const syncDesktop = async () => {
            const home = fileSystem.getFolders().find(f => f.id === 'home');
            if (!home) return;

            const desktopFolderFile = home.files.find(f => f.name === 'Desktop' && f.type === 'folder');
            if (desktopFolderFile) {
                const files = home.files.filter(f => f.parentId === desktopFolderFile.id);
                
                // Load Layout if exists
                const layoutFile = files.find(f => f.name === 'desktop_layout.json');
                let currentLayout: string[] = [];
                
                if (layoutFile) {
                    let content = layoutFile.content;
                    if (!layoutFile.loaded) {
                        try {
                            content = await fileSystem.readFile(layoutFile);
                        } catch {}
                    }
                    if (typeof content === 'string') {
                        try {
                            currentLayout = JSON.parse(content);
                        } catch {}
                    }
                }

                // Sort files based on layout
                if (currentLayout.length > 0) {
                    files.sort((a, b) => {
                        const idxA = currentLayout.indexOf(a.id);
                        const idxB = currentLayout.indexOf(b.id);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        if (idxA !== -1) return -1;
                        if (idxB !== -1) return 1;
                        return a.name.localeCompare(b.name);
                    });
                } else {
                    files.sort((a, b) => a.name.localeCompare(b.name));
                }

                setDesktopFiles(files.filter(f => f.name !== 'desktop_layout.json'));
            }
        };

        syncDesktop();
        return fileSystem.subscribe(syncDesktop);
    }, []);

    const handleFileClick = async (file: VirtualFile) => {
        if (file.type === 'shortcut') {
            try {
                const content = await fileSystem.readFile(file);
                const sc = typeof content === 'string' ? JSON.parse(content) : content;
                
                if (sc.action === 'file') {
                    const allFolders = fileSystem.getFolders();
                    let targetFile: VirtualFile | undefined;
                    let targetFolderId: string | undefined;

                    // Try to find by ID first, then by URL/Path
                    for (const folder of allFolders) {
                        // Check ID match
                        let f = folder.files.find(fi => fi.id === sc.url);
                        
                        // Check URL/Path match (if sc.url is a path like /shared/gold.json)
                        if (!f && sc.url && sc.url.startsWith('/')) {
                             f = folder.files.find(fi => fi.url === sc.url);
                        }

                        if (f) {
                            targetFile = f;
                            targetFolderId = folder.id;
                            break;
                        }
                    }

                    if (targetFile && targetFolderId) {
                        const app = getAppForFile(targetFile);
                        onOpenWindow(app, targetFile, targetFolderId);
                    } else {
                        // Fallback if file not found in VFS but URL exists
                        onOpenWindow(sc.url); 
                    }
                } else {
                    onOpenWindow(sc.url);
                }
            } catch {}
        } else {
            const app = getAppForFile(file);
            onOpenWindow(app, file, 'home');
        }
    };

    // Drag handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const home = fileSystem.getFolders().find(f => f.id === 'home');
        const desktop = home?.files.find(f => f.name === 'Desktop' && f.type === 'folder');
        if (desktop && e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach((file) => {
                fileSystem.ingestFile(file as File, 'home', desktop.id);
            });
        }
    };

    return (
        <div 
            className="absolute inset-0 pointer-events-auto p-4 flex flex-col flex-wrap content-start gap-4 z-0" 
            onClick={() => setSelectedIcon(null)}
            onContextMenu={(e) => onContextMenu(e, undefined)}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {desktopFiles.map(file => {
                let icon = <Folder className="w-8 h-8" />;
                let label = file.name;
                let color = "text-white";

                if (file.type === 'shortcut') {
                    try {
                        const sc = typeof file.content === 'string' ? JSON.parse(file.content) : file.content;
                        label = sc.label || file.name.replace('.lnk', '');
                        if (sc.color) color = sc.color;
                        
                        if (sc.icon) {
                            icon = getIconByName(sc.icon);
                        } else if (sc.action === 'app') {
                            // Use new registry helper for Apps
                            const regIcon = getAppIcon(sc.url);
                            // Clone element to add class
                            if (React.isValidElement(regIcon)) {
                                icon = React.cloneElement(regIcon as React.ReactElement<any>, { className: "w-8 h-8" });
                            }
                        } else if (sc.action === 'file') {
                            const allFolders = fileSystem.getFolders();
                            let found = false;
                            for (const folder of allFolders) {
                                const target = folder.files.find(f => f.id === sc.url || f.url === sc.url);
                                if (target) {
                                    const appId = getAppForFile(target);
                                    const regIcon = getAppIcon(appId);
                                    if (React.isValidElement(regIcon)) {
                                        icon = React.cloneElement(regIcon as React.ReactElement<any>, { className: "w-8 h-8" });
                                    }
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                icon = <FileText className="w-8 h-8" />;
                            }
                        }
                    } catch {}
                } else {
                    if (file.type === 'image') icon = <ImageIcon className="w-8 h-8" />;
                    else if (file.type === 'text') icon = <FilePlus className="w-8 h-8" />;
                    else if (file.type === 'simulation') icon = <Gamepad2 className="w-8 h-8" />;
                    else if (file.type === 'folder') icon = <Folder className="w-8 h-8" />;
                    else if (file.type === 'audio') icon = <Music className="w-8 h-8" />;
                    else if (file.type === 'sheet') icon = <Table className="w-8 h-8" />;
                    else if (file.type === 'system') icon = <Terminal className="w-8 h-8" />;
                    else if (file.type === 'chat') icon = <MessageCircle className="w-8 h-8" />;
                    else if (file.type === 'material') icon = <Layers className="w-8 h-8" />;
                    else if (file.type === 'shader') icon = <Code className="w-8 h-8" />;
                    else icon = <FileText className="w-8 h-8" />;
                }

                return (
                    <div 
                        key={file.id}
                        className={`w-24 flex flex-col items-center gap-1 p-2 rounded cursor-pointer group transition-colors ${selectedIcon === file.id ? 'bg-white/10 border border-white/20 backdrop-blur-sm' : 'hover:bg-white/5 border border-transparent'}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedIcon(file.id); }}
                        onDoubleClick={(e) => { e.stopPropagation(); handleFileClick(file); }}
                        onContextMenu={(e) => onContextMenu(e, file)}
                    >
                        <div className={`filter drop-shadow-lg group-hover:scale-110 transition-transform duration-200 ${color}`}>
                            {icon}
                            {file.type === 'shortcut' && <div className="absolute bottom-0 left-0 bg-black rounded-full p-0.5"><Globe className="w-3 h-3 text-white" /></div>}
                        </div>
                        <span className={`text-[10px] text-center font-sans leading-tight px-1 rounded ${selectedIcon === file.id ? 'text-white' : 'text-white/80 bg-black/20'}`}>
                            {label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
