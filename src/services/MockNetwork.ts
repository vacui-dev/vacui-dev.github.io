// Copyright (c) 2025 vacui.dev, all rights reserved

import { FILE_DATA } from '../files';
import { DictionaryBucket } from './WordlessDictionary';

/**
 * MockNetwork
 * Acts as the "Internet" or "File Server" for the simulation.
 * Intercepts URLs and returns data as if it were a real fetch request.
 */
class MockNetworkService {
    
    // Simulate network latency (ms)
    private latency = 150;

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
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                // 1. Attempt to route internally (Mock Data)
                const mockResponse = this.route(url);
                if (mockResponse) {
                    resolve(mockResponse);
                    return;
                }

                // 2. Fallback to Real Network (Static Files)
                // We assume the "virtual" path (e.g., /bbs/posts.json) maps 
                // to the "files" directory in the project root.
                // If path starts with /simulations/, it's a static file in files/simulations/
                let realPath = `files${url}`;
                try {
                    const response = await window.fetch(realPath);
                    if (!response.ok) {
                        reject(new Error(`404 Not Found: ${url} (tried ${realPath})`));
                    } else {
                        resolve(response);
                    }
                } catch (e) {
                    reject(e);
                }
            }, this.latency);
        });
    }

    private route(url: string): Response | null {
        // --- SYMLINK RESOLUTION ---
        if (this.symlinks[url]) {
            console.log(`[MockNetwork] Symlink redirected: ${url} -> ${this.symlinks[url]}`);
            url = this.symlinks[url];
        }

        // --- ROUTING TABLE ---
        
        // 1. Grandfathered JSON/Text Data (Simulations as Objects)
        if (url === '/sims/chronos_skeleton.sim') return this.jsonResponse(FILE_DATA.simulations.chronos_skeleton);
        if (url === '/sims/alchemist_lab.sim') return this.jsonResponse(FILE_DATA.simulations.alchemist_lab);
        if (url === '/sims/neural_hydraulics.sim') return this.jsonResponse(FILE_DATA.simulations.neural_hydraulics);
        if (url === '/sims/flappy_genesis.sim') return this.jsonResponse(FILE_DATA.simulations.flappy_genesis);
        if (url === '/sims/mech_battle.sim') return this.jsonResponse(FILE_DATA.simulations.mech_battle);
        if (url === '/sims/architect_sanctum.sim') return this.jsonResponse(FILE_DATA.simulations.architect_sanctum);

        // 2. Dictionary Shards (Procedural Generation for Wordless Dictionary Demo)
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