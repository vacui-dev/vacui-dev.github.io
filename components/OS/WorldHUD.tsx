// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect } from 'react';
import { WorldConfig, Entity, ShapeType } from '../../types/simulation';
import { VirtualFile } from '../../types/filesystem';
import { Box, Circle, Type, Flame, Database, Hexagon, Trash2, Settings, X, ChevronRight, Globe, GitFork, Activity, ExternalLink } from 'lucide-react';
import { wordlessDictionary, ConceptEntry } from '../../services/WordlessDictionary';
import { TokenizedText } from '../TokenRenderer';
import { WindowState } from './Window';

interface WorldHUDProps {
    config: WorldConfig;
    selectedId: string | null;
    onUpdateGlobal: (key: keyof WorldConfig, val: any) => void;
    onUpdateEntity: (id: string, updates: Partial<Entity>) => void;
    onAddEntity: (entity: Entity) => void;
    onDeleteEntity: (id: string) => void;
    onSelect: (id: string | null) => void;
    onOpenWindow: (type: WindowState['appType'], file?: VirtualFile, folderId?: string) => void;
}

export const WorldHUD: React.FC<WorldHUDProps> = ({
    config, selectedId, onUpdateGlobal, onUpdateEntity, onAddEntity, onDeleteEntity, onSelect, onOpenWindow
}) => {
    const [isGlobalPanelOpen, setIsGlobalPanelOpen] = useState(false);

    const createEntity = (type: ShapeType) => {
        const id = `${type.toLowerCase()}_${Date.now()}`;
        const newEntity: Entity = {
            id,
            name: `New ${type}`,
            type,
            position: { x: 0, y: 5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            args: type === 'Sphere' ? [0.5] : type === 'Cylinder' || type === 'Cone' ? [0.5, 0.5, 2, 16] : [1, 1, 1],
            mass: 1,
            color: '#ffffff',
            fireParams: type === 'Fire' ? { temperature: 1200, moisture: 0.1, porosity: 0.5 } : undefined,
            socialParams: type === 'Agent' ? { role: 'audience', emotionalState: 'neutral' } : undefined,
            chemicalParams: type === 'Molecule' ? { element: 'H', atomicNumber: 1, valency: 1, isReactive: true } : undefined,
            geometryParams: type === 'HyperShape' ? { dimensions: 4, vertices: [], edges: [], rotationSpeed: [0.5, 0.3, 0.2] } : undefined,
            manifoldParams: type === 'Manifold' ? { iterations: 5, scaleFactor: 0.8, rotationalVelocity: { x: 0.05, y: 0.1, z: 0.0 }, divergenceColor: '#ff00ff' } : undefined,
            pathParams: type === 'Path' ? { dimensions: 4, complexity: 5, resolution: 100, tubeRadius: 0.05, fitBeziers: false } : undefined
        };
        onAddEntity(newEntity);
    };

    const selectedEntity = selectedId ? config.entities.find(e => e.id === selectedId) : null;

    // Fetch conceptual definition if entity is selected
    const [conceptualDefinition, setConceptualDefinition] = useState<ConceptEntry | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchConcept = async () => {
            if (!selectedEntity) {
                if (isMounted) setConceptualDefinition(null);
                return;
            }

            let concept: ConceptEntry | undefined | null = null;
            
            if (selectedEntity.conceptId) {
                try {
                    concept = await wordlessDictionary.getConcept(selectedEntity.conceptId);
                } catch (e) {
                    console.error("Failed to fetch concept", e);
                }
            }

            if (!concept) {
                // Fallback to synchronous lookup by name
                const results = wordlessDictionary.lookup(selectedEntity.name);
                if (results.length > 0) {
                    concept = results[0];
                }
            }

            if (isMounted) {
                setConceptualDefinition(concept || null);
            }
        };

        fetchConcept();

        return () => { isMounted = false; };
    }, [selectedEntity?.id, selectedEntity?.name, selectedEntity?.conceptId]);

    const handleOpenDictionary = (id: string) => {
        // We use the file/folder mechanism as a generic payload carrier here
        // folderId='concept', fileId=id
        onOpenWindow('wordless', { id } as VirtualFile, 'concepts');
    };

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col">
            {/* Top Bar: Quick Actions */}
            <div className="absolute top-6 right-6 pointer-events-auto flex gap-2">
                <div className="flex gap-2 mr-4 border-r border-white/10 pr-4">
                    <ToolbarButton icon={<Settings />} label="World Config" active={isGlobalPanelOpen} onClick={() => setIsGlobalPanelOpen(!isGlobalPanelOpen)} />
                </div>
                
                <ToolbarButton icon={<Box />} label="Box" onClick={() => createEntity('Box')} />
                <ToolbarButton icon={<Circle />} label="Sphere" onClick={() => createEntity('Sphere')} />
                <ToolbarButton icon={<Type />} label="Agent" onClick={() => createEntity('Agent')} />
                <ToolbarButton icon={<Flame />} label="Fire" onClick={() => createEntity('Fire')} />
                <ToolbarButton icon={<Database />} label="Atom" onClick={() => createEntity('Molecule')} />
                <ToolbarButton icon={<Hexagon />} label="Hyper" onClick={() => createEntity('HyperShape')} />
                <ToolbarButton icon={<GitFork />} label="Manifold" onClick={() => createEntity('Manifold')} />
                <ToolbarButton icon={<Activity />} label="Path" onClick={() => createEntity('Path')} />
            </div>

            {/* Right Sidebar: Inspector */}
            <div className="absolute top-20 bottom-16 right-6 w-72 pointer-events-auto flex flex-col gap-4 items-end">
                
                {selectedEntity ? (
                    // ENTITY INSPECTOR
                    <div className="w-full bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg p-4 shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col max-h-full">
                        <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-2 shrink-0">
                            <div>
                                <h2 className="text-sm font-bold text-white">{selectedEntity.name}</h2>
                                <p className="text-[10px] font-mono text-cyan-400 uppercase">{selectedEntity.type}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => onSelect(null)} className="text-neutral-400 hover:text-white" title="Deselect">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button onClick={() => onDeleteEntity(selectedEntity.id)} className="text-red-500 hover:text-red-400" title="Delete Entity">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            
                            {/* CONCEPTUAL GROUND TRUTH */}
                            <PropGroup title="Conceptual Ground Truth">
                                {conceptualDefinition ? (
                                    <div className="bg-cyan-950/30 border border-cyan-900/50 rounded p-2 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div className="text-xs font-bold text-cyan-200">{conceptualDefinition.label}</div>
                                            <button 
                                                onClick={() => handleOpenDictionary(conceptualDefinition.id)}
                                                className="text-[9px] bg-cyan-900/50 hover:bg-cyan-800 text-cyan-300 px-2 py-0.5 rounded flex items-center gap-1"
                                            >
                                                Dictionary <ExternalLink className="w-2 h-2" />
                                            </button>
                                        </div>
                                        <div className="text-[10px] text-neutral-400 leading-tight italic">
                                            {conceptualDefinition.definition}
                                        </div>
                                        {conceptualDefinition.wordlessString && (
                                            <div className="text-[10px] font-mono leading-relaxed pt-2 border-t border-cyan-900/30">
                                                <TokenizedText text={conceptualDefinition.wordlessString} onNavigate={handleOpenDictionary} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-neutral-600 italic text-center p-2 border border-white/5 rounded bg-black/20">
                                        No definition linked.
                                        {selectedEntity.conceptId && <div className="text-red-900/50">ID: {selectedEntity.conceptId} not found.</div>}
                                    </div>
                                )}
                            </PropGroup>

                            <PropGroup title="Transform">
                                <VectorInput label="Position" value={selectedEntity.position} onChange={v => onUpdateEntity(selectedEntity.id, { position: v })} />
                                <VectorInput label="Rotation" value={selectedEntity.rotation} onChange={v => onUpdateEntity(selectedEntity.id, { rotation: v })} />
                            </PropGroup>

                            <PropGroup title="Physics">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] text-neutral-400">Mass</label>
                                    <input 
                                        type="number" 
                                        value={selectedEntity.mass} 
                                        onChange={e => onUpdateEntity(selectedEntity.id, { mass: parseFloat(e.target.value) })} 
                                        className="w-16 bg-black/40 border border-white/10 rounded px-1 text-xs text-right text-white"
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] text-neutral-400">Color</label>
                                    <input 
                                        type="color" 
                                        value={selectedEntity.color} 
                                        onChange={e => onUpdateEntity(selectedEntity.id, { color: e.target.value })} 
                                        className="w-8 h-6 bg-transparent border border-white/10 rounded cursor-pointer"
                                    />
                                </div>
                            </PropGroup>

                             <PropGroup title="Dimensions">
                                <div className="flex gap-1">
                                    {selectedEntity.args.map((val, i) => (
                                        <input 
                                            key={i} 
                                            type="number" 
                                            className="w-full bg-black/30 border border-white/10 rounded px-1 py-1 text-xs text-center text-white"
                                            value={val} 
                                            onChange={(e) => {
                                                const newArgs = [...selectedEntity.args];
                                                newArgs[i] = parseFloat(e.target.value);
                                                onUpdateEntity(selectedEntity.id, { args: newArgs });
                                            }} 
                                        />
                                    ))}
                                </div>
                            </PropGroup>
                        </div>
                    </div>
                ) : isGlobalPanelOpen ? (
                    // GLOBAL WORLD SETTINGS (Collapsed by default)
                    <div className="w-full bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
                        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                <Globe className="w-3 h-3" /> World Config
                            </h2>
                            <button onClick={() => setIsGlobalPanelOpen(false)} className="text-neutral-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <PropGroup title="Environment Preset">
                                <select 
                                    className="w-full bg-neutral-900 border border-white/10 rounded px-2 py-2 text-xs text-white appearance-none cursor-pointer hover:border-cyan-500/50 transition-colors focus:outline-none"
                                    value={config.environment}
                                    onChange={(e) => onUpdateGlobal('environment', e.target.value)}
                                >
                                    {['studio', 'city', 'park', 'night', 'warehouse', 'forest', 'sunset'].map(env => (
                                        <option key={env} value={env}>{env.toUpperCase()}</option>
                                    ))}
                                </select>
                            </PropGroup>

                            <PropGroup title="Global Forces">
                                <VectorInput label="Gravity" value={config.gravity} onChange={v => onUpdateGlobal('gravity', v)} />
                                <VectorInput label="Wind" value={config.wind || {x:0,y:0,z:0}} onChange={v => onUpdateGlobal('wind', v)} />
                            </PropGroup>

                            <div className="text-[10px] text-neutral-600 italic text-center mt-4 border-t border-white/5 pt-2">
                                {config.entities.length} Entities Active
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

// --- UI Components ---

const ToolbarButton: React.FC<{ icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-10 h-10 backdrop-blur-md border rounded-lg flex flex-col items-center justify-center transition-all group relative
            ${active 
                ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.2)]' 
                : 'bg-black/40 border-white/10 text-white/70 hover:text-cyan-400 hover:bg-white/10 hover:scale-105'
            }
        `}
    >
        <div className="[&>svg]:w-4 [&>svg]:h-4">{icon}</div>
        <span className="absolute top-full mt-2 text-[9px] opacity-0 group-hover:opacity-100 bg-black px-2 py-1 rounded border border-white/10 whitespace-nowrap transition-opacity delay-100 pointer-events-none z-50">
            {label}
        </span>
    </button>
);

const PropGroup: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="border-t border-white/5 pt-3 mt-1 first:border-0 first:mt-0 first:pt-0">
        <div className="text-[10px] font-bold text-neutral-500 mb-2">{title}</div>
        {children}
    </div>
);

const VectorInput: React.FC<{ label: string, value: {x:number, y:number, z:number}, onChange: (v: {x:number, y:number, z:number}) => void }> = ({ label, value, onChange }) => (
    <div className="mb-2">
        {label && <label className="block text-[10px] opacity-60 mb-1">{label}</label>}
        <div className="grid grid-cols-3 gap-1">
            <AxisInput label="X" color="text-red-400" value={value.x} onChange={v => onChange({ ...value, x: v })} />
            <AxisInput label="Y" color="text-green-400" value={value.y} onChange={v => onChange({ ...value, y: v })} />
            <AxisInput label="Z" color="text-blue-400" value={value.z} onChange={v => onChange({ ...value, z: v })} />
        </div>
    </div>
);

const AxisInput: React.FC<{ label: string, color: string, value: number, onChange: (v: number) => void }> = ({ label, color, value, onChange }) => (
    <div className="relative group">
        <span className={`absolute left-1.5 top-1.5 text-[8px] font-bold ${color} opacity-50 group-focus-within:opacity-100`}>{label}</span>
        <input 
            type="number" 
            step="0.1"
            className="w-full bg-black/30 border border-white/5 rounded px-1 py-1 pl-3 text-xs text-white focus:bg-black/50 focus:border-white/20 outline-none transition-colors" 
            value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))} 
        />
    </div>
);
