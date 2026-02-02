
// Copyright (c) 2025 vacui.dev, all rights reserved

import { VirtualFile } from '../types/filesystem';

export const APP_ID_MAP: Record<string, string> = {
    'text': 'note',
    'sheet': 'sheet',
    'simulation': 'architect',
    'system': 'note', 
    'profile': 'note',
    'bbs_data': 'note',
    'chat': 'chat',
    'audio': 'midi_player',
    'image': 'image_editor',
    'material': 'material_editor',
    'shader': 'material_editor',
    'video': 'youtube',
    'graph': 'holon_construct',
    'holon': 'holon_construct',
    'protocol': 'holon_construct',
    'shortcut': 'launcher'
};

export const getAppForFile = (file: VirtualFile): string => {
    if (file.id.includes('msg')) return 'mail';
    return APP_ID_MAP[file.type] || 'note';
};

export const getAppTitle = (appId: string): string => {
    const titleMap: Record<string, string> = {
        'terminal': 'System Kernel',
        'memory_palace': 'HyperSpace Visualizer',
        'library': 'Data Library',
        'explorer': 'File Explorer',
        'bbs': 'Genesis BBS',
        'help': 'Manual',
        'ganglion': 'Ganglion Node',
        'architect': 'Simulation Architect',
        'chat': 'Chat',
        'note': 'Notepad',
        'mail': 'Message',
        'sheet': 'Spreadsheet',
        'youtube': 'YouTube',
        'midi_player': 'Synthesizer',
        'wordless': 'Wordless Dictionary',
        'calendar': 'Chronos',
        'image_editor': 'Texture Lab',
        'material_editor': 'Material Lab',
        'mesh_lab': 'Mesh Lab',
        'simulations_browser': 'Simulations',
        'dvd': 'Screen Saver',
        'test_suite': 'System Health',
        'holon_construct': 'Holon Construct',
        'warzone': 'Warzone',
        'launcher': 'Launcher'
    };
    return titleMap[appId] || 'Window';
};
