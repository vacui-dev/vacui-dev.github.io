// Copyright (c) 2025 vacui.dev, all rights reserved

export interface VirtualFile {
    id: string;
    name: string;
    type: 'text' | 'sheet' | 'system' | 'rag_db' | 'simulation' | 'profile' | 'bbs_data' | 'chat' | 'image' | 'audio' | 'material' | 'shader' | 'graph' | 'folder' | 'shortcut' | 'protocol';
    url?: string;
    loaded: boolean;
    isBinary?: boolean;
    content?: any;
    updatedAt: number;
    readOnly?: boolean;
    parentId?: string;
    
    // Remote Filesystem Extensions
    remoteSource?: 'local_bridge' | 'github';
    remotePath?: string;
}

export interface VirtualFolder {
    id: string;
    name: string;
    files: VirtualFile[];
    restrictedTo?: string[];
}

export interface UserProfile {
    id: string;
    name: string;
    bio: string;
    iconSvg: string;
    role: 'sysop' | 'user' | 'guest' | 'architect' | 'bot';
    password?: string;
    desktopConfig?: any;
}