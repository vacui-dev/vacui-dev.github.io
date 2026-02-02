// Copyright (c) 2025 vacui.dev, all rights reserved

import { VirtualFile, VirtualFolder } from "../types/filesystem";
import { ReflectiveSystem } from "../types/legacy";
import { fileSystemCore } from "./FileSystemCore";
import { simulationIO } from "./SimulationIO";

type SystemMethod = any;

class FileSystemService implements ReflectiveSystem {
    public readonly systemId = 'file_system';
    public readonly description = 'Virtual Hierarchical Storage System. Manages simulated files and lazy-loaded assets.';

    // --- REFLECTION ACCESSORS ---
    public get reflection(): Record<string, SystemMethod> {
        return {
            ls: {
                name: 'ls',
                description: 'List all folders and their contained files.',
                params: [],
                handler: () => {
                    return this.getFolders().map(f => ({
                        folder: f.name,
                        id: f.id,
                        files: f.files.map(file => ({ name: file.name, id: file.id, type: file.type }))
                    }));
                }
            },
            read: {
                name: 'read',
                description: 'Read content of a specific file. Arguments: [folderId, fileId].',
                params: ['folderId', 'fileId'],
                handler: async (args) => {
                    const [folderId, fileId] = args;
                    const file = this.getFile(folderId, fileId);
                    if (!file) return `Error: File '${fileId}' not found in '${folderId}'.`;
                    
                    try {
                        const content = await this.readFile(file);
                        if (file.isBinary) return `[Binary Data: ${content.byteLength} bytes]`;
                        return content;
                    } catch (e: any) {
                        return `Error reading file: ${e.message}`;
                    }
                }
            },
            write: {
                name: 'write',
                description: 'Write content to a text file. Arguments: [folderId, fileId, content].',
                params: ['folderId', 'fileId', 'content'],
                handler: (args) => {
                    const [folderId, fileId, content] = args;
                    this.saveFile(folderId, fileId, content);
                    return `File ${folderId}/${fileId} updated.`;
                }
            },
            touch: {
                name: 'touch',
                description: 'Create a new file. Arguments: [folderId, name, type].',
                params: ['folderId', 'name', 'type'],
                handler: (args) => {
                    const [folderId, name, type] = args;
                    this.createFile(folderId, name, type as any);
                    return `File ${name} created in ${folderId}.`;
                }
            },
            rm: {
                name: 'rm',
                description: 'Delete a file. Arguments: [folderId, fileId].',
                params: ['folderId', 'fileId'],
                handler: (args) => {
                    const [folderId, fileId] = args;
                    const success = this.deleteFile(folderId, fileId);
                    return success ? `File ${fileId} deleted.` : `Error: Could not delete file.`;
                }
            },
            duplicate: {
                name: 'duplicate',
                description: 'Duplicate a file. Arguments: [folderId, fileId].',
                params: ['folderId', 'fileId'],
                handler: (args) => {
                    const [folderId, fileId] = args;
                    const newFile = this.duplicateFile(folderId, fileId);
                    return newFile ? `File duplicated as ${newFile.name}` : `Error: Could not duplicate file.`;
                }
            },
            whoami: {
                name: 'whoami',
                description: 'Get current user ID.',
                params: [],
                handler: () => this.getCurrentUser()
            }
        };
    }

    // --- PROXIED METHODS (CORE) ---

    public getFolders() { return fileSystemCore.getFolders(); }
    
    public getFile(folderId: string, fileId: string) { return fileSystemCore.getFile(folderId, fileId); }

    public readFile(file: VirtualFile) { return fileSystemCore.readFile(file); }

    public saveFile(folderId: string, fileId: string, content: any) {
        fileSystemCore.updateFileContent(folderId, fileId, content);
    }

    public deleteFile(folderId: string, fileId: string) {
        return fileSystemCore.removeFile(folderId, fileId);
    }

    public subscribe(callback: () => void) { return fileSystemCore.subscribe(callback); }

    public mountFolder(folder: VirtualFolder) { fileSystemCore.mountFolder(folder); }
    
    public unmountFolder(folderId: string) { fileSystemCore.unmountFolder(folderId); }

    public getCurrentUser() { return fileSystemCore.getCurrentUser(); }

    public login(u: string, p: string) { return fileSystemCore.login(u, p); }

    // --- HIGH-LEVEL UTILITIES ---

    public duplicateFile(folderId: string, fileId: string): VirtualFile | undefined {
        const folder = this.getFolders().find(f => f.id === folderId);
        if (!folder) return undefined;
        const file = folder.files.find(f => f.id === fileId);
        if (!file) return undefined;

        let newName = file.name;
        const parts = file.name.split('.');
        let ext = '';
        let base = file.name;
        if (parts.length > 1) {
            ext = '.' + parts.pop();
            base = parts.join('.');
        }
        
        let counter = 1;
        while (true) {
            newName = `${base} copy${counter > 1 ? ` ${counter}` : ''}${ext}`;
            if (!folder.files.some(f => f.name === newName && f.parentId === file.parentId)) break;
            counter++;
        }

        const newFile: VirtualFile = {
            ...file,
            id: `file_${Date.now()}_${Math.floor(Math.random()*10000)}`,
            name: newName,
            updatedAt: Date.now()
        };
        
        if (file.content && typeof file.content === 'object') {
             if (file.content instanceof ArrayBuffer) {
                 newFile.content = file.content.slice(0);
             } else {
                 newFile.content = JSON.parse(JSON.stringify(file.content));
             }
        }

        fileSystemCore.addFileToFolder(folderId, newFile, 0.1);
        return newFile;
    }

