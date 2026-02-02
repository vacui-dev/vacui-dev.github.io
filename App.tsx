// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useState, useCallback, useEffect, Suspense } from 'react';
const SimulationScene = React.lazy(() => import('./components/Simulation/SimulationScene').then(module => ({ default: module.SimulationScene })));
import { WorldConfig, Entity, Constraint } from './types/simulation';
import { NodeType } from './types/nodes';
import { SensorOverlay } from './components/SensorOverlay';
import { runtimeIntegration } from './services/RuntimeIntegration';
import { DesktopEnvironment } from './components/OS/DesktopEnvironment';
import { Loader2 } from 'lucide-react';

// Initial Template with Node Graph Entity
const DEFAULT_CONFIG: WorldConfig = {
    gravity: { x: 0, y: 0, z: 0 }, 
    environment: 'night',
    description: "The Alchemist's Lab",
    physicsRules: [
        { id: 'vortex_center', name: 'Swirling Void', type: 'force_field', script: 'applyVortex', active: true }
    ],
    entities: [
        // 4D Shape
        { 
            id: "tesseract_prime", name: "Dimensional Anchor", type: "HyperShape", 
            position: { x: -5, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, args: [1], mass: 0, color: "#00ffff",
            geometryParams: { dimensions: 4, vertices: [], edges: [], rotationSpeed: [0.5, 0.3, 0.2] }
        },
        // Audio-Reactive Node Graph Entity
        {
            id: "audio_mandala",
            name: "Audio Mandala",
            type: "Harmonic",
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            args: [1],
            mass: 0,
            color: "#ff0088",
            harmonicParams: {
                // Define a Graph that maps Time -> Angle and Audio -> Radius
                nodeGraph: {
                    nodes: [
                        { id: 'n_time', type: NodeType.TIME, x: 0, y: 0, inputs: [], outputs: [{ id: 'time-out', name: 'Time', type: 'value' }], data: {} },
                        { id: 'n_analyze', type: NodeType.AUDIO_ANALYZE, x: 0, y: 100, inputs: [], outputs: [{ id: 'analyze-amp', name: 'Amp', type: 'value' }], data: {} },
                        { id: 'n_scale_time', type: NodeType.MATH_MULT, x: 100, y: 0, inputs: [{ id: 'mult-a', name: 'A', type: 'value' }, { id: 'mult-b', name: 'B', type: 'value' }], outputs: [{ id: 'mult-out', name: 'Out', type: 'value' }], data: { value: 2.0 } }, // Speed
                        { id: 'n_scale_amp', type: NodeType.MATH_MULT, x: 100, y: 100, inputs: [{ id: 'mult-a', name: 'A', type: 'value' }, { id: 'mult-b', name: 'B', type: 'value' }], outputs: [{ id: 'mult-out', name: 'Out', type: 'value' }], data: { value: 5.0 } }, // Radius Scale
                        { id: 'n_polar', type: NodeType.CONVERT_POLAR, x: 200, y: 50, inputs: [{ id: 'polar-r', name: 'R', type: 'value' }, { id: 'polar-a', name: 'A', type: 'value' }], outputs: [{ id: 'polar-out', name: 'Pt', type: 'point' }], data: {} },
                        { id: 'n_out', type: NodeType.VISUAL_OUTPUT, x: 300, y: 50, inputs: [{ id: 'vis-geo', name: 'Geometry', type: 'point' }], outputs: [], data: {} }
                    ],
                    edges: [
                        { id: 'e1', sourceNodeId: 'n_time', sourceSocketId: 'time-out', targetNodeId: 'n_scale_time', targetSocketId: 'mult-a' },
                        { id: 'e2', sourceNodeId: 'n_analyze', sourceSocketId: 'analyze-amp', targetNodeId: 'n_scale_amp', targetSocketId: 'mult-a' },
                        
                        // Constants for multipliers (Simulated by setting 'mult-b' value manually in evaluator if not connected, or creating value node)
                        // For now, let's rely on the evaluator defaults or add value nodes.
                        // Adding value nodes for completeness in future, but SignalEngine defaults to 0 if missing. 
                        // To make it work, we need constant nodes or the evaluator needs to handle defaults better.
                        // Let's inject implicit constant behavior in SignalEngine for unconnected inputs if data.value exists? Yes.
                        
                        { id: 'e3', sourceNodeId: 'n_scale_time', sourceSocketId: 'mult-out', targetNodeId: 'n_polar', targetSocketId: 'polar-a' },
                        { id: 'e4', sourceNodeId: 'n_scale_amp', sourceSocketId: 'mult-out', targetNodeId: 'n_polar', targetSocketId: 'polar-r' },
                        { id: 'e5', sourceNodeId: 'n_polar', sourceSocketId: 'polar-out', targetNodeId: 'n_out', targetSocketId: 'vis-geo' }
                    ]
                },
                // Fallback legacy params
                layers: [], projection: 'polar', speed: 0.05, trailLength: 300, scale: 6, resolution: 1
            }
        },
        ...Array.from({length: 5}).map((_, i) => ({
            id: `h_${i}`, name: "Hydrogen", type: "Molecule" as const,
            position: {x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10, z: (Math.random()-0.5)*10},
            rotation: {x:0,y:0,z:0}, args: [0.2], mass: 1, color: "#fff",
            chemicalParams: { element: 'H', atomicNumber: 1, valency: 1, isReactive: true }
        }))
    ],
    constraints: []
};

export default function App() {
  const [config, setConfig] = useState<WorldConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simKey, setSimKey] = useState(0); 
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  
  useEffect(() => {
      const unsubStatus = runtimeIntegration.onStatusChange((status) => {
          console.log("Neural Link Status:", status);
      });
      
      const unsubCmd = runtimeIntegration.subscribe((cmd) => {
          if (cmd.type === 'RESET') {
              setSimKey(k => k + 1);
          } else if (cmd.type === 'SPAWN_ENTITY') {
              const id = `node_${Date.now()}`;
              const angle = Math.random() * Math.PI * 2;
              const dist = 5 + Math.random() * 10;
              const newEntity: Entity = {
                  id,
                  name: "Recursion Node",
                  type: "Sphere",
                  args: [0.5],
                  position: { x: Math.cos(angle)*dist, y: (Math.random()-0.5)*5, z: Math.sin(angle)*dist },
                  rotation: { x:0, y:0, z:0 },
                  mass: 1,
                  color: "#ff00ff",
                  roughness: 0.2
              };
              setConfig(prev => ({ ...prev, entities: [...prev.entities, newEntity] }));
          }
      });

      return () => {
          unsubStatus();
          unsubCmd();
      };
  }, []);

  const handleLoadSimulation = useCallback((newConfig: WorldConfig) => {
      setConfig(newConfig);
      setSimKey(k => k + 1);
      setSelectedEntityId(null);
  }, []);

  const updateGlobal = useCallback((key: keyof WorldConfig, val: any) => {
      setConfig(prev => ({ ...prev, [key]: val }));
  }, []);

  const updateEntity = useCallback((id: string, updates: Partial<Entity>) => {
      setConfig(prev => ({
          ...prev,
          entities: prev.entities.map(e => e.id === id ? { ...e, ...updates } : e)
      }));
  }, []);

  const addEntity = useCallback((entity: Entity) => {
      setConfig(prev => ({ ...prev, entities: [...prev.entities, entity] }));
      setSelectedEntityId(entity.id);
  }, []);

  const deleteEntity = useCallback((id: string) => {
      setConfig(prev => ({
          ...prev,
          entities: prev.entities.filter(e => e.id !== id),
          constraints: prev.constraints.filter(c => c.bodyA !== id && c.bodyB !== id)
      }));
      if (selectedEntityId === id) setSelectedEntityId(null);
  }, [selectedEntityId]);

  return (
    <div className="w-full h-screen relative bg-black text-white overflow-hidden flex flex-col font-sans">
      <div className="absolute inset-0 z-0 select-none">
        <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>}>
            <SimulationScene 
                config={config} 
                simulationKey={simKey} 
                onObjectSelect={setSelectedEntityId} 
            />
        </Suspense>
      </div>
      <div className="absolute inset-0 z-10 pointer-events-none">
          <DesktopEnvironment 
              onLoadSimulation={handleLoadSimulation}
              worldState={{
                  config,
                  selectedId: selectedEntityId,
                  onUpdateGlobal: updateGlobal,
                  onUpdateEntity: updateEntity,
                  onAddEntity: addEntity,
                  onDeleteEntity: deleteEntity,
                  onSelect: setSelectedEntityId
              }}
          />
      </div>
      <div className="pointer-events-none z-50">
          <SensorOverlay />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
              <div className="text-center space-y-4">
                <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mx-auto" />
                <div className="font-mono text-cyan-400 text-lg animate-pulse">SYSTEM KERNEL UPDATING...</div>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-900/90 border border-red-500 p-6 rounded-lg max-w-md pointer-events-auto text-center">
              <div className="text-red-200 font-bold mb-2">SYSTEM ERROR</div>
              <div className="text-sm text-red-100">{error}</div>
              <button onClick={() => setError(null)} className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 rounded text-xs font-mono">ACKNOWLEDGE</button>
            </div>
          )}
      </div>
    </div>
  );
}
