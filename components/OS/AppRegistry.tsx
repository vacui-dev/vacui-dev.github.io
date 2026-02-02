// Copyright (c) 2025 vacui.dev, all rights reserved

import React from 'react';
import { 
    Terminal, Activity, Folder, MessageSquare, Zap, Edit3, 
    Gamepad2, Brain, BookOpen, Youtube, Music, Image, Layers, Box, 
    Calendar, Disc, HelpCircle, Sword, MessageCircle, Mail, FileText, Table, Globe, Hexagon, HardDrive, Github
} from 'lucide-react';

export interface AppDefinition {
    id: string;
    label: string; // Used in Start Menu / Tooltips
    title: string; // Used in Window Header
    icon: React.ReactNode;
    hidden?: boolean; // If true, hide from Start Menu (e.g. helper apps)
}

export const SYSTEM_APPS: AppDefinition[] = [
    { id: 'terminal', label: 'System Kernel', title: 'System Kernel', icon: <Terminal className="w-full h-full" /> },
    { id: 'test_suite', label: 'System Health', title: 'System Health', icon: <Activity className="w-full h-full" /> },
    { id: 'explorer', label: 'File Explorer', title: 'File Explorer', icon: <Folder className="w-full h-full" /> },
    { id: 'local_mount', label: 'Local Link', title: 'Filesystem Bridge', icon: <HardDrive className="w-full h-full" /> },
    { id: 'github_settings', label: 'GitHub', title: 'GitHub Filesystem', icon: <Github className="w-full h-full" /> },
    { id: 'holon_construct', label: 'Holon Construct', title: 'Holon Construct', icon: <Hexagon className="w-full h-full" /> },
    { id: 'warzone', label: 'Warzone', title: 'Warzone Arena', icon: <Sword className="w-full h-full" /> },
    { id: 'bbs', label: 'Genesis BBS', title: 'Genesis BBS', icon: <MessageSquare className="w-full h-full" /> },
    { id: 'ganglion', label: 'Ganglion Node', title: 'Ganglion Node', icon: <Zap className="w-full h-full" /> },
    { id: 'architect', label: 'Architect', title: 'Simulation Architect', icon: <Edit3 className="w-full h-full" /> },
    { id: 'simulations_browser', label: 'Simulations', title: 'Simulations', icon: <Gamepad2 className="w-full h-full" /> },
    { id: 'memory_palace', label: 'Memory Palace', title: 'HyperSpace Visualizer', icon: <Brain className="w-full h-full" /> },
    { id: 'wordless', label: 'Dictionary', title: 'Wordless Dictionary', icon: <BookOpen className="w-full h-full" /> },
    { id: 'youtube', label: 'YouTube', title: 'YouTube', icon: <Youtube className="w-full h-full" /> },
    { id: 'midi_player', label: 'Synthesizer', title: 'Synthesizer', icon: <Music className="w-full h-full" /> },
    { id: 'image_editor', label: 'Texture Lab', title: 'Texture Lab', icon: <Image className="w-full h-full" /> },
    { id: 'material_editor', label: 'Material Lab', title: 'Material Lab', icon: <Layers className="w-full h-full" /> },
    { id: 'mesh_lab', label: 'Mesh Lab', title: 'Mesh Lab', icon: <Box className="w-full h-full" /> },
    { id: 'calendar', label: 'Chronos', title: 'Chronos', icon: <Calendar className="w-full h-full" /> },
    { id: 'dvd', label: 'Screen Saver', title: 'Screen Saver', icon: <Disc className="w-full h-full" /> },
    { id: 'help', label: 'Manual', title: 'Genesis OS Manual', icon: <HelpCircle className="w-full h-full" /> },
    
    // Document / Utility Types
    { id: 'note', label: 'Notepad', title: 'Notepad', icon: <FileText className="w-full h-full" />, hidden: true },
    { id: 'sheet', label: 'Spreadsheet', title: 'Spreadsheet', icon: <Table className="w-full h-full" />, hidden: true },
    { id: 'chat', label: 'Chat', title: 'Chat', icon: <MessageCircle className="w-full h-full" />, hidden: true },
    { id: 'mail', label: 'Mail', title: 'Message', icon: <Mail className="w-full h-full" />, hidden: true },
    { id: 'launcher', label: 'Launcher', title: 'Launcher', icon: <Globe className="w-full h-full" />, hidden: true },
];

export const getAppInfo = (id: string) => SYSTEM_APPS.find(a => a.id === id);

export const getAppIcon = (id: string) => {
    const app = getAppInfo(id);
    return app ? app.icon : <Globe className="w-full h-full" />;
};

export const getAppTitle = (id: string) => {
    const app = getAppInfo(id);
    return app ? app.title : 'Window';
};