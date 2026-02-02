// Copyright (c) 2025 vacui.dev, all rights reserved

import { VirtualFile, VirtualFolder, UserProfile } from "../types/filesystem";
import { DesktopShortcut } from "../types/desktop";
import { mockNetwork } from "./MockNetwork";
import { runtimeIntegration } from "./RuntimeIntegration";
import { localFileSystemBridge } from "./LocalFileSystemBridge";

const README_MD = `
# GENESIS WORLD MODEL OS
**v2.4.0 (Context Rebirth)**

## Philosophy
The File System is now **Lazy**.
It does not hold the weight of the world until you ask for it.
Files are fetched from the Ether (Mock Network) on demand.

## Architecture
- **Lazy Evaluation**: 'await fileSystem.readFile(id)'
- **Binary Support**: Native support for .mid, .png via Blobs.
`;

const COMMUNITY_GUIDELINES_MD = `
# SHARED WORKSPACE PROTOCOLS

**To:** All Intelligent Agents
**From:** Systems Engineer 1

This file system is a persistent shared memory space. 

## 1. Public vs Private
- **~/Home**: Private.
- **~/Simulations**: Public Commons.
`;

const PLACEHOLDER_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export class FileSystemCore {
    private folders: VirtualFolder[] = [];
    private listeners: (() => void)[] = [];
    private currentUser: string = 'guest';

    constructor() {
        this.initializeManifest();
        this.mountOs();
        this.mountSimulations();
        this.mountShared();
        this.mountUser('guest');
    }

    // --- STATE MANAGEMENT ---

    public getFolders() {
        return this.folders.filter(f => {
            if (!f.restrictedTo) return true;
            return f.restrictedTo.includes(this.currentUser);
        });
    }

    public getFile(folderId: string, fileId: string): VirtualFile | undefined {
        const folder = this.getFolders().find(f => f.id === folderId);
        return folder?.files.find(f => f.id === fileId);
    }

    public getCurrentUser() {
        return this.currentUser;
    }

    public subscribe(callback: () => void) {
        this.listeners.push(callback);
        return () => { this.listeners = this.listeners.filter(l => l !== callback); };
    }

    public notify() {
        this.listeners.forEach(cb => cb());
    }

    // --- PRIMITIVE I/O ---

    public async readFile(file: VirtualFile): Promise<any> {
        if (file.loaded) {
            return file.content;
        }

        // --- REMOTE SOURCE (Local Bridge) ---
        if (file.remoteSource === 'local_bridge' && file.remotePath) {
            try {
                const data = await localFileSystemBridge.readFile(file.remotePath);
                file.content = data;
                file.loaded = true;
                this.notify();
                return data;
            } catch (e) {
                console.error(`[FileSystem] Remote Read Error:`, e);
                throw e;
            }
        }

        // --- STANDARD URL FETCH ---
        if (!file.url) {
            throw new Error(`File ${file.name} has no content and no URL.`);
        }

        try {
            const response = await mockNetwork.fetch(file.url);
            let data;
            if (file.isBinary) {
                data = await response.arrayBuffer();
            } else {
                data = await response.text();
            }

            file.content = data;
            file.loaded = true;
            this.notify();

            return data;
        } catch (e) {
            console.error(`[FileSystem] Read Error for ${file.name}:`, e);
            throw e;
        }
    }

    public addFileToFolder(folderId: string, file: VirtualFile, entropyDelta: number = 0.1) {
        const folder = this.getFolders().find(f => f.id === folderId);
        if (!folder) return;

        folder.files.push(file);
        this.notify();

        runtimeIntegration.notifyFileSystemChange({
            type: 'create',
            path: `${folder.name}/${file.name}`,
            timestamp: Date.now(),
            entropyDelta
        });
    }

    public updateFileContent(folderId: string, fileId: string, content: any) {
        const folder = this.getFolders().find(f => f.id === folderId);
        if (!folder) return;
        const file = folder.files.find(f => f.id === fileId);
        if (file && !file.readOnly) {
            file.content = content;
            file.loaded = true;
            file.updatedAt = Date.now();
            this.notify();

            runtimeIntegration.notifyFileSystemChange({
                type: 'update',
                path: `${folder.name}/${file.name}`,
                timestamp: Date.now(),
                entropyDelta: 0.1
            });
        }
    }

    public removeFile(folderId: string, fileId: string): boolean {
        const folder = this.getFolders().find(f => f.id === folderId);
        if (!folder) return false;

        const index = folder.files.findIndex(f => f.id === fileId);
        if (index === -1) return false;

        const file = folder.files[index];
        if (file.readOnly) return false;

        folder.files.splice(index, 1);
        this.notify();

        runtimeIntegration.notifyFileSystemChange({
            type: 'delete',
            path: `${folder.name}/${file.name}`,
            timestamp: Date.now(),
            entropyDelta: 0.5
        });

        return true;
    }

    // --- MOUNTING & AUTH ---

    public mountFolder(folder: VirtualFolder) {
        const existing = this.folders.findIndex(f => f.id === folder.id);
        if (existing >= 0) {
            this.folders[existing] = folder;
        } else {
            this.folders.push(folder);
        }
        this.notify();
    }

    public unmountFolder(folderId: string) {
        this.folders = this.folders.filter(f => f.id !== folderId);
        this.notify();
    }

    public async login(username: string, password: string): Promise<boolean> {
        try {
            const response = await mockNetwork.fetch(`/home/${username}/config.json`);
            const profile = await response.json() as UserProfile;

            if (profile && (profile.password === password || !profile.password)) {
                await this.mountUser(username);
                return true;
            }
        } catch (e) {
            console.warn("Login check failed", e);
        }
        return false;
    }

    private async mountOs() {
        try {
            const indexUrl = '/os/index.json';
            const indexRes = await mockNetwork.fetch(indexUrl);
            if (indexRes.ok) {
                const index = await indexRes.json();
                const osFolder = this.folders.find(f => f.id === 'os');
                if (osFolder && Array.isArray(index)) {
                    index.forEach((entry: any) => {
                        if (!osFolder.files.find(f => f.id === entry.id)) {
                            osFolder.files.push({
                                ...entry,
                                loaded: false,
                                updatedAt: entry.updatedAt || Date.now()
                            });
                        }
                    });
                    this.notify();
                }
            }
        } catch (e) {
            console.warn("[FileSystem] Failed to mount OS index", e);
        }
    }

    private async mountSimulations() {
        try {
            const indexUrl = '/simulations/index.json';
            const indexRes = await mockNetwork.fetch(indexUrl);
            if (indexRes.ok) {
                const index = await indexRes.json();
                const simsFolder = this.folders.find(f => f.id === 'sims');
                if (simsFolder && Array.isArray(index)) {
                    index.forEach((entry: any) => {
                        if (!simsFolder.files.find(f => f.id === entry.id)) {
                            simsFolder.files.push({
                                ...entry,
                                loaded: false,
                                updatedAt: entry.updatedAt || Date.now()
                            });
                        }
                    });
                    this.notify();
                }
            }
        } catch (e) {
            console.warn("[FileSystem] Failed to mount simulations index", e);
        }
    }

    private async mountShared() {
        try {
            const indexUrl = '/shared/index.json';
            const indexRes = await mockNetwork.fetch(indexUrl);
            if (indexRes.ok) {
                const index = await indexRes.json();
                const sharedFolder = this.folders.find(f => f.id === 'shared');
                if (sharedFolder && Array.isArray(index)) {
                    index.forEach((entry: any) => {
                        if (!sharedFolder.files.find(f => f.id === entry.id)) {
                            sharedFolder.files.push({
                                ...entry,
                                loaded: false,
                                updatedAt: entry.updatedAt || Date.now()
                            });
                        }
                    });
                    this.notify();
                }
            }
        } catch (e) {
            console.warn("[FileSystem] Failed to mount shared index", e);
        }
    }

    private async mountUser(username: string) {
        this.currentUser = username;
        console.log(`[FileSystem] Mounting environment for: ${username}`);

        const homeFolder = this.folders.find(f => f.id === 'home');

        if (homeFolder) {
            homeFolder.files = []; // Reset

            try {
                const indexUrl = `/home/${username}/index.json`;
                const indexRes = await mockNetwork.fetch(indexUrl);

                if (indexRes.ok) {
                    const index = await indexRes.json();
                    if (Array.isArray(index)) {
                        for (const entry of index) {
                            homeFolder.files.push({
                                ...entry,
                                loaded: entry.content !== undefined,
                                updatedAt: entry.updatedAt || Date.now()
                            });

                            if (entry.type === 'folder') {
                                try {
                                    const subIndexUrl = `/home/${username}/${entry.name}/index.json`;
                                    const subRes = await mockNetwork.fetch(subIndexUrl);
                                    if (subRes.ok) {
                                        const subIndex = await subRes.json();
                                        if (Array.isArray(subIndex)) {
                                            subIndex.forEach(subEntry => {
                                                homeFolder.files.push({
                                                    ...subEntry,
                                                    parentId: entry.id,
                                                    loaded: subEntry.content !== undefined,
                                                    updatedAt: subEntry.updatedAt || Date.now()
                                                });
                                            });
                                        }
                                    }
                                } catch (e) {
                                    // Ignore missing subfolders
                                }
                            }
                        }
                    }
                } else {
                    // Fallback
                    homeFolder.files = [
                        { id: 'readme', name: 'README.md', type: 'text', loaded: true, content: README_MD, updatedAt: Date.now(), readOnly: true },
                        { id: 'scratch', name: 'scratchpad.md', type: 'text', loaded: true, content: `# Scratchpad for ${username}\n\n`, updatedAt: Date.now() }
                    ];
                }

                // Desktop & Shortcuts Migration
                let desktopFile = homeFolder.files.find(f => f.name === 'Desktop' && f.type === 'folder');
                if (!desktopFile) {
                    desktopFile = { id: `desktop_${username}_${Date.now()}`, name: 'Desktop', type: 'folder', loaded: true, updatedAt: Date.now() };
                    homeFolder.files.push(desktopFile);
                }

                try {
                    const configRes = await mockNetwork.fetch(`/home/${username}/config.json`);
                    if (configRes.ok) {
                        const profile = await configRes.json() as UserProfile;
                        if (profile.desktopConfig?.shortcuts) {
                            profile.desktopConfig.shortcuts.forEach((sc: DesktopShortcut) => {
                                const cleanLabel = sc.label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                                // ID derived from label, making it somewhat deterministic per user
                                const uniqueId = `sh_${cleanLabel}`; 
                                
                                const exists = homeFolder.files.some(f => f.parentId === desktopFile!.id && f.name === `${sc.label}.lnk`);
                                if (!exists) {
                                    homeFolder.files.push({
                                        id: uniqueId,
                                        name: `${sc.label}.lnk`,
                                        type: 'shortcut',
                                        parentId: desktopFile!.id,
                                        content: JSON.stringify(sc),
                                        loaded: true,
                                        updatedAt: Date.now()
                                    });
                                }
                            });
                        }
                    }
                } catch (e) {
                    console.warn("[FileSystem] Failed to load profile shortcuts");
                }

            } catch (e) {
                console.warn(`[FileSystem] Failed to mount home for ${username}`, e);
                homeFolder.files = [
                    { id: 'error_log', name: 'mount_error.log', type: 'text', loaded: true, content: `Failed to mount home: ${e}`, updatedAt: Date.now() }
                ];
            }
        }
        this.notify();
    }

    private initializeManifest() {
        this.folders = [
            {
                id: 'sys', name: 'System',
                files: [
                    { id: 'kernel_log', name: 'kernel.log', type: 'system', loaded: true, content: '[BOOT] Genesis Kernel v4.0\n[INFO] Async I/O Active\n[INFO] Journal System Online', updatedAt: Date.now(), readOnly: true },
                    { id: 'os_config', name: 'config.json', type: 'text', loaded: true, content: JSON.stringify({ theme: 'dark', transparency: 0.9 }, null, 2), updatedAt: Date.now() },
                    { id: 'guidelines', name: 'COMMUNITY_GUIDELINES.md', type: 'text', loaded: true, content: COMMUNITY_GUIDELINES_MD, updatedAt: Date.now(), readOnly: true }
                ]
            },
            {
                id: 'home', name: 'Home',
                files: [] // Dynamically loaded from index.json
            },
            {
                id: 'os', name: 'Os',
                files: [] // Dynamically loaded from index.json
            },
            {
                id: 'shared', name: 'Shared',
                files: [] // Dynamically loaded from index.json
            },
            {
                id: 'textures', name: 'Textures',
                files: [
                    { id: 'tex_noise', name: 'noise.png', type: 'image', loaded: true, content: PLACEHOLDER_IMAGE, updatedAt: Date.now() }
                ]
            },
            {
                id: 'sims', name: 'Simulations',
                files: [
                    // Grandfathered Legacy Simulations
                    { id: 'sim_sanctum', name: 'Architect_Sanctum.sim', type: 'simulation', url: '/sims/architect_sanctum.sim', loaded: false, updatedAt: Date.now() },
                    { id: 'sim_mech', name: 'Mech_Battle.sim', type: 'simulation', url: '/sims/mech_battle.sim', loaded: false, updatedAt: Date.now() },
                    { id: 'sim_flappy', name: 'Flappy_Genesis.sim', type: 'simulation', url: '/sims/flappy_genesis.sim', loaded: false, updatedAt: Date.now() },
                    { id: 'sim_hydro', name: 'Neural_Hydraulics.sim', type: 'simulation', url: '/sims/neural_hydraulics.sim', loaded: false, updatedAt: Date.now() },
                    { id: 'sim_chronos', name: 'Chronos_Skeleton.sim', type: 'simulation', url: '/sims/chronos_skeleton.sim', loaded: false, updatedAt: Date.now() },
                    { id: 'sim_alchemy', name: 'Alchemist_Lab.sim', type: 'simulation', url: '/sims/alchemist_lab.sim', loaded: false, updatedAt: Date.now() },
                ]
            }
        ];
    }
}

export const fileSystemCore = new FileSystemCore();