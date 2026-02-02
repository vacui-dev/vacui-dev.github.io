// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect, Suspense } from 'react';
import { Minus, X, Loader2 } from 'lucide-react';
import { VirtualFile } from '../../types/filesystem';
import { WorldConfig } from '../../types/simulation';
import { fileSystem } from '../../services/FileSystem';
import { getAppIcon } from './AppRegistry';

// Lazy Load Apps
const BrainKernelViewer = React.lazy(() => import('../BrainKernelViewer').then(m => ({ default: m.BrainKernelViewer })));
const BBSApp = React.lazy(() => import('./Apps/BBS/App').then(m => ({ default: m.BBSApp })));
const YoutubeApp = React.lazy(() => import('./Apps/Youtube/App').then(m => ({ default: m.YoutubeApp })));
const MidiPlayerApp = React.lazy(() => import('./Apps/MidiPlayer/App').then(m => ({ default: m.MidiPlayerApp })));
const ChatApp = React.lazy(() => import('./Apps/Chat/App').then(m => ({ default: m.ChatApp })));
const WordlessDictionaryApp = React.lazy(() => import('./Apps/WordlessDictionary/App').then(m => ({ default: m.WordlessDictionaryApp })));

const GanglionLauncher = React.lazy(() => import('./GanglionLauncher').then(m => ({ default: m.GanglionLauncher })));
const SimulationEditor = React.lazy(() => import('./SimulationEditor').then(m => ({ default: m.SimulationEditor })));
const CalendarApp = React.lazy(() => import('./Apps/Calendar/App').then(m => ({ default: m.CalendarApp })));
const ImageEditorApp = React.lazy(() => import('./Apps/ImageEditor/App').then(m => ({ default: m.ImageEditorApp })));
const MaterialEditorApp = React.lazy(() => import('./Apps/MaterialEditor/App').then(m => ({ default: m.MaterialEditorApp })));
const MeshLabApp = React.lazy(() => import('./Apps/MeshLab/App').then(m => ({ default: m.MeshLabApp })));
const SimulationsBrowserApp = React.lazy(() => import('./SimulationsBrowserApp').then(m => ({ default: m.SimulationsBrowserApp })));
const DvdScreensaverApp = React.lazy(() => import('./Apps/DvdScreensaver/App').then(m => ({ default: m.DvdScreensaverApp })));
const UnitTestApp = React.lazy(() => import('./Apps/UnitTest/App').then(m => ({ default: m.UnitTestApp })));
const HolonConstructApp = React.lazy(() => import('./Apps/NodeConstruct/App').then(m => ({ default: m.HolonConstructApp })));
const WarzoneApp = React.lazy(() => import('./Apps/Warzone/App').then(m => ({ default: m.WarzoneApp })));
const LocalMountApp = React.lazy(() => import('./Apps/LocalMount/App').then(m => ({ default: m.LocalMountApp })));
const GitHubSettingsApp = React.lazy(() => import('./GitHubSettings').then(m => ({ default: m.GitHubSettings })));

const FileEditor = React.lazy(() => import('./Apps').then(m => ({ default: m.FileEditor })));
const FileExplorerApp = React.lazy(() => import('./Apps').then(m => ({ default: m.FileExplorerApp })));
const MemoryPalaceApp = React.lazy(() => import('./Apps/MemoryPalaceApp').then(m => ({ default: m.MemoryPalaceApp })));
const LibraryApp = React.lazy(() => import('./Apps/LibraryApp').then(m => ({ default: m.LibraryApp })));
const HelpApp = React.lazy(() => import('./Apps/HelpApp').then(m => ({ default: m.HelpApp })));

export interface WindowState {
    id: string;
    appType: 'note' | 'mail' | 'sheet' | 'terminal' | 'memory_palace' | 'library' | 'explorer' | 'bbs' | 'help' | 'ganglion' | 'architect' | 'chat' | 'youtube' | 'midi_player' | 'wordless' | 'calendar' | 'image_editor' | 'material_editor' | 'mesh_lab' | 'simulations_browser' | 'dvd' | 'test_suite' | 'holon_construct' | 'warzone' | 'local_mount' | 'github_settings';
    fileId?: string;
    folderId?: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    minimized: boolean;
}

interface WindowProps {
    state: WindowState;
    onClose: () => void;
    onFocus: () => void;
    onMinimize: () => void;
    onUpdate: (id: string, updates: Partial<WindowState>) => void;
    isActive: boolean;
    onLoadSimulation?: (config: WorldConfig) => void;
    onOpenWindow: (type: WindowState['appType'], file?: VirtualFile, folderId?: string) => void;
    onRegisterExclusionZone?: (id: string, rect: { x: number, y: number, width: number, height: number }) => void;
    onUnregisterExclusionZone?: (id: string) => void;
}

