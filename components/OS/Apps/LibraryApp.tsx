// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useRef, useEffect } from 'react';
import { hyperSpace } from '../../../services/HyperSpace';
import { fileSystem } from '../../../services/FileSystem';
import { Database, Plus, Upload } from 'lucide-react';

export const LibraryApp: React.FC = () => {
    const [libs, setLibs] = useState(hyperSpace.getLibraries());
    const [path, setPath] = useState('http://localhost:8000/data.parquet');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsub = hyperSpace.subscribe(() => setLibs([...hyperSpace.getLibraries()]));
        return unsub;
    }, []);

    const handleMount = () => {
        hyperSpace.addLibrary("Local_Parquet_Store", path);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            fileSystem.ingestFile(e.target.files[0]);
        }
    };

    return (
        <div className="p-4 space-y-4 font-mono">
            <div className="p-4 rounded border" style={{ borderColor: 'var(--outline-color)', background: 'rgba(255,255,255,0.05)' }}>
                <div className="text-xs font-bold opacity-70 mb-2">MOUNT NEW DATASOURCE</div>
                <div className="flex gap-2">
                    <input 
                        className="flex-1 border rounded px-2 py-1 text-xs"
                        style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'var(--outline-color)', color: 'var(--text-color)' }}
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        placeholder="Endpoint URL"
                    />
                    <button 
                        onClick={handleMount}
                        className="text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                        style={{ background: 'var(--primary-color)' }}
                    >
                        <Plus className="w-3 h-3" /> MOUNT
                    </button>
                </div>
            </div>

            <div className="p-4 rounded border" style={{ borderColor: 'var(--outline-color)', background: 'rgba(255,255,255,0.05)' }}>
                 <div className="text-xs font-bold opacity-70 mb-2">IMPORT SIMULATION</div>
                 <div className="flex gap-2 items-center">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-white px-3 py-1 rounded text-xs flex items-center gap-1 w-full justify-center"
                        style={{ background: 'var(--secondary-color)' }}
                    >
                        <Upload className="w-3 h-3" /> UPLOAD .SIM FILE
                    </button>
                    <input 
                        ref={fileInputRef} 
                        type="file" 
                        accept=".sim,.json" 
                        className="hidden" 
                        onChange={handleFileUpload}
                    />
                 </div>
            </div>

            <div className="space-y-2">
                <div className="text-xs font-bold opacity-50">ACTIVE MOUNTS</div>
                {libs.map(lib => (
                    <div key={lib.id} className="flex items-center justify-between p-2 rounded border" style={{ borderColor: 'var(--outline-color)', background: 'rgba(0,0,0,0.2)' }}>
                        <div className="flex items-center gap-3">
                            <Database className={`w-4 h-4`} style={{ color: lib.status === 'mounted' ? 'var(--accent-color)' : 'gray' }} />
                            <div>
                                <div className="text-xs">{lib.name}</div>
                                <div className="text-[10px] opacity-60">{lib.endpoint}</div>
                            </div>
                        </div>
                        <div className={`text-[10px] px-2 py-0.5 rounded`} style={{ background: lib.status === 'mounted' ? 'var(--accent-color)' : '#333', color: '#fff' }}>
                            {lib.status.toUpperCase()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};