    public createFile(folderId: string, name: string, type: VirtualFile['type'] = 'text', content: any = '', parentId?: string): VirtualFile | undefined {
        const folder = this.getFolders().find(f => f.id === folderId);
        if (!folder) return undefined;
        
        const initialContent = content || (type === 'sheet' ? JSON.stringify({ columns: ['A', 'B', 'C'], rows: [['','','']] }) : '');
        
        const newFile: VirtualFile = {
            id: `file_${Date.now()}`, name, type,
            content: initialContent,
            loaded: true,
            updatedAt: Date.now(),
            parentId: parentId
        };
        
        fileSystemCore.addFileToFolder(folderId, newFile, 1.0);
        return newFile;
    }

    public async importFileFromUrl(url: string, destFolderId: string = 'home', parentId?: string): Promise<VirtualFile> {
        try {
            new URL(url); // Validate

            console.log(`[FileSystem] Downloading ${url}...`);
            let res;
            try {
                res = await fetch(url);
            } catch (e: any) {
                throw new Error(`Network Error: ${e.message}. CORS issue likely.`);
            }
            
            if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
            
            const blob = await res.blob();
            const urlParts = url.split('/');
            let name = urlParts[urlParts.length - 1].split('?')[0];
            if (!name) name = `download_${Date.now()}`;
            
            let type: VirtualFile['type'] = 'text';
            let isBinary = false;
            const mime = blob.type;

            if (mime.startsWith('image/')) {
                type = 'image';
            } else if (mime.startsWith('audio/') || name.match(/\.(mid|midi|wav|mp3|ogg)$/i)) {
                type = 'audio';
                isBinary = true;
            } else if (name.match(/\.(sim|json)$/i)) {
                 if (name.endsWith('.sim')) type = 'simulation';
                 else type = 'text';
            } else if (mime.startsWith('text/') || name.match(/\.(txt|md|js|ts|py|glsl|verse)$/i)) {
                type = 'text';
            } else {
                isBinary = true;
            }

            let content: any;
            if (type === 'image') {
                 content = await new Promise((resolve) => {
                     const reader = new FileReader();
                     reader.onload = () => resolve(reader.result);
                     reader.readAsDataURL(blob);
                 });
            } else if (isBinary) {
                content = await blob.arrayBuffer();
            } else {
                content = await blob.text();
            }

            const folder = this.getFolders().find(f => f.id === destFolderId) || this.getFolders().find(f => f.id === 'home');
            if (!folder) throw new Error("Destination folder not found");

            if (folder.files.some(f => f.name === name && f.parentId === parentId)) {
                name = `${Date.now()}_${name}`;
            }

            const newFile: VirtualFile = {
                id: `web_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                name,
                type,
                content,
                loaded: true,
                isBinary,
                updatedAt: Date.now(),
                parentId: parentId
            };

            fileSystemCore.addFileToFolder(folder.id, newFile, 0.5);
            return newFile;

        } catch (e: any) {
            console.error("Import Failed", e);
            throw e;
        }
    }

    public async ingestFile(file: File, destinationId?: string, parentId?: string) {
        try {
            let content: any = "";
            let type: VirtualFile['type'] = 'text';
            let isBinary = false;
            let targetFolderId = 'home';

            if (file.type.startsWith('image/')) {
                content = await this.readAsDataURL(file);
                type = 'image';
                targetFolderId = 'textures';
            } else if (file.type.startsWith('audio/') || file.name.endsWith('.mid')) {
                content = await file.arrayBuffer();
                type = 'audio';
                isBinary = true;
                targetFolderId = 'os'; 
            } else if (file.name.endsWith('.sim')) {
                const config = await simulationIO.parseFile(file);
                content = JSON.stringify(config);
                type = 'simulation';
                targetFolderId = 'sims';
            } else if (file.name.endsWith('.mat') || file.name.endsWith('.glsl')) {
                content = await file.text();
                type = file.name.endsWith('.mat') ? 'material' : 'shader';
                targetFolderId = 'materials';
            } else {
                content = await file.text();
            }

            if (destinationId) {
                const exists = this.getFolders().find(f => f.id === destinationId);
                if (exists) targetFolderId = destinationId;
            }

            const targetFolder = this.getFolders().find(f => f.id === targetFolderId) || this.getFolders().find(f => f.id === 'home');
            if (targetFolder) {
                let finalName = file.name;
                if (targetFolder.files.some(f => f.name === finalName && f.parentId === parentId)) {
                    finalName = `${Date.now()}_${file.name}`;
                }

                const newFile: VirtualFile = {
                    id: `import_${Date.now()}_${file.name.replace(/\W/g, '_')}`, 
                    name: finalName, 
                    type, 
                    content,
                    loaded: true,
                    isBinary,
                    updatedAt: Date.now(),
                    parentId: parentId
                };
                
                fileSystemCore.addFileToFolder(targetFolder.id, newFile, 0.8);
            }
        } catch(e) { console.error("Ingestion Failed", e); }
    }

    private readAsDataURL(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

export const fileSystem = new FileSystemService();