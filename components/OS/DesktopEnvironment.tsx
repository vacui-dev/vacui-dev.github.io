// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useState, useEffect, useCallback } from 'react';
import { Window, WindowState } from './Window';
import { WorldHUD } from './WorldHUD';
import { WorldConfig, Entity } from '../../types/simulation';
import { VirtualFile, UserProfile } from '../../types/filesystem';
import { Disc, Layout, Activity, GitFork } from 'lucide-react';
import { fileSystem } from '../../services/FileSystem';
import { LoginScreen } from './LoginScreen';
import { getAppTitle, getAppForFile } from '../../config/fileAssociations';
import { getAppTitle as getRegTitle } from './AppRegistry';
import { mockNetwork } from '../../services/MockNetwork';
import { UrlDialog } from './UrlDialog';
import { SystemContextMenu, FilePropertiesDialog } from './SystemMenu';
import { StartMenu } from './Desktop/StartMenu';
import { Taskbar } from './Desktop/Taskbar';
import { DesktopIcons } from './Desktop/DesktopIcons';

interface DesktopEnvironmentProps {
    onLoadSimulation: (config: WorldConfig) => void;
    worldState: {
        config: WorldConfig;
        selectedId: string | null;
        onUpdateGlobal: (key: keyof WorldConfig, val: any) => void;
        onUpdateEntity: (id: string, updates: Partial<Entity>) => void;
        onAddEntity: (entity: Entity) => void;
        onDeleteEntity: (id: string) => void;
        onSelect: (id: string | null) => void;
    };
}

interface ExclusionZone {
    id: string;
    rect: { x: number, y: number, width: number, height: number };
}

