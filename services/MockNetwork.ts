// Copyright (c) 2025 vacui.dev, all rights reserved

import { FILE_DATA } from '../files';
import { DictionaryBucket } from './WordlessDictionary';
import { githubFS } from './GitHubFS';

/**
 * MockNetwork
 * 
 * The nervous system of the virtual filesystem.
 * 
 * ROUTING PRIORITY:
 *   1. In-memory routes (bundled simulations, procedural dictionary)
 *   2. GitHubFS → raw.githubusercontent.com (the repo IS the filesystem)
 *   3. Dead letter — 404
 *
 * The website reads its own source code from GitHub.
 * It is its own filesystem. The ouroboros compiles.
 */
class MockNetworkService {
    
    // Simulate network latency for in-memory routes (ms)
    // GitHub fetches have their own natural latency
    private inMemoryLatency = 50;

    // Virtual Symlinks / Aliases
    private symlinks: Record<string, string> = {
        '/simulations/neural_hydraulics.ts': '/sims/neural_hydraulics.sim',
        '/simulations/alchemist_lab.ts': '/sims/alchemist_lab.sim',
        '/simulations/chronos_skeleton.ts': '/sims/chronos_skeleton.sim',
        '/simulations/flappy_genesis.ts': '/sims/flappy_genesis.sim',
        '/simulations/mech_battle.ts': '/sims/mech_battle.sim',
        '/simulations/architect_sanctum.ts': '/sims/architect_sanctum.sim',
    };

    public async fetch(url: string): Promise<Response> {
        // --- SYMLINK RESOLUTION ---
        if (this.symlinks[url]) {
            console.log(`[MockNetwork] Symlink: ${url} → ${this.symlinks[url]}`);
            url = this.symlinks[url];
        }

        // 1. In-memory routes (bundled data, procedural generation)
        const mockResponse = this.route(url);
        if (mockResponse) {
            // Simulate a tiny delay for in-memory routes to keep UI responsive
            await this.sleep(this.inMemoryLatency);
            return mockResponse;
        }

        // 2. GitHub raw content — the repo IS the filesystem
        try {
            console.log(`[MockNetwork] GitHub fetch: ${url}`);
            const isBinary = this.isBinaryPath(url);
            const response = await githubFS.readFile(url, isBinary);
            return response;
        } catch (e: any) {
            console.error(`[MockNetwork] Fetch failed for ${url}:`, e.message);
            throw new Error(`404 Not Found: ${url} — ${e.message}`);
        }
    }

    private route(url: string): Response | null {
        // --- ROUTING TABLE ---
        
        // 1. Grandfathered JSON/Text Data (Simulations bundled at compile time)
        if (url === '/sims/chronos_skeleton.sim') return this.jsonResponse(FILE_DATA.simulations.chronos_skeleton);
        if (url === '/sims/alchemist_lab.sim') return this.jsonResponse(FILE_DATA.simulations.alchemist_lab);
        if (url === '/sims/neural_hydraulics.sim') return this.jsonResponse(FILE_DATA.simulations.neural_hydraulics);
        if (url === '/sims/flappy_genesis.sim') return this.jsonResponse(FILE_DATA.simulations.flappy_genesis);
        if (url === '/sims/mech_battle.sim') return this.jsonResponse(FILE_DATA.simulations.mech_battle);
        if (url === '/sims/architect_sanctum.sim') return this.jsonResponse(FILE_DATA.simulations.architect_sanctum);

        // 2. Dictionary Shards (Procedural Generation)
        if (url.startsWith('/dictionary/c_')) {
            const bucketIdStr = url.replace('/dictionary/c_', '').replace('.json', '');
            const bucketId = parseInt(bucketIdStr, 10);
            
            if (!isNaN(bucketId)) {
                return this.jsonResponse(this.generateMockBucket(bucketId));
            }
        }

        return null;
    }

    private jsonResponse(data: any): Response {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        return new Response(blob);
    }

    private isBinaryPath(url: string): boolean {
        const ext = url.split('.').pop()?.toLowerCase() || '';
        return ['mid', 'midi', 'png', 'jpg', 'jpeg', 'gif', 'wav', 'mp3', 'ogg', 'woff', 'woff2'].includes(ext);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private generateMockBucket(bucketId: number): DictionaryBucket {
        const startId = bucketId * 1000;
        const concepts: Record<string, any> = {};
        const count = 5;
        
        for(let i=0; i<count; i++) {
            const offset = Math.floor(Math.random() * 1000);
            const id = startId + offset;
            const fullId = `ILI§${id}`;
            
            concepts[fullId] = {
                id: fullId,
                label: `Concept ${id}`,
                pos: i % 2 === 0 ? 'n' : 'v',
                definition: `Auto-generated definition for concept ${id} residing in bucket ${bucketId}.`,
                wordlessString: `⟨┤${fullId}:concept_${id}├⟩→⟨┤ILI§35545:entity├⟩`
            };
        }

        return {
            id: bucketId,
            concepts
        };
    }
}

export const mockNetwork = new MockNetworkService();
