// Copyright (c) 2025 vacui.dev, all rights reserved
//
// GitHubFS — The ouroboros reads its own source.
//
// READS:  raw.githubusercontent.com (no auth required for public repos)
// WRITES: GitHub API → Pull Requests (requires PAT from the user)
//
// The website's virtual filesystem IS the GitHub repo's files/ directory.
// When the OS reads /home/guest/config.json, it fetches:
//   https://raw.githubusercontent.com/vacui-dev/vacui-dev.github.io/main/files/home/guest/config.json
//
// When a user edits a file, the OS creates a branch + commit + PR.
// The repo literally edits itself through its own UI.

export interface GitHubFSConfig {
    owner: string;
    repo: string;
    branch: string;
    basePath: string;  // "files" — the subdirectory in the repo that maps to "/"
    token: string | null;
}

export interface PendingWrite {
    path: string;       // Virtual path, e.g. "/home/guest/scratchpad.md"
    content: string;    // File content
    message: string;    // Commit message
    timestamp: number;
}

interface PRResult {
    success: boolean;
    prUrl?: string;
    prNumber?: number;
    error?: string;
}

const STORAGE_KEY = 'vacui_github_token';
const CONFIG_KEY = 'vacui_github_config';

class GitHubFSService {
    private config: GitHubFSConfig = {
        owner: 'vacui-dev',
        repo: 'vacui-dev.github.io',
        branch: 'main',
        basePath: 'files',
        token: null,
    };

    private listeners: ((config: GitHubFSConfig) => void)[] = [];
    private writeQueue: PendingWrite[] = [];

    constructor() {
        this.loadConfig();
    }

    // ─── CONFIGURATION ──────────────────────────────────────────

    public getConfig(): Readonly<GitHubFSConfig> {
        return { ...this.config };
    }

    public setToken(token: string | null) {
        this.config.token = token;
        this.saveConfig();
        this.notify();
    }

    public updateConfig(partial: Partial<GitHubFSConfig>) {
        Object.assign(this.config, partial);
        this.saveConfig();
        this.notify();
    }

    public isWriteEnabled(): boolean {
        return this.config.token !== null && this.config.token.length > 0;
    }

    public onConfigChange(cb: (config: GitHubFSConfig) => void) {
        this.listeners.push(cb);
        return () => { this.listeners = this.listeners.filter(l => l !== cb); };
    }

    // ─── READ: raw.githubusercontent.com ─────────────────────────
    //
    // Virtual path "/home/guest/config.json" becomes:
    // https://raw.githubusercontent.com/vacui-dev/vacui-dev.github.io/main/files/home/guest/config.json

