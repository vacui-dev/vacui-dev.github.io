// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect } from 'react';
import { fileSystem } from '../../services/FileSystem';
import { VirtualFile } from '../../types/filesystem';
import { WorldConfig } from '../../types/simulation';
import { Gamepad2, Microscope, Globe, Play, Loader2, Info, Clock, Activity } from 'lucide-react';

interface SimulationsBrowserProps {
    onOpenWindow: (type: any, file?: VirtualFile, folderId?: string) => void;
}

type Category = 'arcade' | 'research' | 'observatory';

interface SimMeta {
    file: VirtualFile;
    config: WorldConfig;
    category: Category;
}

export const SimulationsBrowserApp: React.FC<SimulationsBrowserProps> = ({ onOpenWindow }) => {
    const [sims, setSims] = useState<SimMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<Category>('arcade');

    useEffect(() => {
        const loadSims = async () => {
            setLoading(true);
            const folder = fileSystem.getFolders().find(f => f.id === 'sims');
            if (!folder) {
                setLoading(false);
                return;
            }

            const loaded: SimMeta[] = [];
            
            // Recursive function to process files
            const processFile = async (file: VirtualFile, categoryHint?: Category) => {
                if (file.type === 'folder') {
                    // Check for subfolder based categories
                    let subCat = categoryHint;
                    if (file.name.toLowerCase().includes('arcade')) subCat = 'arcade';
                    if (file.name.toLowerCase().includes('research')) subCat = 'research';
                    if (file.name.toLowerCase().includes('observatory')) subCat = 'observatory';
                    
                    // Process children
                    const children = folder.files.filter(f => f.parentId === file.id);
                    for (const child of children) {
                        await processFile(child, subCat);
                    }
                    return;
                }

                if (file.type !== 'simulation') return;
                
                try {
                    let config: WorldConfig;
                    // If content is already loaded string
                    if (typeof file.content === 'string') {
                        config = JSON.parse(file.content);
                    } else {
                        // Fetch
                        const raw = await fileSystem.readFile(file);
                        config = JSON.parse(raw);
                    }

                    // Determine Category
                    let category: Category = categoryHint || 'observatory';
                    
                    if (!categoryHint) {
                        // Heuristics for uncategorized files
                        const hasPhysicalInput = config.entities.some(e => e.type === 'InputTerminal');
                        const hasLogicInputs = config.entities.some(e => e.logicParams?.nodeGraph?.nodes.some(n => n.type === 'INPUT_RECEIVER'));
                        const hasSensors = config.entities.some(e => e.type === 'Ganglion');

                        if (hasPhysicalInput) {
                            category = 'arcade';
                        } else if (hasLogicInputs || hasSensors) {
                            category = 'research';
                        } else {
                            category = 'observatory';
                        }
                    }

                    loaded.push({ file, config, category });

                } catch (e) {
                    console.warn(`Failed to parse sim ${file.name}`, e);
                }
            };

            // Start with root files
            const rootFiles = folder.files.filter(f => !f.parentId);
            for (const file of rootFiles) {
                await processFile(file);
            }

            setSims(loaded);
            setLoading(false);
        };

        loadSims();
    }, []);

    const filteredSims = sims.filter(s => s.category === activeCategory);

    return (
        <div className="flex flex-col h-full bg-[#0d1117] text-white font-sans">
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-gradient-to-r from-[#161b22] to-[#0d1117]">
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 mb-2">
                    <Gamepad2 className="w-8 h-8 text-cyan-400" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                        Ganglia Games
                    </span>
                </h1>
                <p className="text-sm text-neutral-400 font-mono max-w-md">
                    Select a simulation environment. 
                    From arcade physics to neural research.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 bg-[#161616]">
                <CategoryTab 
                    label="ARCADE" 
                    icon={<Gamepad2 className="w-4 h-4" />} 
                    active={activeCategory === 'arcade'} 
                    onClick={() => setActiveCategory('arcade')} 
                    color="text-cyan-400"
                />
                <CategoryTab 
                    label="R&D LABS" 
                    icon={<Microscope className="w-4 h-4" />} 
                    active={activeCategory === 'research'} 
                    onClick={() => setActiveCategory('research')} 
                    color="text-pink-400"
                />
                <CategoryTab 
                    label="OBSERVATORY" 
                    icon={<Globe className="w-4 h-4" />} 
                    active={activeCategory === 'observatory'} 
                    onClick={() => setActiveCategory('observatory')} 
                    color="text-yellow-400"
                />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-[url('https://vacui.dev/assets/noise.png')] bg-opacity-5">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
                    </div>
                ) : filteredSims.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-4">
                        <Activity className="w-12 h-12 opacity-20" />
                        <div className="text-sm font-mono">No simulations found in this category.</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSims.map((sim, i) => (
                            <SimCard 
                                key={i} 
                                meta={sim} 
                                onLaunch={() => onOpenWindow('architect', sim.file, 'sims')} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const CategoryTab: React.FC<{ label: string, icon: React.ReactNode, active: boolean, onClick: () => void, color: string }> = ({ label, icon, active, onClick, color }) => (
    <button 
        onClick={onClick}
        className={`flex-1 py-4 flex items-center justify-center gap-2 text-xs font-bold tracking-widest transition-all border-b-2 ${active ? `bg-white/5 border-current ${color}` : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-white/5'}`}
    >
        {icon} {label}
    </button>
);

const SimCard: React.FC<{ meta: SimMeta, onLaunch: () => void }> = ({ meta, onLaunch }) => {
    const entityCount = meta.config.entities.length;
    
    // Color coding based on category
    let accentColor = "bg-cyan-500";
    if (meta.category === 'research') accentColor = "bg-pink-500";
    if (meta.category === 'observatory') accentColor = "bg-yellow-500";

    return (
        <div className="group relative bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 hover:shadow-2xl hover:shadow-cyan-900/20 transition-all duration-300 flex flex-col">
            <div className="h-32 bg-[#111] relative overflow-hidden">
                {/* Abstract Thumbnail Generator */}
                <div className={`absolute inset-0 opacity-20 ${accentColor} mix-blend-overlay`} />
                <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:scale-110 transition-transform duration-700">
                    {meta.category === 'arcade' ? <Gamepad2 className="w-16 h-16" /> : 
                     meta.category === 'research' ? <Microscope className="w-16 h-16" /> : 
                     <Clock className="w-16 h-16" />}
                </div>
                
                <div className="absolute bottom-3 right-3">
                    <button 
                        onClick={onLaunch}
                        className={`w-10 h-10 rounded-full ${accentColor} text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform hover:brightness-110`}
                    >
                        <Play className="w-4 h-4 fill-current" />
                    </button>
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white group-hover:text-cyan-300 transition-colors">{meta.file.name.replace('.sim', '').replace('.json', '').replace(/_/g, ' ')}</h3>
                </div>
                
                <p className="text-xs text-neutral-400 line-clamp-3 mb-4 flex-1 leading-relaxed">
                    {meta.config.description || "No description provided."}
                </p>

                <div className="flex items-center gap-4 text-[10px] font-mono text-neutral-500 border-t border-white/5 pt-3">
                    <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        <span>{entityCount} Entities</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        <span>v{meta.file.id.length > 5 ? '1.2' : '1.0'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
