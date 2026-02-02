// Copyright (c) 2025 vacui.dev, all rights reserved

import { WorldConfig } from "../types/simulation";

type SimulationFile = any;
type SchemaVersion = '1.0' | '1.1';

/**
 * Simulation I/O Service
 * Handles the serialization, versioning, and migration of .sim files.
 * Allows the Genesis Engine to share states across the internet.
 */
class SimulationIOService {
    private currentVersion: SchemaVersion = '1.0';
    private engineVersion: string = '2.2.0';

    /**
     * Packaging: Wraps the raw WorldConfig in a robust, versioned envelope.
     */
    public createPackage(config: WorldConfig, name: string): SimulationFile {
        return {
            header: {
                schemaVersion: this.currentVersion,
                timestamp: Date.now(),
                name: name,
                author: 'Genesis_Instance', // Could be dynamic if we add Auth
                engineVersion: this.engineVersion
            },
            config: config
        };
    }

    /**
     * Unpacking: Validates and migrates older versions if necessary.
     */
    public async parseFile(file: File): Promise<WorldConfig> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const raw = e.target?.result as string;
                    const data = JSON.parse(raw);
                    
                    if (!this.isValidSimulationFile(data)) {
                        const rawData = data as any;
                        // Fallback: Try to detect if it's a raw config from older versions
                        if (rawData.entities && rawData.gravity) {
                            console.warn("Legacy Format Detected: Upgrading to v1.0");
                            resolve(rawData as WorldConfig);
                            return;
                        }
                        throw new Error("Invalid .sim file format");
                    }

                    // Migration Logic (Scaffold for future versions)
                    const migratedConfig = this.migrate(data);
                    resolve(migratedConfig);
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error("File Read Error"));
            reader.readAsText(file);
        });
    }

    /**
     * Browser Download Trigger
     */
    public triggerDownload(simFile: SimulationFile) {
        const blob = new Blob([JSON.stringify(simFile, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Sanitize name for filename
        const safeName = simFile.header.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `${safeName}.sim`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    private isValidSimulationFile(data: any): data is SimulationFile {
        return data && data.header && data.config && data.header.schemaVersion;
    }

    private migrate(file: SimulationFile): WorldConfig {
        const { header, config } = file;
        
        // Example Migration Pattern:
        // if (header.schemaVersion === '0.9') { 
        //    return transformV09toV1(config); 
        // }

        return config;
    }
}

export const simulationIO = new SimulationIOService();