    public resolveReadUrl(virtualPath: string): string {
        // Strip leading slash
        const clean = virtualPath.startsWith('/') ? virtualPath.slice(1) : virtualPath;
        const { owner, repo, branch, basePath } = this.config;
        return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${basePath}/${clean}`;
    }

    public async readFile(virtualPath: string, isBinary: boolean = false): Promise<Response> {
        const url = this.resolveReadUrl(virtualPath);
        console.log(`[GitHubFS] READ ${virtualPath} → ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`[GitHubFS] ${response.status} ${response.statusText}: ${virtualPath}`);
        }

        return response;
    }

    // ─── WRITE: GitHub API → Pull Requests ──────────────────────
    //
    // Flow:
    // 1. Get HEAD SHA of main branch
    // 2. Create a new branch: vacui-os/edit-{timestamp}
    // 3. Create/update the file on that branch
    // 4. Open a PR from that branch → main
    //
    // The OS edits itself. The ouroboros bites.

    public async writeFile(virtualPath: string, content: string, commitMessage?: string): Promise<PRResult> {
        if (!this.isWriteEnabled()) {
            return {
                success: false,
                error: 'No GitHub token configured. Go to System → GitHub Settings to connect.'
            };
        }

        const clean = virtualPath.startsWith('/') ? virtualPath.slice(1) : virtualPath;
        const repoPath = `${this.config.basePath}/${clean}`;
        const message = commitMessage || `[VACUI OS] Update ${clean}`;
        const branchName = `vacui-os/edit-${Date.now()}`;

        try {
            // 1. Get the SHA of the base branch HEAD
            const baseSha = await this.getBranchSha(this.config.branch);

            // 2. Create a new branch from HEAD
            await this.createBranch(branchName, baseSha);

            // 3. Get the current file SHA (if it exists, needed for updates)
            let fileSha: string | undefined;
            try {
                fileSha = await this.getFileSha(repoPath, branchName);
            } catch {
                // File doesn't exist yet — that's fine, it's a create
            }

            // 4. Create or update the file on the new branch
            await this.commitFile(repoPath, content, message, branchName, fileSha);

            // 5. Open a PR
            const pr = await this.createPR(
                `${message}`,
                branchName,
                this.config.branch,
                `Automated edit from VACUI OS.\n\n**Path:** \`${repoPath}\`\n**Time:** ${new Date().toISOString()}\n\n_The ouroboros edits itself._`
            );

            console.log(`[GitHubFS] PR created: ${pr.html_url}`);

            return {
                success: true,
                prUrl: pr.html_url,
                prNumber: pr.number,
            };
        } catch (e: any) {
            console.error('[GitHubFS] Write failed:', e);
            return {
                success: false,
                error: e.message || 'Unknown GitHub API error',
            };
        }
    }

    // Queue a write for batch PR (multiple files in one PR)
    public queueWrite(virtualPath: string, content: string, message: string) {
        this.writeQueue.push({
            path: virtualPath,
            content,
            message,
            timestamp: Date.now(),
        });
    }

    public async flushWriteQueue(prTitle?: string): Promise<PRResult> {
        if (this.writeQueue.length === 0) {
            return { success: false, error: 'Nothing in the write queue' };
        }
        if (!this.isWriteEnabled()) {
            return { success: false, error: 'No GitHub token configured.' };
        }

        const queue = [...this.writeQueue];
        this.writeQueue = [];

        const branchName = `vacui-os/batch-${Date.now()}`;
        const title = prTitle || `[VACUI OS] Batch update (${queue.length} files)`;

        try {
            const baseSha = await this.getBranchSha(this.config.branch);
            await this.createBranch(branchName, baseSha);

            for (const item of queue) {
                const clean = item.path.startsWith('/') ? item.path.slice(1) : item.path;
                const repoPath = `${this.config.basePath}/${clean}`;

                let fileSha: string | undefined;
                try {
                    fileSha = await this.getFileSha(repoPath, branchName);
                } catch { /* new file */ }

                await this.commitFile(repoPath, item.content, item.message, branchName, fileSha);
            }

            const body = queue.map(q => `- \`${q.path}\` — ${q.message}`).join('\n');
            const pr = await this.createPR(
                title,
                branchName,
                this.config.branch,
                `Batch edit from VACUI OS.\n\n${body}\n\n_The ouroboros edits itself._`
            );

            return { success: true, prUrl: pr.html_url, prNumber: pr.number };
        } catch (e: any) {
            // Put failed items back in queue
            this.writeQueue.unshift(...queue);
            return { success: false, error: e.message };
        }
    }

    public getWriteQueue(): ReadonlyArray<PendingWrite> {
        return this.writeQueue;
    }

    // ─── GITHUB API PRIMITIVES ──────────────────────────────────

    private async api(endpoint: string, options: RequestInit = {}): Promise<any> {
        const url = `https://api.github.com${endpoint}`;
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(options.headers as Record<string, string> || {}),
        };

        if (this.config.token) {
            headers['Authorization'] = `Bearer ${this.config.token}`;
        }

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`GitHub API ${response.status}: ${body}`);
        }

        return response.json();
    }

    private async getBranchSha(branch: string): Promise<string> {
        const { owner, repo } = this.config;
        const data = await this.api(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
        return data.object.sha;
    }

    private async createBranch(branchName: string, fromSha: string): Promise<void> {
        const { owner, repo } = this.config;
        await this.api(`/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            body: JSON.stringify({
                ref: `refs/heads/${branchName}`,
                sha: fromSha,
            }),
        });
    }

    private async getFileSha(path: string, branch: string): Promise<string> {
        const { owner, repo } = this.config;
        const data = await this.api(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
        return data.sha;
    }

    private async commitFile(
        path: string,
        content: string,
        message: string,
        branch: string,
        existingSha?: string,
    ): Promise<void> {
        const { owner, repo } = this.config;
        const body: any = {
            message,
            content: btoa(unescape(encodeURIComponent(content))),
            branch,
        };
        if (existingSha) {
            body.sha = existingSha;
        }

        await this.api(`/repos/${owner}/${repo}/contents/${path}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    private async createPR(title: string, head: string, base: string, body: string): Promise<any> {
        const { owner, repo } = this.config;
        return this.api(`/repos/${owner}/${repo}/pulls`, {
            method: 'POST',
            body: JSON.stringify({ title, head, base, body }),
        });
    }

    // ─── PERSISTENCE ────────────────────────────────────────────

    private loadConfig() {
        try {
            const saved = localStorage.getItem(CONFIG_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
            }
            const token = localStorage.getItem(STORAGE_KEY);
            if (token) {
                this.config.token = token;
            }
        } catch {
            // Fresh start
        }
    }

    private saveConfig() {
        try {
            const { token, ...rest } = this.config;
            localStorage.setItem(CONFIG_KEY, JSON.stringify(rest));
            if (token) {
                localStorage.setItem(STORAGE_KEY, token);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {
            // localStorage might not be available
        }
    }

    private notify() {
        this.listeners.forEach(cb => cb(this.config));
    }
}

export const githubFS = new GitHubFSService();
