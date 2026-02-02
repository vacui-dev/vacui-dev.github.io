
// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useEffect, useState } from 'react';
import { SimulationScene } from '../../../Simulation/SimulationScene';
import { runtimeIntegration, GameEvent } from '../../../../services/RuntimeIntegration';
import { warzoneConfig } from './warzoneConfig';
import { WorldConfig, Entity } from '../../../../types/simulation';
import { Trophy, RotateCcw } from 'lucide-react';
import { signalEngine } from '../../../../services/SignalEngine';
import { NodeType } from '../../../../types/nodes';

export const WarzoneApp: React.FC = () => {
    const [config, setConfig] = useState<WorldConfig>(warzoneConfig);
    const [simKey, setSimKey] = useState(0);
    const [winner, setWinner] = useState<string | null>(null);
    const [healths, setHealths] = useState<Record<string, number>>({ red: 100, blue: 100, green: 100, yellow: 100 });

    useEffect(() => {
        signalEngine.resetState();
        
        const handleGameEvent = (evt: GameEvent) => {
            if (evt.type === 'SHOOT') {
                spawnProjectile(evt.payload.entityId);
            }
        };

        const unsub = runtimeIntegration.subscribeToGameEvents(handleGameEvent);

        // Game Loop: Check Health
        const interval = setInterval(() => {
            const newHealths: Record<string, number> = {};
            let aliveCount = 0;
            let lastAlive = '';

            ['red', 'blue', 'green', 'yellow'].forEach(fid => {
                const id = `bot_${fid}`;
                // Read health via proper public API using "EntityID:NodeID" key convention
                const hp = signalEngine.getNodeState(`${id}:hp`) ?? 100;
                newHealths[fid] = hp;
                
                if (hp > 0) {
                    aliveCount++;
                    lastAlive = fid;
                } else {
                    // Kill Entity (Remove from Sim)
                    setConfig(prev => ({
                        ...prev,
                        entities: prev.entities.filter(e => e.id !== id)
                    }));
                }
            });

            setHealths(newHealths);

            if (aliveCount <= 1 && !winner && aliveCount > 0) {
                setWinner(lastAlive.toUpperCase());
                setTimeout(resetMatch, 5000);
            }
        }, 100);

        return () => {
            unsub();
            clearInterval(interval);
        };
    }, [winner]);

    const spawnProjectile = (sourceId: string) => {
        const source = config.entities.find(e => e.id === sourceId);
        if (!source) return;

        const projId = `proj_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        const velocity = { 
            x: (Math.random()-0.5) * 20, 
            y: 5, 
            z: (Math.random()-0.5) * 20 
        };

        const projectile: Entity = {
            id: projId,
            name: 'Plasma',
            type: 'Sphere',
            position: { ...source.position, y: source.position.y + 1 },
            rotation: { x:0, y:0, z:0 },
            args: [0.3],
            mass: 0.5,
            color: '#ffffff',
            emissive: '#ffffff',
            emissiveIntensity: 2,
            velocity, 
            triggerParams: {
                active: true,
                radius: 1.0,
                protocolId: 'damageable'
            },
            // IMPORTANT: Projectiles trigger damage but do NOT implement 'damageable' themselves.
            // However, to Output the damage signal via protocol, they need a graph.
            internalGraph: {
                id: 'bullet_brain',
                nodes: [
                    { id: 'dmg', type: NodeType.VALUE, x:0,y:0,inputs:[],outputs:[{id:'v',name:'V',type:'value'}],data:{value:10} },
                    { id: 'out', type: NodeType.GRAPH_OUTPUT, x:100,y:0,inputs:[{id:'i',name:'I',type:'value'}],outputs:[],data:{} }
                ],
                edges: [
                    { id: 'e1', sourceNodeId: 'dmg', sourceSocketId: 'v', targetNodeId: 'out', targetSocketId: 'i' }
                ]
            },
            exposedPorts: [
                { id: 'damage_out', name: 'Damage', type: 'value', direction: 'output' }
            ],
            portMappings: [
                { externalPortId: 'damage_out', internalNodeId: 'out', internalSocketId: 'i' }
            ]
        };

        // Add to config
        setConfig(prev => ({
            ...prev,
            entities: [...prev.entities, projectile]
        }));

        // Cleanup after 2s
        setTimeout(() => {
            setConfig(prev => ({
                ...prev,
                entities: prev.entities.filter(e => e.id !== projId)
            }));
        }, 2000);
    };

    const resetMatch = () => {
        signalEngine.resetState();
        setConfig(warzoneConfig);
        setSimKey(k => k + 1);
        setWinner(null);
        setHealths({ red: 100, blue: 100, green: 100, yellow: 100 });
    };

    return (
        <div className="relative w-full h-full bg-black overflow-hidden">
            <SimulationScene config={config} simulationKey={simKey} />
            
            {/* HUD */}
            <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
                {['red', 'blue', 'green', 'yellow'].map(fid => (
                    <div key={fid} className="bg-black/50 backdrop-blur border border-white/10 p-2 rounded w-24">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ background: fid === 'yellow' ? '#ffff00' : fid }} />
                            <span className="text-xs font-bold text-white uppercase">{fid}</span>
                        </div>
                        <div className="h-1 bg-neutral-700 rounded overflow-hidden">
                            <div 
                                className="h-full transition-all duration-300" 
                                style={{ width: `${Math.max(0, healths[fid])}%`, background: fid === 'yellow' ? '#ffff00' : fid }} 
                            />
                        </div>
                    </div>
                ))}
            </div>

            {winner && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 animate-in zoom-in duration-300 pointer-events-auto">
                    <div className="text-center">
                        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
                        <h1 className="text-4xl font-black text-white mb-2">{winner} WINS</h1>
                        <p className="text-neutral-400 text-sm font-mono">Resetting Zone...</p>
                    </div>
                </div>
            )}

            <button 
                onClick={resetMatch}
                className="absolute bottom-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded text-white z-50 pointer-events-auto"
                title="Reset Match"
            >
                <RotateCcw className="w-5 h-5" />
            </button>
        </div>
    );
};
