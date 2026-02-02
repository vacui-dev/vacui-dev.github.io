// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import * as THREE from 'three';
import { meshProcessing, TransferParams } from '../../../../services/MeshProcessingService';
import { RefreshCw, Box, CheckCircle2 } from 'lucide-react';

export const MeshLabApp: React.FC = () => {
    const [params, setParams] = useState<TransferParams>({
        areSourceUVsMirrored: false,
        posScoreWeight: 0.001,
        requireMaterialMatch: false
    });

    // Mock Meshes for Demo
    const sourceGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1, 4, 4, 4), []);
    const targetGeo = useMemo(() => new THREE.SphereGeometry(0.6, 16, 16), []);
    const [resultGeo, setResultGeo] = useState<THREE.BufferGeometry | null>(null);
    const [status, setStatus] = useState('Idle');

    const handleTransfer = () => {
        setStatus('Processing...');
        setTimeout(() => {
            try {
                const res = meshProcessing.transferShape(sourceGeo, targetGeo, params);
                setResultGeo(res);
                setStatus('Complete');
            } catch(e) {
                setStatus('Error');
                console.error(e);
            }
        }, 100);
    };

    return (
        <div className="flex h-full bg-[#111] text-white font-mono text-xs">
            
            {/* Left Config Panel */}
            <div className="w-64 border-r border-white/10 bg-[#161616] flex flex-col">
                <div className="p-4 border-b border-white/10 font-bold flex items-center gap-2">
                    <Box className="w-4 h-4 text-cyan-400" />
                    <span>MESH LAB</span>
                </div>

                <div className="p-4 space-y-6 overflow-y-auto flex-1">
                    <div className="space-y-2">
                        <div className="text-[10px] opacity-50 uppercase tracking-wider">Parameters</div>
                        
                        <div className="flex items-center justify-between">
                            <label>Mirror UVs</label>
                            <input type="checkbox" checked={params.areSourceUVsMirrored} onChange={e => setParams({...params, areSourceUVsMirrored: e.target.checked})} />
                        </div>

                        <div>
                            <label className="block mb-1">Pos Score Weight</label>
                            <input type="number" step="0.001" value={params.posScoreWeight} onChange={e => setParams({...params, posScoreWeight: parseFloat(e.target.value)})} className="w-full bg-black border border-white/10 rounded px-2 py-1" />
                        </div>
                    </div>

                    <button 
                        onClick={handleTransfer}
                        className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded flex items-center justify-center gap-2 font-bold"
                    >
                        <RefreshCw className="w-4 h-4" /> RUN TRANSFER
                    </button>

                    <div className="bg-black/30 p-2 rounded border border-white/5 text-[10px] text-center text-neutral-400">
                        Status: <span className={status === 'Complete' ? 'text-green-400' : ''}>{status}</span>
                    </div>
                </div>
            </div>

            {/* Viewport */}
            <div className="flex-1 relative bg-gradient-to-b from-[#222] to-[#000] flex flex-col">
                <div className="flex-1 grid grid-cols-2">
                    <div className="border-r border-white/10 relative">
                        <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-[10px]">Source (Box)</div>
                        <Canvas camera={{ position: [2, 2, 2] }}>
                            <Stage intensity={0.5}>
                                <mesh geometry={sourceGeo}>
                                    <meshStandardMaterial wireframe color="#00aaff" />
                                </mesh>
                            </Stage>
                            <OrbitControls autoRotate />
                        </Canvas>
                    </div>
                    <div className="relative">
                        <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-[10px]">Target (Sphere)</div>
                        <Canvas camera={{ position: [2, 2, 2] }}>
                            <Stage intensity={0.5}>
                                <mesh geometry={targetGeo}>
                                    <meshStandardMaterial wireframe color="#ffaa00" />
                                </mesh>
                            </Stage>
                            <OrbitControls autoRotate />
                        </Canvas>
                    </div>
                </div>
                
                {/* Result Area */}
                <div className="h-1/2 border-t border-white/10 relative">
                    <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-[10px] flex items-center gap-2">
                        {resultGeo ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : null} Result
                    </div>
                    <Canvas camera={{ position: [2, 2, 2] }}>
                        <Stage intensity={0.5}>
                            {resultGeo && (
                                <mesh geometry={resultGeo}>
                                    <meshStandardMaterial color="#ffffff" flatShading />
                                </mesh>
                            )}
                        </Stage>
                        <OrbitControls autoRotate />
                    </Canvas>
                </div>
            </div>
        </div>
    );
};