export const DesktopEnvironment: React.FC<DesktopEnvironmentProps> = ({ onLoadSimulation, worldState }) => {
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [guestProfile, setGuestProfile] = useState<UserProfile | null>(null);
    const [windows, setWindows] = useState<WindowState[]>([]);
    const [nextZIndex, setNextZIndex] = useState(100);
    const [exclusionZones, setExclusionZones] = useState<Record<string, ExclusionZone['rect']>>({});
    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, file?: VirtualFile} | null>(null);
    const [showPropertiesFor, setShowPropertiesFor] = useState<VirtualFile | null>(null);
    const [showUrlDialog, setShowUrlDialog] = useState(false);
    const [isStartHovered, setIsStartHovered] = useState(false);
    const [startIcons, setStartIcons] = useState({ smooth: '', sharp: '' });
    const [desktopFolderId, setDesktopFolderId] = useState<string | null>(null);

    // Load Start Icons
    useEffect(() => {
        const loadIcons = async () => {
            const os = fileSystem.getFolders().find(f => f.id === 'os');
            if (!os) return;
            
            const smoothFile = os.files.find(f => f.name === 'smooth.svg');
            const sharpFile = os.files.find(f => f.name === 'sharp.svg');
            
            if (smoothFile && sharpFile) {
                const smooth = await fileSystem.readFile(smoothFile);
                const sharp = await fileSystem.readFile(sharpFile);
                
                const extractPath = (svg: string) => {
                    const m = svg.match(/d="([^"]+)"/);
                    return m ? m[1] : '';
                };
                
                setStartIcons({
                    smooth: extractPath(smooth),
                    sharp: extractPath(sharp)
                });
            }
        };
        
        const unsub = fileSystem.subscribe(loadIcons);
        loadIcons();
        return unsub;
    }, []);

    // Init Guest Profile
    useEffect(() => {
        const fetchGuest = async () => {
            try {
                const res = await mockNetwork.fetch('/home/guest/config.json');
                const profile = await res.json();
                setGuestProfile(profile);
                handleLogin(profile); // Auto-login guest initially
            } catch (e) {
                console.warn("Could not load guest profile", e);
            }
        };
        fetchGuest();
    }, []);

    useEffect(() => {
        const handleClickOutside = () => {
            setContextMenu(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (currentUser && currentUser.desktopConfig?.theme) {
            document.body.className = `theme-${currentUser.desktopConfig.theme}`;
        } else {
            document.body.className = 'theme-oled';
        }
    }, [currentUser]);

    // --- FILESYSTEM SYNC ---
    useEffect(() => {
        if (!currentUser) return;
        const syncDesktop = async () => {
            const home = fileSystem.getFolders().find(f => f.id === 'home');
            if (!home) return;
            const desktopFolderFile = home.files.find(f => f.name === 'Desktop' && f.type === 'folder');
            if (desktopFolderFile) {
                setDesktopFolderId(desktopFolderFile.id);
            }
        };
        syncDesktop();
        const unsub = fileSystem.subscribe(syncDesktop);
        return unsub;
    }, [currentUser]);

    // --- LOGIN MANAGEMENT ---
    const handleLogin = async (user: UserProfile) => {
        setCurrentUser(user);
        fileSystem.login(user.id, user.password || '');
        setWindows([]); 

        if (user.desktopConfig?.defaultSimulation) {
            const simIdOrName = user.desktopConfig.defaultSimulation;
            const simsFolder = fileSystem.getFolders().find(f => f.id === 'sims');
            const simFile = simsFolder?.files.find(f => f.id === simIdOrName || f.name === simIdOrName);
            
            if (simFile) {
                try {
                    const content = await fileSystem.readFile(simFile);
                    const config = typeof content === 'string' ? JSON.parse(content) : content;
                    onLoadSimulation(config);
                } catch {}
            } else {
                try {
                    const simUrl = `/sims/${simIdOrName}`;
                    const res = await mockNetwork.fetch(simUrl);
                    if (res.ok) {
                        const simConfig = await res.json();
                        onLoadSimulation(simConfig);
                    }
                } catch {}
            }
        }
    };

    const handleSwitchUser = () => {
        setCurrentUser(null);
        setIsStartMenuOpen(false);
    };

    const handleLogout = () => {
        if (guestProfile) {
            handleLogin(guestProfile);
        } else {
            setCurrentUser(null);
        }
        setIsStartMenuOpen(false);
    };

    // --- WINDOW MANAGEMENT ---

    const openWindow = useCallback((appType: WindowState['appType'], file?: VirtualFile, folderId?: string) => {
        const id = `win_${Date.now()}`;
        
        const isMobile = window.innerWidth < 768;
        const width = isMobile ? window.innerWidth - 16 : 800;
        const height = isMobile ? window.innerHeight - 100 : 600;
        const startX = isMobile ? 8 : 100 + (windows.length * 30);
        const startY = isMobile ? 80 : 80 + (windows.length * 30);

        // Try Registry Title first, fall back to legacy config for file-based apps
        let title = getRegTitle(appType);
        if (title === 'Window' && !file) {
             // Only fallback if Registry returned default 'Window' AND no file is present
             // Actually getAppTitle in fileAssociations is legacy.
             // Let's use file name if present, else registry title.
             title = getAppTitle(appType); // Use legacy for fallback
        }
        if (file) title = file.name;

        const newWindow: WindowState = {
            id,
            appType,
            fileId: file?.id,
            folderId: folderId,
            title,
            x: Math.min(startX, window.innerWidth - 50),
            y: Math.min(startY, window.innerHeight - 100),
            width,
            height,
            zIndex: nextZIndex + 1,
            minimized: false
        };

        setWindows(prev => [...prev, newWindow]);
        setNextZIndex(z => z + 1);
        setIsStartMenuOpen(false);
    }, [windows.length, nextZIndex]);

    const closeWindow = useCallback((id: string) => {
        setWindows(prev => prev.filter(w => w.id !== id));
        setExclusionZones(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }, []);

    const focusWindow = useCallback((id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex + 1 } : w));
        setNextZIndex(z => z + 1);
    }, [nextZIndex]);

    const updateWindow = useCallback((id: string, updates: Partial<WindowState>) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    }, []);

    const registerExclusionZone = useCallback((id: string, rect: { x: number, y: number, width: number, height: number }) => {
        setExclusionZones(prev => {
            if (prev[id] && prev[id].x === rect.x && prev[id].y === rect.y) return prev;
            return { ...prev, [id]: rect };
        });
    }, []);

    const unregisterExclusionZone = useCallback((id: string) => {
        setExclusionZones(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
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

                    for (const folder of allFolders) {
                        let f = folder.files.find(fi => fi.id === sc.url);
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
                        openWindow(app as any, targetFile, targetFolderId);
                    } else {
                        openWindow(sc.url as any); 
                    }
                } else {
                    openWindow(sc.url as any);
                }
            } catch {}
        } else {
            const app = getAppForFile(file);
            openWindow(app as any, file, 'home');
        }
    };

    // --- CONTEXT MENU LOGIC ---

    const handleContextMenu = (e: React.MouseEvent, file?: VirtualFile) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, file });
    };

    const handleMenuAction = (action: string) => {
        const file = contextMenu?.file;
        setContextMenu(null);

        if (action === 'new_text') {
            if (!desktopFolderId) return;
            const name = `New Text Document ${Date.now()}.txt`;
            const newFile = fileSystem.createFile('home', name, 'text', '', desktopFolderId);
            if (newFile) openWindow('note', newFile, 'home');
        } else if (action === 'download_url') {
            setShowUrlDialog(true);
        } else if (file) {
            if (action === 'open') {
                handleFileClick(file);
            } else if (action === 'delete') {
                if (desktopFolderId) fileSystem.deleteFile('home', file.id);
            } else if (action === 'duplicate') {
                if (desktopFolderId) fileSystem.duplicateFile('home', file.id);
            } else if (action === 'properties') {
                setShowPropertiesFor(file);
            }
        }
    };

    const cycleTheme = () => {
        const themes = ['oled', 'strong', 'pastel', 'dark'];
        const current = document.body.className.replace('theme-', '');
        const idx = themes.indexOf(current);
        const next = themes[(idx + 1) % themes.length];
        document.body.className = `theme-${next}`;
        setContextMenu(null);
    };

    if (!currentUser) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    const desktopCustomItems = (
        <>
            <button className="text-left px-4 py-2 hover:bg-white/10 text-xs text-white flex items-center gap-2" onClick={() => { openWindow('holon_construct'); setContextMenu(null); }}>
                <GitFork className="w-3 h-3" /> New Node Graph
            </button>
            <button className="text-left px-4 py-2 hover:bg-white/10 text-xs text-white flex items-center gap-2" onClick={() => { openWindow('test_suite'); setContextMenu(null); }}>
                <Activity className="w-3 h-3" /> System Health
            </button>
            <button className="text-left px-4 py-2 hover:bg-white/10 text-xs text-white flex items-center gap-2" onClick={() => { openWindow('dvd'); setContextMenu(null); }}>
                <Disc className="w-3 h-3" /> Screen Saver
            </button>
            <button className="text-left px-4 py-2 hover:bg-white/10 text-xs text-white flex items-center gap-2" onClick={cycleTheme}>
                <Layout className="w-3 h-3" /> Cycle Theme
            </button>
        </>
    );

    return (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden select-none flex flex-col">
            
            {/* Workspace Area */}
            <div className="flex-1 relative pointer-events-none">
                
                <DesktopIcons 
                    onOpenWindow={openWindow} 
                    onContextMenu={handleContextMenu} 
                />

                {/* HUD Layer */}
                <WorldHUD 
                    config={worldState.config}
                    selectedId={worldState.selectedId}
                    onUpdateGlobal={worldState.onUpdateGlobal}
                    onUpdateEntity={worldState.onUpdateEntity}
                    onAddEntity={worldState.onAddEntity}
                    onDeleteEntity={worldState.onDeleteEntity}
                    onSelect={worldState.onSelect}
                    onOpenWindow={openWindow}
                />

                {/* Windows Layer */}
                {windows.map(win => (
                    <Window
                        key={win.id}
                        state={win}
                        isActive={win.zIndex === nextZIndex}
                        onClose={() => closeWindow(win.id)}
                        onFocus={() => focusWindow(win.id)}
                        onMinimize={() => updateWindow(win.id, { minimized: true })}
                        onUpdate={updateWindow}
                        onLoadSimulation={onLoadSimulation}
                        onOpenWindow={openWindow}
                        onRegisterExclusionZone={registerExclusionZone}
                        onUnregisterExclusionZone={unregisterExclusionZone}
                    />
                ))}

                {/* Desktop Context Menu */}
                {contextMenu && (
                    <SystemContextMenu 
                        x={contextMenu.x} 
                        y={contextMenu.y} 
                        file={contextMenu.file}
                        onClose={() => setContextMenu(null)}
                        onAction={handleMenuAction}
                        customItems={!contextMenu.file ? desktopCustomItems : null}
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
                        if (desktopFolderId) await fileSystem.importFileFromUrl(url, 'home', desktopFolderId); 
                    }}
                />
            </div>

            <StartMenu 
                currentUser={currentUser}
                isOpen={isStartMenuOpen}
                onClose={() => setIsStartMenuOpen(false)}
                onOpenWindow={openWindow}
                onLogout={handleLogout}
                onSwitchUser={handleSwitchUser}
            />

            <Taskbar 
                onToggleStart={() => setIsStartMenuOpen(!isStartMenuOpen)}
                isStartOpen={isStartMenuOpen}
                isStartHovered={isStartHovered}
                setIsStartHovered={setIsStartHovered}
                startIcons={startIcons}
                windows={windows}
                onOpenWindow={openWindow}
            />
        </div>
    );
};