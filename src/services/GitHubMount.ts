/**
 * GitHubMount — The Ouroboros Service
 * 
 * This service fetches the repository's own source code from the GitHub API
 * and mounts it as a virtual filesystem drive inside the OS.
 * 
 * The website IS the source code IS the operating system IS the website.
 * 
 * Uses the GitHub Contents API (unauthenticated, 60 req/hr rate limit).
 * For a public repo this is fine — it's a performance piece, not a production system.
 */

import { VirtualFile, VirtualFolder } from '../types/filesystem';
import { fileSystemCore } from './FileSystemCore';

const REPO_OWNER = 'vacui-dev';
const REPO_NAME = 'vacui-dev.github.io';
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

class GitHubMountService {
  private mounted = false;
  private treeCache: GitHubTreeItem[] = [];
  private lastFetch = 0;
  private rateLimitRemaining = 60;

  /**
   * Fetch the full repo tree and mount it as a virtual drive
   */
  async mount(): Promise<VirtualFolder> {
    console.log('[GitHubMount] Mounting own source...');

    try {
      // Get the default branch tree recursively
      const res = await fetch(`${API_BASE}/git/trees/main?recursive=1`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });

      if (!res.ok) {
        throw new Error(`GitHub API: ${res.status} ${res.statusText}`);
      }

      // Track rate limit
      this.rateLimitRemaining = parseInt(res.headers.get('x-ratelimit-remaining') || '60');
      console.log(`[GitHubMount] Rate limit remaining: ${this.rateLimitRemaining}`);

      const data: GitHubTreeResponse = await res.json();
      this.treeCache = data.tree;
      this.lastFetch = Date.now();

      // Convert to virtual files
      const files: VirtualFile[] = data.tree
        .filter(item => item.type === 'blob')
        .map(item => this.treeItemToFile(item));

      // Also add directory entries
      const dirs: VirtualFile[] = data.tree
        .filter(item => item.type === 'tree')
        .map(item => ({
          id: `gh_dir_${item.sha.slice(0, 8)}`,
          name: item.path.split('/').pop() || item.path,
          type: 'folder' as const,
          loaded: true,
          content: `Directory: ${item.path}`,
          updatedAt: Date.now(),
          parentId: this.getParentId(item.path),
          _githubPath: item.path,
          _githubSha: item.sha,
        }));

      const folder: VirtualFolder = {
        id: 'github',
        name: `github/${REPO_NAME}`,
        files: [...dirs, ...files],
        icon: 'github',
      };

      fileSystemCore.mountFolder(folder);
      this.mounted = true;
      console.log(`[GitHubMount] Mounted ${files.length} files, ${dirs.length} directories`);

      return folder;

    } catch (err) {
      console.error('[GitHubMount] Failed to mount:', err);
      // Mount an error placeholder
      const errorFolder: VirtualFolder = {
        id: 'github',
        name: `github/${REPO_NAME}`,
        files: [{
          id: 'gh_error',
          name: 'MOUNT_FAILED.txt',
          type: 'text',
          content: `Failed to mount GitHub source.\n\nError: ${err}\n\nThis is fine. The ouroboros sometimes chokes.`,
          loaded: true,
          updatedAt: Date.now(),
        }],
      };
      fileSystemCore.mountFolder(errorFolder);
      return errorFolder;
    }
  }

  /**
   * Fetch the raw content of a file by its GitHub path
   */
  async fetchFileContent(path: string): Promise<string> {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${path}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.text();
    } catch (err) {
      return `// Failed to fetch: ${path}\n// ${err}`;
    }
  }

  /**
   * Get the raw URL for a file
   */
  getRawUrl(path: string): string {
    return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${path}`;
  }

  /**
   * Get the GitHub web URL for a file
   */
  getWebUrl(path: string): string {
    return `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/${path}`;
  }

  private treeItemToFile(item: GitHubTreeItem): VirtualFile {
    const name = item.path.split('/').pop() || item.path;
    const ext = name.split('.').pop()?.toLowerCase() || '';
    
    let type: VirtualFile['type'] = 'text';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) type = 'image';
    if (['mp3', 'wav', 'ogg', 'mid', 'midi'].includes(ext)) type = 'audio';

    return {
      id: `gh_${item.sha.slice(0, 8)}`,
      name,
      type,
      loaded: false, // Lazy — content fetched on demand
      url: this.getRawUrl(item.path),
      updatedAt: Date.now(),
      parentId: this.getParentId(item.path),
      _githubPath: item.path,
      _githubSha: item.sha,
      _githubSize: item.size,
      _githubWebUrl: this.getWebUrl(item.path),
    };
  }

  private getParentId(path: string): string | undefined {
    const parts = path.split('/');
    if (parts.length <= 1) return undefined;
    parts.pop();
    const parentPath = parts.join('/');
    const parent = this.treeCache.find(i => i.path === parentPath && i.type === 'tree');
    if (parent) return `gh_dir_${parent.sha.slice(0, 8)}`;
    return undefined;
  }

  isMounted() { return this.mounted; }
  getRateLimit() { return this.rateLimitRemaining; }
  getRepoInfo() { return { owner: REPO_OWNER, name: REPO_NAME, api: API_BASE }; }
}

export const githubMount = new GitHubMountService();