export const Window: React.FC<WindowProps> = ({ 
    state, onClose, onFocus, onMinimize, onUpdate, isActive, onLoadSimulation, onOpenWindow,
    onRegisterExclusionZone, onUnregisterExclusionZone
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                onUpdate(state.id, { 
                    x: e.clientX - dragOffset.x, 
                    y: e.clientY - dragOffset.y 
                });
            }
            if (isResizing) {
                onUpdate(state.id, { 
                    width: Math.max(300, e.clientX - state.x), 
                    height: Math.max(200, e.clientY - state.y) 
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragOffset, state, onUpdate]);

    if (state.minimized) return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        onFocus();
        setIsDragging(true);
        setDragOffset({ x: e.clientX - state.x, y: e.clientY - state.y });
    };

    const handleResizeDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
    };

    const getFile = () => state.folderId && state.fileId ? fileSystem.getFile(state.folderId, state.fileId) : undefined;

    const appIcon = getAppIcon(state.appType);

    return (
        <div 
            className={`os-window absolute pointer-events-auto rounded-lg overflow-hidden shadow-2xl flex flex-col border transition-shadow duration-100`}
            style={{ 
                left: state.x, top: state.y, width: state.width, height: state.height, zIndex: state.zIndex,
                backgroundColor: 'var(--window-color)', 
                borderColor: isActive ? 'var(--primary-color)' : 'var(--outline-color)',
                boxShadow: isActive ? '0 0 30px rgba(0,0,0,0.5)' : '0 0 10px rgba(0,0,0,0.3)'
            }}
            onMouseDown={onFocus}
        >
            <div className="h-8 border-b flex items-center justify-between px-3 select-none cursor-move shrink-0 bg-[#111]" style={{ borderColor: 'var(--outline-color)' }} onMouseDown={handleMouseDown}>
                <div className="flex items-center gap-2 text-xs font-mono font-bold opacity-90" style={{ color: 'var(--text-color)' }}>
                    <div className="w-3 h-3 text-[var(--accent-color)]">
                        {appIcon}
                    </div>
                    <span>{state.title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onMinimize(); }} className="p-1 hover:opacity-50 rounded" style={{ color: 'var(--text-color)' }}><Minus className="w-3 h-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 hover:opacity-50 rounded" style={{ color: 'var(--text-color)' }}><X className="w-3 h-3" /></button>
                </div>
            </div>
            <div className="flex-1 overflow-auto relative" style={{ color: 'var(--text-color)' }}>
                <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin opacity-50" /></div>}>
                    {state.appType === 'holon_construct' ? (
                        <HolonConstructApp file={getFile()} />
                    ) : state.appType === 'terminal' ? (
                        <BrainKernelViewer onClose={onClose} />
                    ) : state.appType === 'memory_palace' ? (
                        <MemoryPalaceApp />
                    ) : state.appType === 'library' ? (
                        <LibraryApp />
                    ) : state.appType === 'explorer' ? (
                        <FileExplorerApp onOpen={onOpenWindow} />
                    ) : state.appType === 'bbs' ? (
                        <BBSApp />
                    ) : state.appType === 'ganglion' ? (
                        <GanglionLauncher />
                    ) : state.appType === 'architect' ? (
                        <SimulationEditor onLoadSimulation={onLoadSimulation} file={getFile()} />
                    ) : state.appType === 'help' ? (
                        <HelpApp />
                    ) : state.appType === 'chat' ? (
                        <ChatApp file={fileSystem.getFile(state.folderId!, state.fileId!)!} />
                    ) : state.appType === 'youtube' ? (
                        <YoutubeApp />
                    ) : state.appType === 'midi_player' ? (
                        <MidiPlayerApp initialFile={state.fileId && state.folderId ? fileSystem.getFile(state.folderId, state.fileId) : undefined} />
                    ) : state.appType === 'wordless' ? (
                        <WordlessDictionaryApp initialConceptId={state.fileId} />
                    ) : state.appType === 'calendar' ? (
                        <CalendarApp />
                    ) : state.appType === 'image_editor' ? (
                        <ImageEditorApp file={state.fileId && state.folderId ? fileSystem.getFile(state.folderId, state.fileId) : undefined} onOpenWindow={onOpenWindow} />
                    ) : state.appType === 'material_editor' ? (
                        <MaterialEditorApp file={state.fileId && state.folderId ? fileSystem.getFile(state.folderId, state.fileId) : undefined} onOpenWindow={onOpenWindow} />
                    ) : state.appType === 'mesh_lab' ? (
                        <MeshLabApp />
                    ) : state.appType === 'simulations_browser' ? (
                        <SimulationsBrowserApp onOpenWindow={onOpenWindow} />
                    ) : state.appType === 'dvd' ? (
                        <DvdScreensaverApp onRegisterExclusionZone={onRegisterExclusionZone} onUnregisterExclusionZone={onUnregisterExclusionZone} />
                    ) : state.appType === 'test_suite' ? (
                        <UnitTestApp file={getFile()} />
                    ) : state.appType === 'warzone' ? (
                        <WarzoneApp />
                    ) : state.appType === 'local_mount' ? (
                        <LocalMountApp />
                    ) : state.appType === 'github_settings' ? (
                        <GitHubSettingsApp />
                    ) : (
                        <FileEditor state={state} onLoadSimulation={onLoadSimulation} />
                    )}
                </Suspense>
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50 flex items-end justify-end p-0.5 opacity-50 hover:opacity-100" onMouseDown={handleResizeDown}>
                <div className="w-2 h-2 border-r-2 border-b-2" style={{ borderColor: 'var(--text-color)' }} />
            </div>
        </div>
    );
};