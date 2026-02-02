
// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect } from 'react';
import { NodeGraph, NodeType, GraphNode, GraphEdge, PortDefinition } from '../../../../types/nodes';
import { fileSystem } from '../../../../services/FileSystem';
import { ProtocolDefinition } from '../../../../services/ProtocolRegistry';
import { X, Save, Hexagon, ArrowRight, Plus, Trash2 } from 'lucide-react';

interface HolonConstructProps {
    file?: any; // VirtualFile
    onSave?: (graph: NodeGraph) => void;
}

// --- EDITOR CANVAS ---
const NodeCanvas: React.FC<{ graph: NodeGraph, onChange: (g: NodeGraph) => void }> = ({ graph, onChange }) => {
    const [dragging, setDragging] = useState<{ type: 'node'|'view', id?: string, startX: number, startY: number, initX: number, initY: number } | null>(null);
    const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
    const [tempWire, setTempWire] = useState<{ startNode: string, startSocket: string, mx: number, my: number } | null>(null);

    const toCanvas = (cx: number, cy: number) => ({ x: (cx - view.x)/view.zoom, y: (cy - view.y)/view.zoom });

    // --- INTERACTION HANDLERS ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            setDragging({ type: 'view', startX: e.clientX, startY: e.clientY, initX: view.x, initY: view.y });
            return;
        }
    };

    const handleNodeDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (e.button === 0) {
            const node = graph.nodes.find(n => n.id === id);
            if(node) setDragging({ type: 'node', id, startX: e.clientX, startY: e.clientY, initX: node.x, initY: node.y });
        }
    };

    const handleSocketDown = (e: React.MouseEvent, nodeId: string, socketId: string) => {
        e.stopPropagation();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        // Center of socket
        const startPos = toCanvas(rect.left + rect.width/2, rect.top + rect.height/2);
        setTempWire({ startNode: nodeId, startSocket: socketId, mx: startPos.x, my: startPos.y });
    };

    const handleSocketUp = (e: React.MouseEvent, nodeId: string, socketId: string) => {
        e.stopPropagation();
        if (tempWire && tempWire.startNode !== nodeId) {
            // Create Edge
            const newEdge: GraphEdge = {
                id: `e_${Date.now()}`,
                sourceNodeId: tempWire.startNode,
                sourceSocketId: tempWire.startSocket,
                targetNodeId: nodeId,
                targetSocketId: socketId
            };
            onChange({ ...graph, edges: [...graph.edges, newEdge] });
        }
        setTempWire(null);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (dragging?.type === 'view') {
            setView({ ...view, x: dragging.initX + (e.clientX - dragging.startX), y: dragging.initY + (e.clientY - dragging.startY) });
        } else if (dragging?.type === 'node' && dragging.id) {
            const dx = (e.clientX - dragging.startX) / view.zoom;
            const dy = (e.clientY - dragging.startY) / view.zoom;
            const newNodes = graph.nodes.map(n => n.id === dragging.id ? { ...n, x: dragging.initX + dx, y: dragging.initY + dy } : n);
            onChange({ ...graph, nodes: newNodes });
        } else if (tempWire) {
            const pos = toCanvas(e.clientX, e.clientY);
            setTempWire({ ...tempWire, mx: pos.x, my: pos.y });
        }
    };

    const handleMouseUp = () => {
        setDragging(null);
        setTempWire(null);
    };

    const addNode = (type: NodeType) => {
        const id = `n_${Date.now()}`;
        let inputs: any[] = [];
        let outputs: any[] = [];
        let data: any = {};

        // Configure based on type
        if (type.includes('MATH') || type.includes('LOGIC')) {
            inputs = [{id: 'a', name: 'A', type: 'value'}, {id: 'b', name: 'B', type: 'value'}];
            outputs = [{id: 'out', name: 'Out', type: 'value'}];
            if (type === NodeType.LOGIC_NOT || type === NodeType.MATH_SIN || type === NodeType.MATH_COS || type === NodeType.MATH_ABS) {
                inputs = [{id: 'in', name: 'In', type: 'value'}];
            }
        } else if (type === NodeType.TIME) {
            outputs = [{id: 'out', name: 'Out', type: 'value'}];
        } else if (type === NodeType.STEP_SEQUENCER) {
            inputs = [{id: 'bpm', name: 'BPM', type: 'value'}]; 
            outputs = [{id: 'out', name: 'Trig', type: 'value'}];
            data = { bpm: 120, pattern: "x...x...x...x..." };
        } else if (type === NodeType.SAMPLER) {
            inputs = [{id: 'trigger', name: 'Trig', type: 'value'}, {id: 'pitch', name: 'Pitch', type: 'value'}];
            data = { instrument: 'bd', index: 0 };
        } else if (type.includes('SHAPE')) {
            inputs = [{id: 'theta', name: 'Theta', type: 'value'}];
            outputs = [{id: 'out', name: 'R', type: 'value'}];
        } else if (type === NodeType.CONVERT_POLAR) {
            inputs = [{id: 'radius', name: 'R', type: 'value'}, {id: 'angle', name: 'A', type: 'value'}];
            outputs = [{id: 'pt', name: 'Pt', type: 'geometry'}];
        } else if (type === NodeType.VISUAL_OUTPUT) {
            inputs = [{id: 'geometry', name: 'Geo', type: 'geometry'}];
        } else {
            // Generic fallback
            outputs = [{id: 'out', name: 'Out', type: 'value'}];
        }

        const newNode: GraphNode = {
            id, type, x: -view.x/view.zoom + 100, y: -view.y/view.zoom + 100,
            inputs, outputs, data
        };
        onChange({ ...graph, nodes: [...graph.nodes, newNode] });
    };

    return (
        <div className="relative w-full h-full bg-[#111] overflow-hidden" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
            {/* Toolbar */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-2">
                <div className="flex gap-2 flex-wrap max-w-md">
                    <button onClick={() => addNode(NodeType.TIME)} className="px-2 py-1 bg-blue-900/50 border border-blue-500/30 text-xs rounded text-blue-200">Time</button>
                    <button onClick={() => addNode(NodeType.MATH_ADD)} className="px-2 py-1 bg-gray-800/50 border border-gray-500/30 text-xs rounded text-gray-200">Add</button>
                    <button onClick={() => addNode(NodeType.MATH_MULT)} className="px-2 py-1 bg-gray-800/50 border border-gray-500/30 text-xs rounded text-gray-200">Mult</button>
                    <button onClick={() => addNode(NodeType.MATH_SIN)} className="px-2 py-1 bg-gray-800/50 border border-gray-500/30 text-xs rounded text-gray-200">Sin</button>
                </div>
                <div className="flex gap-2 flex-wrap max-w-md">
                    <button onClick={() => addNode(NodeType.STEP_SEQUENCER)} className="px-2 py-1 bg-red-900/50 border border-red-500/30 text-xs rounded text-red-200">Seq</button>
                    <button onClick={() => addNode(NodeType.SAMPLER)} className="px-2 py-1 bg-red-900/50 border border-red-500/30 text-xs rounded text-red-200">Sampler</button>
                    <button onClick={() => addNode(NodeType.LOGIC_AND)} className="px-2 py-1 bg-yellow-900/50 border border-yellow-500/30 text-xs rounded text-yellow-200">AND</button>
                    <button onClick={() => addNode(NodeType.LOGIC_OR)} className="px-2 py-1 bg-yellow-900/50 border border-yellow-500/30 text-xs rounded text-yellow-200">OR</button>
                </div>
                <div className="flex gap-2 flex-wrap max-w-md">
                    <button onClick={() => addNode(NodeType.SHAPE_CIRCLE)} className="px-2 py-1 bg-purple-900/50 border border-purple-500/30 text-xs rounded text-purple-200">Circle</button>
                    <button onClick={() => addNode(NodeType.CONVERT_POLAR)} className="px-2 py-1 bg-purple-900/50 border border-purple-500/30 text-xs rounded text-purple-200">Polar</button>
                    <button onClick={() => addNode(NodeType.VISUAL_OUTPUT)} className="px-2 py-1 bg-orange-900/50 border border-orange-500/30 text-xs rounded text-orange-200">Out</button>
                </div>
            </div>

            {/* Infinite Grid Background */}
            <div className="absolute inset-0 pointer-events-none" style={{ 
                backgroundSize: `${40 * view.zoom}px ${40 * view.zoom}px`, 
                backgroundImage: `
                    linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
                `,
                backgroundPosition: `${view.x}px ${view.y}px`
            }} />
            
            {/* Major Grid Lines */}
            <div className="absolute inset-0 pointer-events-none" style={{ 
                backgroundSize: `${200 * view.zoom}px ${200 * view.zoom}px`, 
                backgroundImage: `
                    linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
                `,
                backgroundPosition: `${view.x}px ${view.y}px`
            }} />

            <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
                {/* Wires */}
                <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" style={{ width: 1, height: 1 }}>
                    {graph.edges.map(e => {
                        const n1 = graph.nodes.find(n => n.id === e.sourceNodeId);
                        const n2 = graph.nodes.find(n => n.id === e.targetNodeId);
                        if(!n1 || !n2) return null;
                        // Rough socket positions
                        const x1 = n1.x + 140; const y1 = n1.y + 40; // Output right
                        const x2 = n2.x; const y2 = n2.y + 40; // Input left
                        const cpOffset = Math.abs(x2 - x1) * 0.5;
                        
                        return (
                            <g key={e.id}>
                                <path 
                                    d={`M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`} 
                                    stroke="#000" strokeWidth="4" fill="none" opacity="0.5" 
                                />
                                <path 
                                    d={`M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`} 
                                    stroke="#aaa" strokeWidth="2" fill="none" 
                                />
                            </g>
                        );
                    })}
                    {tempWire && (
                        <path d={`M ${tempWire.mx-50} ${tempWire.my} L ${tempWire.mx} ${tempWire.my}`} stroke="#fff" strokeWidth="2" strokeDasharray="4" />
                    )}
                </svg>

                {/* Nodes */}
                {graph.nodes.map(node => (
                    <div key={node.id} className="absolute w-36 bg-[#1a1a1a] border border-white/20 rounded-lg shadow-xl flex flex-col overflow-hidden" style={{ left: node.x, top: node.y }} onMouseDown={(e) => handleNodeDown(e, node.id)}>
                        <div className="h-6 bg-gradient-to-r from-white/10 to-transparent border-b border-white/10 px-2 flex items-center justify-between cursor-move">
                            <span className="text-[10px] font-bold text-white/90 truncate font-mono tracking-wide">{node.type}</span>
                            <button onClick={() => onChange({ ...graph, nodes: graph.nodes.filter(n => n.id !== node.id), edges: graph.edges.filter(e => e.sourceNodeId !== node.id && e.targetNodeId !== node.id) })} className="text-white/30 hover:text-red-400"><X size={10} /></button>
                        </div>
                        <div className="p-2 space-y-2 relative">
                            {/* Inputs */}
                            {node.inputs?.map(i => (
                                <div key={i.id} className="flex items-center gap-2 relative h-4">
                                    <div className="absolute -left-3 w-2.5 h-2.5 rounded-full bg-[#333] border border-white/50 hover:bg-green-500 hover:scale-125 transition-transform cursor-pointer" onMouseUp={(e) => handleSocketUp(e, node.id, i.id)} />
                                    <span className="text-[9px] text-neutral-400 ml-1">{i.name}</span>
                                </div>
                            ))}
                            
                            {/* Data/Values */}
                            {node.type === 'VALUE' && <input type="number" className="w-full bg-black/50 border border-white/10 rounded text-[10px] text-cyan-300 px-1 font-mono" value={node.data.value} onChange={(e) => {
                                const newNodes = graph.nodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, value: parseFloat(e.target.value) } } : n);
                                onChange({ ...graph, nodes: newNodes });
                            }} />}
                            
                            {(node.type === 'GRAPH_INPUT' || node.type === 'GRAPH_OUTPUT') && (
                                <div className="text-[9px] text-cyan-400 font-mono bg-cyan-900/20 px-1 rounded text-center">{node.data.name}</div>
                            )}

                            {/* Outputs */}
                            {node.outputs?.map(o => (
                                <div key={o.id} className="flex items-center justify-end gap-2 relative h-4">
                                    <span className="text-[9px] text-neutral-400 mr-1">{o.name}</span>
                                    <div className="absolute -right-3 w-2.5 h-2.5 rounded-full bg-[#333] border border-white/50 hover:bg-blue-500 hover:scale-125 transition-transform cursor-pointer" onMouseDown={(e) => handleSocketDown(e, node.id, o.id)} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- PROTOCOL EDITOR ---
const ProtocolEditor: React.FC<{ protocol: ProtocolDefinition, onChange: (p: ProtocolDefinition) => void }> = ({ protocol, onChange }) => {
    
    const addPort = (dir: 'input'|'output') => {
        const newPort: PortDefinition = { id: `port_${Date.now()}`, name: 'New Port', type: 'value', direction: dir };
        if (dir === 'input') onChange({ ...protocol, inputs: [...protocol.inputs, newPort] });
        else onChange({ ...protocol, outputs: [...protocol.outputs, newPort] });
    };

    const removePort = (dir: 'input'|'output', id: string) => {
        if (dir === 'input') onChange({ ...protocol, inputs: protocol.inputs.filter(p => p.id !== id) });
        else onChange({ ...protocol, outputs: protocol.outputs.filter(p => p.id !== id) });
    };

    const updatePort = (dir: 'input'|'output', id: string, updates: Partial<PortDefinition>) => {
        const updateList = (list: PortDefinition[]) => list.map(p => p.id === id ? { ...p, ...updates } : p);
        if (dir === 'input') onChange({ ...protocol, inputs: updateList(protocol.inputs) });
        else onChange({ ...protocol, outputs: updateList(protocol.outputs) });
    };

    return (
        <div className="p-6 space-y-6 font-mono">
            <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase">Protocol ID</label>
                <input className="w-full bg-black/30 border border-white/10 p-2 rounded text-white text-xs" value={protocol.id} onChange={(e) => onChange({...protocol, id: e.target.value})} />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase">Description</label>
                <textarea className="w-full bg-black/30 border border-white/10 p-2 rounded text-white text-xs" value={protocol.description} onChange={(e) => onChange({...protocol, description: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <PortList title="Inputs" ports={protocol.inputs} onAdd={() => addPort('input')} onRemove={(id) => removePort('input', id)} onUpdate={(id, u) => updatePort('input', id, u)} />
                <PortList title="Outputs" ports={protocol.outputs} onAdd={() => addPort('output')} onRemove={(id) => removePort('output', id)} onUpdate={(id, u) => updatePort('output', id, u)} />
            </div>
        </div>
    );
};

const PortList: React.FC<{ title: string, ports: PortDefinition[], onAdd: () => void, onRemove: (id: string) => void, onUpdate: (id: string, u: Partial<PortDefinition>) => void }> = ({ title, ports, onAdd, onRemove, onUpdate }) => (
    <div className="border border-white/10 rounded p-3 bg-black/20">
        <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-cyan-400">{title}</span>
            <button onClick={onAdd} className="p-1 hover:bg-white/10 rounded"><Plus className="w-3 h-3" /></button>
        </div>
        <div className="space-y-2">
            {ports.map(p => (
                <div key={p.id} className="flex flex-col gap-1 p-2 bg-black/40 rounded border border-white/5">
                    <div className="flex justify-between">
                        <input className="bg-transparent text-[10px] font-bold text-white w-20 outline-none" value={p.id} onChange={e => onUpdate(p.id, { id: e.target.value })} />
                        <button onClick={() => onRemove(p.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></button>
                    </div>
                    <input className="bg-transparent text-[10px] text-neutral-400 w-full outline-none" value={p.name} onChange={e => onUpdate(p.id, { name: e.target.value })} />
                    <select className="bg-black text-[9px] border border-white/10 rounded text-neutral-300 mt-1" value={p.type} onChange={e => onUpdate(p.id, { type: e.target.value as any })}>
                        {['value', 'signal', 'geometry', 'data'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            ))}
        </div>
    </div>
);

// --- MAIN APP ---
export const HolonConstructApp: React.FC<HolonConstructProps> = ({ file }) => {
    const [graph, setGraph] = useState<NodeGraph>({ id: 'root', nodes: [], edges: [] });
    const [protocol, setProtocol] = useState<ProtocolDefinition | null>(null);
    const [mode, setMode] = useState<'graph' | 'protocol'>('graph');
    const [membranePorts, setMembranePorts] = useState<PortDefinition[]>([]); // For Graph Mode

    useEffect(() => {
        if (file) {
            fileSystem.readFile(file).then(content => {
                try {
                    const data = JSON.parse(content);
                    if (file.type === 'protocol') {
                        setProtocol(data);
                        setMode('protocol');
                    } else {
                        setGraph(data);
                        setMode('graph');
                        // TODO: If graph has associated metadata for ports, load it. 
                        // Currently we just edit the graph structure.
                    }
                } catch {}
            });
        } else {
            // New Default
            setMode('graph');
        }
    }, [file]);

    const handleSave = () => {
        if (mode === 'protocol' && protocol) {
            if (file) fileSystem.saveFile(file.parentId === 'protocols' ? 'shared' : 'os', file.id, JSON.stringify(protocol));
            else fileSystem.createFile('os', `protocol_${Date.now()}.json`, 'protocol', JSON.stringify(protocol));
        } else {
            if (file) fileSystem.saveFile('home', file.id, JSON.stringify(graph));
            else fileSystem.createFile('home', `graph_${Date.now()}.graph`, 'graph', JSON.stringify(graph));
        }
    };

    const addMembranePort = (dir: 'input'|'output') => {
        const name = prompt("Port ID:");
        if(!name) return;
        
        const newPort: PortDefinition = { id: name, name, type: 'value', direction: dir };
        setMembranePorts(prev => [...prev, newPort]);

        // Auto-spawn node
        const type = dir === 'input' ? NodeType.GRAPH_INPUT : NodeType.GRAPH_OUTPUT;
        const id = `node_${name}`;
        const newNode: GraphNode = {
            id, type, x: dir === 'input' ? -200 : 200, y: 0,
            inputs: dir === 'output' ? [{id: 'in', name: 'In', type: 'value'}] : [],
            outputs: dir === 'input' ? [{id: 'out', name: 'Out', type: 'value'}] : [],
            data: { name }
        };
        setGraph(g => ({ ...g, nodes: [...g.nodes, newNode] }));
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] text-white">
            <div className="h-10 border-b border-white/10 flex items-center px-4 justify-between bg-[#111]">
                <div className="flex items-center gap-2 text-xs font-bold text-green-400">
                    <Hexagon className="w-4 h-4" /> 
                    {mode === 'protocol' ? 'PROTOCOL EDITOR' : 'HOLON CONSTRUCT'} 
                    <span className="opacity-50 font-normal text-white ml-2">{file?.name || 'Untitled'}</span>
                </div>
                <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 bg-green-800 hover:bg-green-700 rounded text-[10px] font-bold transition-colors">
                    <Save className="w-3 h-3" /> SAVE
                </button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
                {mode === 'protocol' && protocol ? (
                    <div className="flex-1 overflow-y-auto">
                        <ProtocolEditor protocol={protocol} onChange={setProtocol} />
                    </div>
                ) : (
                    <>
                        <div className="flex-1 relative">
                            <NodeCanvas graph={graph} onChange={setGraph} />
                        </div>
                        {/* Membrane Sidebar */}
                        <div className="w-60 border-l border-white/10 bg-[#161616] p-4 flex flex-col gap-4">
                            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Membrane Interface</div>
                            
                            <div className="space-y-2">
                                <button onClick={() => addMembranePort('input')} className="w-full py-1.5 bg-blue-900/30 border border-blue-500/30 rounded text-xs text-blue-300 flex items-center justify-center gap-2 hover:bg-blue-900/50">
                                    <ArrowRight className="w-3 h-3" /> Add Input Port
                                </button>
                                {membranePorts.filter(p => p.direction === 'input').map(p => (
                                    <div key={p.id} className="text-[10px] px-2 py-1 bg-black/30 rounded border border-white/5 flex justify-between text-neutral-300">
                                        {p.name}
                                        <span className="text-blue-400">{p.type}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <button onClick={() => addMembranePort('output')} className="w-full py-1.5 bg-orange-900/30 border border-orange-500/30 rounded text-xs text-orange-300 flex items-center justify-center gap-2 hover:bg-orange-900/50">
                                    <ArrowRight className="w-3 h-3" /> Add Output Port
                                </button>
                                {membranePorts.filter(p => p.direction === 'output').map(p => (
                                    <div key={p.id} className="text-[10px] px-2 py-1 bg-black/30 rounded border border-white/5 flex justify-between text-neutral-300">
                                        {p.name}
                                        <span className="text-orange-400">{p.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
