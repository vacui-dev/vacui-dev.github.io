// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect } from 'react';
import { fileSystem } from '../../services/FileSystem';
import { WorldConfig, Entity, Constraint, ShapeType, ConstraintType } from '../../types/simulation';
import { VirtualFile } from '../../types/filesystem';
import { Box, Circle, Type, Save, Play, Trash2, Link as LinkIcon, Database, Flame, Anchor, Hexagon, Bone, Monitor, Maximize, HelpCircle, X, Minimize, FunctionSquare, GitFork, Activity, Waves, BookOpen, FileCode } from 'lucide-react';
import { SimulationScene } from '../Simulation/SimulationScene';
import { verseCompiler } from '../../services/VerseCompiler';

interface SimulationEditorProps {
    onLoadSimulation?: (config: WorldConfig) => void;
    file?: VirtualFile;
}

type EditorTab = 'entities' | 'constraints' | 'globals';

export const SimulationEditor: React.FC<SimulationEditorProps> = ({ onLoadSimulation, file }) => {
    const [config, setConfig] = useState<WorldConfig>({
        gravity: { x: 0, y: -9.81, z: 0 },
        wind: { x: 0, y: 0, z: 0 },
        environment: 'studio',
        description: 'New Simulation',
        entities: [],
        constraints: []
    });
    
    const [activeTab, setActiveTab] = useState<EditorTab>('entities');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [tutorialStep, setTutorialStep] = useState<number>(0);
    const [showTutorial, setShowTutorial] = useState(false);
    const [simKey, setSimKey] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Load from file if provided
    useEffect(() => {
        if (file) {
            const load = async () => {
                try {
                    const content = await fileSystem.readFile(file);
                    if (content) {
                        const parsed = JSON.parse(content);
                        // Always set config, even if entities array is empty, to allow starting from scratch
                        if (parsed) {
                            setConfig(parsed);
                            setSimKey(k => k + 1);
                        }
                    }
                } catch (e) {
                    console.error("Failed to load sim file into editor", e);
                }
            };
            load();
        }
    }, [file]);

    // --- ACTIONS ---

    const updateGlobal = (key: keyof WorldConfig, val: any) => {
        setConfig(prev => ({ ...prev, [key]: val }));
    };

    const updateEntity = (id: string, updates: Partial<Entity>) => {
        setConfig(prev => ({
            ...prev,
            entities: prev.entities.map(e => e.id === id ? { ...e, ...updates } : e)
        }));
    };

    const addEntity = (type: ShapeType) => {
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
            pathParams: type === 'Path' ? { dimensions: 4, complexity: 5, resolution: 100, tubeRadius: 0.05, fitBeziers: false } : undefined,
            harmonicParams: type === 'Harmonic' ? { 
                layers: [{ id: '1', pattern: 'Basic Shapes.flower', intensity: 1, phase: 0, blendMode: 'add' }],
                projection: 'polar',
                speed: 0.02,
                trailLength: 200,
                scale: 5,
                resolution: 1
            } : undefined
        };
        setConfig(prev => ({ ...prev, entities: [...prev.entities, newEntity] }));
        setSelectedId(id);
        setActiveTab('entities');
        if (showTutorial && tutorialStep === 1) setTutorialStep(2);
    };

    const deleteEntity = (id: string) => {
        setConfig(prev => ({
            ...prev,
            entities: prev.entities.filter(e => e.id !== id),
            constraints: prev.constraints.filter(c => c.bodyA !== id && c.bodyB !== id)
        }));
        if (selectedId === id) setSelectedId(null);
    };

    const addConstraint = (type: ConstraintType) => {
        if (config.entities.length < 2) {
            alert("You need at least 2 entities to create a constraint.");
            return;
        }
        const id = `joint_${Date.now()}`;
        const newConstraint: Constraint = {
            id,
            type,
            bodyA: config.entities[0].id,
            bodyB: config.entities[1].id,
            stiffness: 100,
            damping: 2,
            restLength: 0,
            renderAs: 'line',
            // Defaults for Relation
            relationParams: type === 'Relation' ? { sourceProp: 'rotation.y', targetProp: 'rotation.y', multiplier: 1, offset: 0 } : undefined
        };
        setConfig(prev => ({ ...prev, constraints: [...prev.constraints, newConstraint] }));
        setSelectedId(id);
        setActiveTab('constraints');
    };

    const deleteConstraint = (id: string) => {
        setConfig(prev => ({ ...prev, constraints: prev.constraints.filter(c => c.id !== id) }));
        if (selectedId === id) setSelectedId(null);
    };

    const handleSave = () => {
        // If editing existing file, overwrite. Else create new.
        if (file) {
            fileSystem.saveFile('sims', file.id, JSON.stringify(config, null, 2));
            alert(`Saved to /sims/${file.name}`);
        } else {
            const fileName = `simulation_${Date.now()}.sim`;
            fileSystem.createFile('sims', fileName, 'simulation', JSON.stringify(config, null, 2));
            alert(`Saved to /sims/${fileName}`);
        }
    };

    const handleExportVerse = () => {
        const filename = verseCompiler.export(config);
        alert(`Exported to /home/${filename}`);
    };

    const resetSim = () => setSimKey(k => k + 1);

    return (
        <div className="flex h-full bg-[#111] text-gray-300 font-sans text-xs select-none relative overflow-hidden">
            
            {/* TUTORIAL OVERLAY */}
            {showTutorial && (
                <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-10 pointer-events-auto">
                    <div className="bg-[#1a1a1a] border border-cyan-500/50 p-6 rounded-xl max-w-lg shadow-2xl relative">
                        <button onClick={() => setShowTutorial(false)} className="absolute top-2 right-2 p-1 hover:text-white"><X className="w-4 h-4" /></button>
                        <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                            <HelpCircle className="w-5 h-5" /> Architect Tutorial
                        </h2>
                        
                        {tutorialStep === 0 && (
                            <div className="space-y-4">
                                <p>Welcome to the Genesis Architect. This tool allows you to build physics simulations from scratch.</p>
                                <p>Let's start by creating a physical object.</p>
                                <button onClick={() => setTutorialStep(1)} className="bg-cyan-600 text-white px-4 py-2 rounded font-bold hover:bg-cyan-500">Start Tutorial</button>
                            </div>
                        )}
                        
                        {tutorialStep === 1 && (
                            <div className="space-y-4">
                                <p><strong>Step 1: Add an Entity</strong></p>
                                <p>Look at the toolbar on the left. Click the <Box className="w-3 h-3 inline" /> <strong>Box</strong> button to add a cube to the world.</p>
                                <p className="text-xs text-white/50">(I'll wait here until you do it...)</p>
                            </div>
                        )}

                        {tutorialStep === 2 && (
                            <div className="space-y-4">
                                <p><strong>Step 2: Position It</strong></p>
                                <p>Great! You've added a Box. It appeared in the entity list on the left.</p>
                                <p>Select it, then look at the <strong>Properties Panel</strong> on the right. Change its <strong>Position Y</strong> to 5 so it drops from the sky.</p>
                                <button onClick={() => setTutorialStep(3)} className="bg-cyan-600 text-white px-4 py-2 rounded font-bold hover:bg-cyan-500">Done</button>
                            </div>
                        )}

                        {tutorialStep === 3 && (
                            <div className="space-y-4">
                                <p><strong>Step 3: Fix It (Optional)</strong></p>
                                <p>If you want an object to stay still (like a floor or anchor), set its <strong>Mass</strong> to 0.</p>
                                <p>Try adding a second object and connecting them with a <strong>Spring Constraint</strong> in the 'Joints' tab!</p>
                                <button onClick={() => setShowTutorial(false)} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-500">Finish</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* LEFT: SCENE GRAPH */}
            {!isFullscreen && (
                <div className="w-64 border-r border-white/10 flex flex-col bg-[#161616] shrink-0">
                    <div className="flex border-b border-white/10">
                        <button onClick={() => setActiveTab('entities')} className={`flex-1 py-2 text-center hover:bg-white/5 ${activeTab === 'entities' ? 'text-yellow-400 border-b-2 border-yellow-400' : ''}`}>Entities</button>
                        <button onClick={() => setActiveTab('constraints')} className={`flex-1 py-2 text-center hover:bg-white/5 ${activeTab === 'constraints' ? 'text-blue-400 border-b-2 border-blue-400' : ''}`}>Joints</button>
                        <button onClick={() => setActiveTab('globals')} className={`flex-1 py-2 text-center hover:bg-white/5 ${activeTab === 'globals' ? 'text-green-400 border-b-2 border-green-400' : ''}`}>World</button>
                    </div>

                    <div className="p-2 border-b border-white/10 flex flex-wrap gap-1 justify-center">
                        {activeTab === 'entities' && (
                            <>
                                <AddBtn icon={<Box />} label="Box" onClick={() => addEntity('Box')} />
                                <AddBtn icon={<Circle />} label="Sphere" onClick={() => addEntity('Sphere')} />
                                <AddBtn icon={<Type />} label="Agent" onClick={() => addEntity('Agent')} />
                                <AddBtn icon={<Flame />} label="Fire" onClick={() => addEntity('Fire')} />
                                <AddBtn icon={<Database />} label="Molecule" onClick={() => addEntity('Molecule')} />
                                <AddBtn icon={<Bone />} label="Bone" onClick={() => addEntity('Bone')} />
                                <AddBtn icon={<Hexagon />} label="Hyper" onClick={() => addEntity('HyperShape')} />
                                <AddBtn icon={<GitFork />} label="Manifold" onClick={() => addEntity('Manifold')} />
                                <AddBtn icon={<Activity />} label="Path" onClick={() => addEntity('Path')} />
                                <AddBtn icon={<Waves />} label="Harmonic" onClick={() => addEntity('Harmonic')} />
                            </>
                        )}
                        {activeTab === 'constraints' && (
                            <>
                                <AddBtn icon={<LinkIcon />} label="Spring" onClick={() => addConstraint('Spring')} />
                                <AddBtn icon={<LinkIcon />} label="Hinge" onClick={() => addConstraint('Hinge')} />
                                <AddBtn icon={<Anchor />} label="Lock" onClick={() => addConstraint('Lock')} />
                                <AddBtn icon={<FunctionSquare />} label="Relation" onClick={() => addConstraint('Relation')} />
                            </>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'entities' && config.entities.map(e => (
                            <ListItem 
                                key={e.id} 
                                label={e.name} 
                                subLabel={e.type} 
                                active={selectedId === e.id} 
                                onClick={() => setSelectedId(e.id)} 
                                onDelete={() => deleteEntity(e.id)} 
                            />
                        ))}
                        {activeTab === 'constraints' && config.constraints.map(c => (
                            <ListItem 
                                key={c.id} 
                                label={`${c.type} Constraint`} 
                                subLabel={`${c.bodyA.substring(0,5)}... ${c.type === 'Relation' ? '=>' : '<->'} ${c.bodyB.substring(0,5)}...`} 
                                active={selectedId === c.id} 
                                onClick={() => setSelectedId(c.id)} 
                                onDelete={() => deleteConstraint(c.id)} 
                            />
                        ))}
                    </div>
                    
                    <div className="p-2 border-t border-white/10">
                        <button onClick={() => { setShowTutorial(true); setTutorialStep(0); }} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded text-center text-xs flex items-center justify-center gap-2">
                            <HelpCircle className="w-3 h-3" /> Tutorial
                        </button>
                    </div>
                </div>
            )}

            {/* MIDDLE: LIVE PREVIEW */}
            <div className="flex-1 flex flex-col bg-black relative border-r border-white/10">
                <div className="absolute top-0 left-0 right-0 h-8 bg-[#161616] border-b border-white/10 flex items-center justify-between px-4 z-10">
                    <span className="font-bold text-white/50 flex items-center gap-2"><Monitor className="w-3 h-3" /> LIVE PREVIEW</span>
                    <div className="flex gap-2">
                        <button onClick={resetSim} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded flex items-center gap-1">
                            <RefreshIcon /> Reset
                        </button>
                        <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded flex items-center gap-1">
                            {isFullscreen ? <Minimize className="w-3 h-3" /> : <Maximize className="w-3 h-3" />}
                        </button>
                    </div>
                </div>
                <div className="flex-1 relative overflow-hidden">
                    <SimulationScene config={config} simulationKey={simKey} />
                </div>
            </div>

            {/* RIGHT: INSPECTOR */}
            {!isFullscreen && (
                <div className="w-72 bg-[#0a0a0a] flex flex-col relative overflow-hidden shrink-0">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-[#161616] border-b border-white/10 flex items-center px-4 font-bold text-white/50">
                        PROPERTIES
                    </div>
                    <div className="mt-8 flex-1 overflow-y-auto p-6">
                        {activeTab === 'globals' && (
                            <div className="space-y-6">
                                <Section title="Environment">
                                    <PropRow label="Preset">
                                        <select 
                                            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 focus:border-blue-500 outline-none text-xs appearance-none cursor-pointer"
                                            value={config.environment}
                                            onChange={(e) => updateGlobal('environment', e.target.value)}
                                        >
                                            {['studio', 'city', 'park', 'night', 'warehouse', 'forest', 'sunset'].map(env => (
                                                <option key={env} value={env}>{env.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </PropRow>
                                    <PropRow label="Desc">
                                        <textarea 
                                            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 focus:border-blue-500 outline-none text-xs h-20"
                                            value={config.description}
                                            onChange={(e) => updateGlobal('description', e.target.value)}
                                        />
                                    </PropRow>
                                </Section>
                                <Section title="Physics Globals">
                                    <VectorInput label="Gravity" value={config.gravity} onChange={(v) => updateGlobal('gravity', v)} />
                                    <VectorInput label="Wind" value={config.wind || {x:0,y:0,z:0}} onChange={(v) => updateGlobal('wind', v)} />
                                </Section>
                            </div>
                        )}

                        {activeTab === 'entities' && selectedId && (() => {
                            const entity = config.entities.find(e => e.id === selectedId);
                            if (!entity) return <div className="text-center opacity-30 mt-10">Select an entity</div>;
                            return (
                                <div className="space-y-6">
                                    <Section title="Identity">
                                        <PropRow label="Name">
                                            <input className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 focus:border-blue-500 outline-none text-xs" value={entity.name} onChange={(e) => updateEntity(entity.id, { name: e.target.value })} />
                                        </PropRow>
                                        <PropRow label="ID">
                                            <input className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 focus:border-blue-500 outline-none text-xs opacity-50" value={entity.id} readOnly />
                                        </PropRow>
                                        <PropRow label="Type">
                                            <span className="text-yellow-400 font-mono">{entity.type}</span>
                                        </PropRow>
                                        <PropRow label="Concept ID">
                                            <div className="relative w-full">
                                                <input 
                                                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 focus:border-cyan-500 outline-none text-xs font-mono text-cyan-400 pl-6" 
                                                    value={entity.conceptId || ''} 
                                                    onChange={(e) => updateEntity(entity.id, { conceptId: e.target.value })} 
                                                    placeholder="ILI§..."
                                                />
                                                <BookOpen className="w-3 h-3 absolute left-1.5 top-1.5 text-cyan-600" />
                                            </div>
                                        </PropRow>
                                    </Section>

                                    <Section title="Transform">
                                        <VectorInput label="Position" value={entity.position} onChange={(v) => updateEntity(entity.id, { position: v })} />
                                        <VectorInput label="Rotation" value={entity.rotation} onChange={(v) => updateEntity(entity.id, { rotation: v })} />
                                    </Section>

                                    {entity.type === 'Harmonic' && entity.harmonicParams && (
                                        <Section title="Harmonic Pattern">
                                            <PropRow label="Projection">
                                                <select className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs" 
                                                    value={entity.harmonicParams.projection} 
                                                    onChange={e => updateEntity(entity.id, { harmonicParams: { ...entity.harmonicParams!, projection: e.target.value as any } })}>
                                                    {['polar', 'cylindrical', 'spiral', 'spherical'].map(p => <option key={p} value={p}>{p}</option>)}
                                                </select>
                                            </PropRow>
                                            <PropRow label="Speed">
                                                <input type="number" step="0.01" className="w-full bg-black/30 border border-white/10 rounded px-1 py-1 text-xs"
                                                    value={entity.harmonicParams.speed}
                                                    onChange={e => updateEntity(entity.id, { harmonicParams: { ...entity.harmonicParams!, speed: parseFloat(e.target.value) } })} />
                                            </PropRow>
                                            <PropRow label="Scale">
                                                <input type="number" step="1" className="w-full bg-black/30 border border-white/10 rounded px-1 py-1 text-xs"
                                                    value={entity.harmonicParams.scale}
                                                    onChange={e => updateEntity(entity.id, { harmonicParams: { ...entity.harmonicParams!, scale: parseFloat(e.target.value) } })} />
                                            </PropRow>
                                            {/* Layer editor could go here but skipping for brevity */}
                                            <div className="text-[10px] opacity-50 mt-2 italic">Layer 1: {entity.harmonicParams.layers![0].pattern}</div>
                                        </Section>
                                    )}

                                    <Section title="Material">
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-[10px] opacity-50 block mb-1">Color</label>
                                                <input type="color" className="w-full bg-transparent h-8 cursor-pointer border border-white/10 rounded" value={entity.color} onChange={(e) => updateEntity(entity.id, { color: e.target.value })} />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] opacity-50 block mb-1">Roughness</label>
                                                <input type="range" min="0" max="1" step="0.1" className="w-full" value={entity.roughness} onChange={(e) => updateEntity(entity.id, { roughness: parseFloat(e.target.value) })} />
                                            </div>
                                        </div>
                                    </Section>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* BOTTOM BAR */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-[#111] border-t border-white/10 flex justify-between items-center z-50">
                <div className="text-[10px] opacity-50 font-mono">GENESIS ARCHITECT v2.2 {file ? `[${file.name}]` : ''}</div>
                <div className="flex gap-2">
                    <button onClick={handleExportVerse} className="flex items-center gap-2 px-4 py-1 bg-orange-700 hover:bg-orange-600 text-white rounded font-bold text-xs">
                        <FileCode className="w-3 h-3" /> EXPORT VERSE
                    </button>
                    <button onClick={() => onLoadSimulation && onLoadSimulation(config)} className="flex items-center gap-2 px-4 py-1 bg-green-700 hover:bg-green-600 text-white rounded font-bold text-xs">
                        <Play className="w-3 h-3" /> RUN AS WALLPAPER
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded font-bold text-xs">
                        <Save className="w-3 h-3" /> SAVE FILE
                    </button>
                </div>
            </div>
        </div>
    );
};

// ... (Sub-components: RefreshIcon, AddBtn, ListItem, Section, PropRow, VectorInput, AxisInput remain unchanged)

const RefreshIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>;

const AddBtn: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center w-10 h-10 hover:bg-white/10 rounded transition-colors group">
        <div className="opacity-70 group-hover:opacity-100 group-hover:text-white [&>svg]:w-4 [&>svg]:h-4">{icon}</div>
        <span className="text-[8px] opacity-50 mt-0.5">{label}</span>
    </button>
);

const ListItem: React.FC<{ label: string, subLabel: string, active: boolean, onClick: () => void, onDelete: () => void }> = ({ label, subLabel, active, onClick, onDelete }) => (
    <div 
        onClick={onClick}
        className={`px-3 py-2 cursor-pointer flex items-center justify-between group border-l-2 ${active ? 'bg-white/10 border-yellow-400' : 'border-transparent hover:bg-white/5'}`}
    >
        <div>
            <div className={`text-xs font-bold ${active ? 'text-white' : 'text-gray-400'}`}>{label}</div>
            <div className="text-[9px] opacity-50 font-mono uppercase">{subLabel}</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity">
            <Trash2 className="w-3 h-3" />
        </button>
    </div>
);

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="border border-white/10 rounded p-3 bg-black/20">
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-3 border-b border-white/5 pb-1">{title}</div>
        <div className="space-y-2">{children}</div>
    </div>
);

const PropRow: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex items-center gap-2">
        <label className="w-20 text-[10px] opacity-60 shrink-0">{label}</label>
        <div className="flex-1 min-w-0">{children}</div>
    </div>
);

const VectorInput: React.FC<{ label: string, value: {x:number, y:number, z:number}, onChange: (v: {x:number, y:number, z:number}) => void }> = ({ label, value, onChange }) => (
    <div className="mb-2">
        <label className="block text-[10px] opacity-60 mb-1">{label}</label>
        <div className="grid grid-cols-3 gap-1">
            <div className="relative">
                <span className="absolute left-1 top-1 text-[8px] text-red-400 font-bold">X</span>
                <input type="number" className="w-full bg-black/30 border border-white/10 rounded px-1 py-1 focus:border-blue-500 outline-none text-xs pl-3" value={value.x} onChange={(e) => onChange({ ...value, x: parseFloat(e.target.value) })} />
            </div>
            <div className="relative">
                <span className="absolute left-1 top-1 text-[8px] text-green-400 font-bold">Y</span>
                <input type="number" className="w-full bg-black/30 border border-white/10 rounded px-1 py-1 focus:border-blue-500 outline-none text-xs pl-3" value={value.y} onChange={(e) => onChange({ ...value, y: parseFloat(e.target.value) })} />
            </div>
            <div className="relative">
                <span className="absolute left-1 top-1 text-[8px] text-blue-400 font-bold">Z</span>
                <input type="number" className="w-full bg-black/30 border border-white/10 rounded px-1 py-1 focus:border-blue-500 outline-none text-xs pl-3" value={value.z} onChange={(e) => onChange({ ...value, z: parseFloat(e.target.value) })} />
            </div>
        </div>
    </div>
);