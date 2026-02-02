// Copyright (c) 2025 vacui.dev, all rights reserved

import { fileSystemCore } from "./FileSystemCore";
import { VirtualFolder, VirtualFile } from "../types/filesystem";

interface PendingRequest {
    resolve: (data: any) => void;
    reject: (err: any) => void;
}

export interface BridgeMountConfig {
    id: string;
    type: 'local' | 'ssh' | 'smb';
    name: string;
    config: Record<string, any>; // host, user, pass, path, etc.
}

class LocalFileSystemBridgeService {
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private listeners: ((status: boolean) => void)[] = [];
    private pendingReads: Map<string, PendingRequest> = new Map();
    private activeMounts: BridgeMountConfig[] = [];

    public connect(url: string = 'ws://localhost:8081') {
        if (this.ws) this.ws.close();

        try {
            console.log(`[LocalBridge] Connecting to ${url}...`);
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.isConnected = true;
                this.notifyStatus();
                this.send({ type: 'HANDSHAKE' });
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.notifyStatus();
                this.unmountAll();
            };

            this.ws.onerror = (e) => {
                console.error("[LocalBridge] Connection Error", e);
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this.handleMessage(msg);
                } catch (e) {
                    console.error("[LocalBridge] Invalid message", e);
                }
            };

        } catch (e) {
            console.error("[LocalBridge] Failed to connect", e);
        }
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    public getStatus() {
        return this.isConnected;
    }

    public onStatusChange(cb: (status: boolean) => void) {
        this.listeners.push(cb);
        return () => { this.listeners = this.listeners.filter(l => l !== cb); };
    }

    // --- CONFIGURATION API ---

    public addMount(mount: BridgeMountConfig) {
        this.send({
            type: 'ADD_MOUNT',
            payload: mount
        });
        this.activeMounts.push(mount);
    }

    public removeMount(mountId: string) {
        this.send({
            type: 'REMOVE_MOUNT',
            payload: { id: mountId }
        });
        this.activeMounts = this.activeMounts.filter(m => m.id !== mountId);
        fileSystemCore.unmountFolder(mountId);
    }

    public getActiveMounts() {
        return this.activeMounts;
    }

    // --- I/O API ---

    public async readFile(remotePath: string): Promise<ArrayBuffer | string> {
        if (!this.isConnected) throw new Error("Local Bridge not connected");

        return new Promise((resolve, reject) => {
            const reqId = `req_${Date.now()}_${Math.random()}`;
            this.pendingReads.set(reqId, { resolve, reject });
            
            this.send({
                type: 'READ',
                requestId: reqId,
                path: remotePath
            });

            setTimeout(() => {
                if (this.pendingReads.has(reqId)) {
                    this.pendingReads.delete(reqId);
                    reject(new Error("Read timeout from local bridge"));
                }
            }, 10000); // 10s timeout for network reads
        });
    }

    private send(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    private unmountAll() {
        this.activeMounts.forEach(m => fileSystemCore.unmountFolder(m.id));
        this.activeMounts = [];
    }

    private handleMessage(msg: any) {
        switch (msg.type) {
            case 'MOUNT_UPDATE':
                this.handleMountUpdate(msg.mountId, msg.rootName, msg.structure);
                break;
            case 'CONTENT':
                this.handleContent(msg.requestId, msg.data, msg.isBinary);
                break;
            case 'ERROR':
                this.handleError(msg.requestId, msg.message);
                break;
        }
    }

    private handleMountUpdate(mountId: string, rootName: string, structure: any[]) {
        console.log(`[LocalBridge] Mounting ${rootName} (${mountId})`);
        
        const files: VirtualFile[] = [];
        
        // Recursive flattener that preserves hierarchy via parentId
        // The structure from python is a tree: { name, path, type, children? }
        
        const processNode = (node: any, parentId: string) => {
            // We use the mountId + path hash as ID to ensure uniqueness across mounts
            const id = `${mountId}_${node.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
            
            if (node.type === 'directory') {
                files.push({
                    id,
                    name: node.name,
                    type: 'folder',
                    loaded: true,
                    updatedAt: Date.now(),
                    parentId: parentId,
                    readOnly: true
                });
                if (node.children) {
                    node.children.forEach((child: any) => processNode(child, id));
                }
            } else {
                const ext = node.name.split('.').pop()?.toLowerCase();
                let type: VirtualFile['type'] = 'text';
                let isBinary = false;

                if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) type = 'image';
                else if (['mp3', 'wav', 'ogg', 'mid'].includes(ext)) { type = 'audio'; isBinary = true; }
                else if (['json', 'sim'].includes(ext)) type = 'simulation';
                else if (['md', 'txt', 'py', 'js', 'ts', 'tsx'].includes(ext)) type = 'text';
                else { type = 'text'; isBinary = true; }

                // The remotePath must include the mountId so the bridge knows which handler to use
                // Format: "mountId::actual/path/on/disk"
                const namespacedPath = `${mountId}::${node.path}`;

                files.push({
                    id,
                    name: node.name,
                    type,
                    loaded: false,
                    updatedAt: Date.now(),
                    parentId: parentId,
                    remoteSource: 'local_bridge',
                    remotePath: namespacedPath, 
                    isBinary: isBinary || type === 'image'
                });
            }
        };

        // If structure is empty or root is just a container
        // Structure is usually [rootNode] or [arrayOfNodes]
        if (Array.isArray(structure)) {
            structure.forEach(node => processNode(node, mountId)); // Top level nodes parent is the folder ID
        }

        const folder: VirtualFolder = {
            id: mountId,
            name: rootName, // e.g., "NAS (192.168.1.50)"
            files: files
        };

        fileSystemCore.mountFolder(folder);
    }

    private handleContent(requestId: string, base64Data: string, isBinary: boolean) {
        const req = this.pendingReads.get(requestId);
        if (req) {
            try {
                const binaryString = atob(base64Data);
                if (isBinary) {
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
                    req.resolve(bytes.buffer);
                } else {
                    const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
                    const decoder = new TextDecoder('utf-8');
                    req.resolve(decoder.decode(bytes));
                }
            } catch (e) {
                req.reject(e);
            }
            this.pendingReads.delete(requestId);
        }
    }

    private handleError(requestId: string, message: string) {
        const req = this.pendingReads.get(requestId);
        if (req) {
            req.reject(new Error(message));
            this.pendingReads.delete(requestId);
        }
    }

    private notifyStatus() {
        this.listeners.forEach(cb => cb(this.isConnected));
    }
}

export const localFileSystemBridge = new LocalFileSystemBridgeService();