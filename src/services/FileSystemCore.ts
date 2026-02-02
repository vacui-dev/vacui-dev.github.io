// Core filesystem — in-memory virtual FS with subscriber pattern

import { VirtualFile, VirtualFolder } from '../types/filesystem';

class FileSystemCore {
  private folders: VirtualFolder[] = [];
  private subscribers: Set<() => void> = new Set();
  private currentUser: string = 'guest';

  constructor() {
    // Initialize default folders
    this.folders = [
      { id: 'home', name: 'Home', files: [] },
      { id: 'os', name: 'System', files: [] },
      { id: 'sims', name: 'Simulations', files: [] },
      { id: 'textures', name: 'Textures', files: [] },
      { id: 'materials', name: 'Materials', files: [] },
    ];
  }

  getFolders(): VirtualFolder[] {
    return this.folders;
  }

  getFile(folderId: string, fileId: string): VirtualFile | undefined {
    const folder = this.folders.find(f => f.id === folderId);
    return folder?.files.find(f => f.id === fileId);
  }

  async readFile(file: VirtualFile): Promise<any> {
    if (file.loaded && file.content !== undefined) {
      return file.content;
    }
    if (file.url) {
      const res = await fetch(file.url);
      const content = await res.text();
      file.content = content;
      file.loaded = true;
      return content;
    }
    return '';
  }

  updateFileContent(folderId: string, fileId: string, content: any) {
    const folder = this.folders.find(f => f.id === folderId);
    if (!folder) return;
    const file = folder.files.find(f => f.id === fileId);
    if (file) {
      file.content = content;
      file.updatedAt = Date.now();
      this.notify();
    }
  }

  removeFile(folderId: string, fileId: string): boolean {
    const folder = this.folders.find(f => f.id === folderId);
    if (!folder) return false;
    const idx = folder.files.findIndex(f => f.id === fileId);
    if (idx === -1) return false;
    folder.files.splice(idx, 1);
    this.notify();
    return true;
  }

  addFileToFolder(folderId: string, file: VirtualFile, _priority?: number) {
    const folder = this.folders.find(f => f.id === folderId);
    if (!folder) return;
    folder.files.push(file);
    this.notify();
  }

  mountFolder(folder: VirtualFolder) {
    const existing = this.folders.findIndex(f => f.id === folder.id);
    if (existing >= 0) {
      this.folders[existing] = folder;
    } else {
      this.folders.push(folder);
    }
    this.notify();
  }

  unmountFolder(folderId: string) {
    this.folders = this.folders.filter(f => f.id !== folderId);
    this.notify();
  }

  getCurrentUser() { return this.currentUser; }

  login(userId: string, _password: string) {
    this.currentUser = userId;
    this.notify();
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach(cb => cb());
  }
}

export const fileSystemCore = new FileSystemCore();
