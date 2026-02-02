// Copyright (c) 2025 vacui.dev, all rights reserved

import { fileSystem } from '../FileSystem';
import { mockNetwork } from '../MockNetwork';
import { testRegistry } from '../TestRegistry';
import { BenchmarkTestResult, Breadcrumb } from '../../types/testing';

export const registerFileSystemTests = () => {
    testRegistry.registerSuite({
        id: 'os_core',
        name: 'OS Core Services',
        tests: [
            {
                id: 'fs_read_text',
                name: 'FileSystem: Read Text File (Mock)',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'fs_read_text';
                    const name = 'FileSystem: Read Text File (Mock)';
                    let logs = '';
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'FileSystemTests.ts', relevantFunctions: ['readFile'], description: 'Reading OS Config' }];
                    
                    try {
                        logs += "Checking manifest for os_config...\n";
                        const file = fileSystem.getFile('sys', 'os_config');
                        if (!file) throw new Error("Config file not found in manifest");
                        
                        logs += "Reading file content...\n";
                        const content = await fileSystem.readFile(file);
                        if (typeof content !== 'string') throw new Error(`Content type mismatch. Expected string, got ${typeof content}`);
                        
                        logs += "Parsing JSON content...\n";
                        const json = JSON.parse(content);
                        if (!json.theme) throw new Error("Invalid config JSON content: missing 'theme'");
                        
                        logs += "✅ Test Passed.";
                        return { id, name, status: 'PASS', logs, breadcrumbs };
                    } catch (e: any) {
                        logs += `❌ Test Failed: ${e.message}`;
                        return { id, name, status: 'FAIL', logs, breadcrumbs };
                    }
                }
            },
            {
                id: 'fs_read_binary',
                name: 'FileSystem: Read MIDI (Binary Fetch)',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'fs_read_binary';
                    const name = 'FileSystem: Read MIDI (Binary Fetch)';
                    let logs = '';
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'FileSystemTests.ts', relevantFunctions: ['readFile'], description: 'Reading MIDI file' }];

                    try {
                        const file = fileSystem.getFile('os', 'test_midi');
                        if (!file) throw new Error("Test MIDI not found in 'os' folder");
                        
                        logs += "Forcing reload...\n";
                        file.loaded = false;
                        
                        if (!file.isBinary) throw new Error("File not marked as binary");
                        
                        logs += "Fetching binary content...\n";
                        const content = await fileSystem.readFile(file);
                        if (!(content instanceof ArrayBuffer)) throw new Error(`Expected ArrayBuffer, got ${typeof content}`);
                        
                        logs += `Received ${content.byteLength} bytes.\n`;
                        if (content.byteLength === 0) throw new Error("Buffer is empty");
                        
                        logs += "✅ Test Passed.";
                        return { id, name, status: 'PASS', logs, breadcrumbs };
                    } catch (e: any) {
                        logs += `❌ Test Failed: ${e.message}`;
                        return { id, name, status: 'FAIL', logs, breadcrumbs };
                    }
                }
            },
            {
                id: 'fs_read_real_json',
                name: 'FileSystem: Fetch Real JSON (BBS)',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'fs_read_real_json';
                    const name = 'FileSystem: Fetch Real JSON (BBS)';
                    let logs = '';
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'FileSystemTests.ts', relevantFunctions: ['readFile'], description: 'Fetching BBS posts' }];

                    try {
                        const file = fileSystem.getFile('os', 'slop_score');
                        if (!file) throw new Error("Slop Score file not found in 'os' folder");
                        
                        file.loaded = false;
                        file.content = undefined;

                        logs += "Fetching Slop Score...\n";
                        const content = await fileSystem.readFile(file);
                        
                        if (typeof content !== 'string') throw new Error(`Expected string content, got ${typeof content}`);
                        
                        logs += "Parsing JSON...\n";
                        let data;
                        try {
                            data = JSON.parse(content);
                        } catch (e) {
                            throw new Error("Content is not valid JSON");
                        }

                        const analyzed_count = data["meta"]["analyzed_files"];
                        if (analyzed_count < 1) throw new Error("Parsed JSON does not have any analyzed files");

                        const issues = data["issues"];
                        if (!Array.isArray(issues)) throw new Error("Parsed JSON does not have an issues Array");
                        
                        logs += `Analyzed ${analyzed_count} files.\n✅ Test Passed.`;
                        return { id, name, status: 'PASS', logs, breadcrumbs };
                    } catch (e: any) {
                        logs += `❌ Test Failed: ${e.message}`;
                        return { id, name, status: 'FAIL', logs, breadcrumbs };
                    }
                }
            },
            {
                id: 'midi_integrity',
                name: 'MidiEngine: Header Integrity Check',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'midi_integrity';
                    const name = 'MidiEngine: Header Integrity Check';
                    let logs = '';
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'FileSystemTests.ts', relevantFunctions: ['readFile'], description: 'Checking MIDI Header' }];

                    try {
                        const file = fileSystem.getFile('os', 'test_midi');
                        if (!file) throw new Error("File not found in 'os' folder");
                        
                        file.loaded = false;
                        
                        logs += "Fetching MIDI...\n";
                        const buffer = await fileSystem.readFile(file) as ArrayBuffer;
                        
                        const view = new DataView(buffer);
                        const header = view.getUint32(0, false); // Big Endian
                        logs += `Header: 0x${header.toString(16).toUpperCase()}\n`;
                        
                        // Check for 'MThd' (0x4D546864)
                        if (header !== 0x4D546864) { 
                            const hex = header.toString(16);
                            throw new Error(`Invalid MIDI Header. Expected 4D546864 (MThd), got ${hex}`);
                        }
                        logs += "✅ Header Valid (MThd). Test Passed.";
                        return { id, name, status: 'PASS', logs, breadcrumbs };
                    } catch (e: any) {
                        logs += `❌ Test Failed: ${e.message}`;
                        return { id, name, status: 'FAIL', logs, breadcrumbs };
                    }
                }
            },
            {
                id: 'net_404',
                name: 'Network: Handle 404 (Missing File)',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'net_404';
                    const name = 'Network: Handle 404 (Missing File)';
                    let logs = '';
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'FileSystemTests.ts', relevantFunctions: ['mockNetwork.fetch'], description: 'Testing 404' }];

                    try {
                        logs += "Fetching /bad/url.png...\n";
                        await mockNetwork.fetch('/bad/url.png');
                        throw new Error("Should have thrown 404");
                    } catch (e: any) {
                        if (!e.message.includes('404')) {
                            logs += `❌ Unexpected Error: ${e.message}`;
                            return { id, name, status: 'FAIL', logs, breadcrumbs };
                        }
                        logs += `Caught expected error: ${e.message}\n✅ Test Passed.`;
                        return { id, name, status: 'PASS', logs, breadcrumbs };
                    }
                }
            },
            {
                id: 'fs_crud_lifecycle',
                name: 'FileSystem: CRUD Lifecycle (Virtual)',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'fs_crud_lifecycle';
                    const name = 'FileSystem: CRUD Lifecycle (Virtual)';
                    let logs = '';
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'FileSystemTests.ts', relevantFunctions: ['createFile', 'readFile', 'deleteFile'], description: 'CRUD Operations' }];

                    try {
                        const folderId = 'home';
                        const fileName = 'test_automated.txt';
                        const content = 'Hello Virtual World';

                        // 1. Create
                        logs += "Creating file...\n";
                        const file = fileSystem.createFile(folderId, fileName, 'text', content);
                        if (!file) throw new Error("Failed to create file");

                        // 2. Verify Read
                        logs += "Verifying content...\n";
                        const readContent = await fileSystem.readFile(file);
                        if (readContent !== content) throw new Error(`Content mismatch. Expected '${content}', got '${readContent}'`);

                        // 3. Delete
                        logs += "Deleting file...\n";
                        const deleted = fileSystem.deleteFile(folderId, file.id);
                        if (!deleted) throw new Error("Failed to delete file");

                        // 4. Verify Gone
                        logs += "Verifying deletion...\n";
                        const check = fileSystem.getFile(folderId, file.id);
                        if (check) throw new Error("File still exists after deletion");

                        logs += "✅ CRUD Cycle Completed.";
                        return { id, name, status: 'PASS', logs, breadcrumbs };
                    } catch (e: any) {
                        logs += `❌ Test Failed: ${e.message}`;
                        return { id, name, status: 'FAIL', logs, breadcrumbs };
                    }
                }
            }
        ]
    });
};
