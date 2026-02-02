
// Copyright (c) 2025 vacui.dev, all rights reserved

import { PortDefinition } from "../types/nodes";
import { fileSystem } from "./FileSystem";

export interface ProtocolDefinition {
    id: string;
    name: string;
    description: string;
    inputs: PortDefinition[];
    outputs: PortDefinition[];
}

class ProtocolRegistryService {
    private protocols: Map<string, ProtocolDefinition> = new Map();
    private initialized: boolean = false;
    private loadPromise: Promise<void> | null = null;

    constructor() {
        this.init();
    }

    private init() {
        fileSystem.subscribe(() => {
            this.scanFileSystem();
        });
        this.scanFileSystem();
    }

    public register(protocol: ProtocolDefinition) {
        this.protocols.set(protocol.id, protocol);
    }

    public get(id: string): ProtocolDefinition | undefined {
        return this.protocols.get(id);
    }

    public getAll(): ProtocolDefinition[] {
        return Array.from(this.protocols.values());
    }

    public async ensureLoaded() {
        if (this.initialized) return;
        if (!this.loadPromise) {
            this.loadPromise = this.scanFileSystem();
        }
        await this.loadPromise;
    }

    private async scanFileSystem() {
        // Only scan OS folder
        const os = fileSystem.getFolders().find(f => f.id === 'os');
        
        if (os) {
            // Filter for protocol files defined in os/index.json
            const protocolFiles = os.files.filter(f => f.type === 'protocol');
            
            for (const file of protocolFiles) {
                await this.loadProtocolFile(file);
            }
        }

        if (this.protocols.size > 0) {
            this.initialized = true;
        }
    }

    private async loadProtocolFile(file: any) {
        try {
            let content = file.content;
            if (!file.loaded || typeof content !== 'string') {
                content = await fileSystem.readFile(file);
            }
            
            if (typeof content === 'string') {
                const def = JSON.parse(content) as ProtocolDefinition;
                if (def.id && def.inputs && def.outputs) {
                    this.register(def);
                }
            }
        } catch (e) {
            console.warn(`[ProtocolRegistry] Failed to load ${file.name}`, e);
        }
    }
}

export const protocolRegistry = new ProtocolRegistryService();
