// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { midiAudio } from '../../../../services/MidiAudioEngine';
import { VirtualFile } from '../../../../types/filesystem';
import { Play, Square, Music, Loader2, AlertCircle, FolderOpen, Grid, Activity } from 'lucide-react';
import { fileSystem } from '../../../../services/FileSystem';
import { MenuBar } from '../../MenuBar';
import { FilePicker } from '../../FilePicker';
import { NodeType, NodeGraph } from '../../../../types/nodes';
import { signalEngine } from '../../../../services/SignalEngine';

interface MidiPlayerProps {
    initialFile?: VirtualFile;
}

// --- TAB 1: GLOBAL VISUALIZER ---
const VisualizerScene = () => {
    const groupRef = useRef<THREE.Group>(null);
    const barsRef = useRef<THREE.InstancedMesh>(null);
    const [dummy] = useState(() => new THREE.Object3D());
    const [analyer] = useState(() => midiAudio.getAnalyzer());

    // Setup instance mesh
    const count = 32;
    
    useFrame((state) => {
        if (!barsRef.current) return;
        
        const values = analyer.getValue(); 
        
        const t = state.clock.elapsedTime;
        
        for(let i=0; i<count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 3;
            
            const val = (values[i] as number) || -100;
            const height = Math.max(0.1, (val + 100) / 10);
            
            dummy.position.set(Math.cos(angle) * radius, height/2 - 2, Math.sin(angle) * radius);
            dummy.rotation.y = -angle;
            dummy.scale.set(0.4, height, 0.4);
            dummy.updateMatrix();
            
            barsRef.current.setMatrixAt(i, dummy.matrix);
            
            const color = new THREE.Color().setHSL(i/count + t*0.1, 0.8, 0.5);
            barsRef.current.setColorAt(i, color);
        }
        barsRef.current.instanceMatrix.needsUpdate = true;
        if (barsRef.current.instanceColor) barsRef.current.instanceColor.needsUpdate = true;
        
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.005;
        }
    });

    return (
        <group ref={groupRef}>
             <instancedMesh ref={barsRef} args={[undefined, undefined, count]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial metalness={0.8} roughness={0.2} />
             </instancedMesh>
             <ActiveNoteOrb />
        </group>
    );
};

const ActiveNoteOrb = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    useFrame(() => {
        if (!meshRef.current) return;
        const notes = midiAudio.getCurrentNotes();
        const scale = 1 + notes.length * 0.2;
        meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
        
        const color = new THREE.Color('#ff00ff');
        if (notes.length > 0) {
            const pitch = notes[0].midi;
            color.setHSL((pitch % 12) / 12, 1, 0.5);
        }
        (meshRef.current.material as THREE.MeshStandardMaterial).color.lerp(color, 0.1);
        (meshRef.current.material as THREE.MeshStandardMaterial).emissive.lerp(color, 0.1);
    });

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial color="#222" emissive="#000" emissiveIntensity={0.8} roughness={0.1} metalness={0.5} />
        </mesh>
    );
};

// --- TAB 2: HOLON TRACK VISUALIZER ---

const HolonTrackRenderer: React.FC<{ trackIndex: number, offset: number, total: number }> = ({ trackIndex, total }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const lineRef = useRef<THREE.Line>(null);
    
    // Trail State
    const trailLength = 200;
    const [trailPositions] = useState(() => new Float32Array(trailLength * 3));
    
    const lineGeometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        return geo;
    }, [trailPositions]);

    // Generate Node Graph Logic
    const graph = useMemo<NodeGraph>(() => ({
        id: `track_${trackIndex}`,
        nodes: [
            { id: 'time', type: NodeType.TIME, x: 0, y: 0, inputs: [], outputs: [{id:'o', name:'O', type:'value'}], data: {} },
            { id: 'audio', type: NodeType.AUDIO_ANALYZE, x: 0, y: 100, inputs: [], outputs: [{id:'freq', name:'Freq', type:'value'}, {id:'amp', name:'Amp', type:'value'}], data: { trackIndex } },
            
            // Logic A: Geometry (Rotating Circle, Radius = Freq)
            // Frequency (0-22000) -> Map to (2-10)
            { id: 'map_freq', type: NodeType.MATH_MAP, x: 100, y: 100, inputs: [{id:'in', name:'In', type:'value'}], outputs: [{id:'out', name:'Out', type:'value'}], data: { inMin: 0, inMax: 2000, outMin: 4, outMax: 12 } },
            { id: 'mult_time', type: NodeType.MATH_MULT, x: 100, y: 0, inputs: [{id:'a', name:'A', type:'value'}, {id:'b', name:'B', type:'value'}], outputs: [{id:'o', name:'O', type:'value'}], data: { value: 1.0 } },
            { id: 'polar', type: NodeType.CONVERT_POLAR, x: 200, y: 50, inputs: [{id:'radius', name:'R', type:'value'}, {id:'angle', name:'A', type:'value'}], outputs: [{id:'pt', name:'Pt', type:'geometry'}], data: {} },
            { id: 'vis', type: NodeType.VISUAL_OUTPUT, x: 300, y: 50, inputs: [{id:'geometry', name:'G', type:'geometry'}], outputs: [], data: {} },

            // Logic B: Texture/Color Blend
            // Amplitude (0-1) -> Mix Factor
            { id: 'prop', type: NodeType.PROPERTY_OUTPUT, x: 200, y: 200, inputs: [{id:'value', name:'V', type:'value'}], outputs: [], data: { property: 'mixFactor' } }
        ],
        edges: [
            { id: 'e1', sourceNodeId: 'time', sourceSocketId: 'o', targetNodeId: 'mult_time', targetSocketId: 'a' },
            { id: 'e2', sourceNodeId: 'mult_time', sourceSocketId: 'o', targetNodeId: 'polar', targetSocketId: 'angle' },
            
            { id: 'e3', sourceNodeId: 'audio', sourceSocketId: 'freq', targetNodeId: 'map_freq', targetSocketId: 'in' },
            { id: 'e4', sourceNodeId: 'map_freq', sourceSocketId: 'out', targetNodeId: 'polar', targetSocketId: 'radius' },
            { id: 'e5', sourceNodeId: 'polar', sourceSocketId: 'pt', targetNodeId: 'vis', targetSocketId: 'geometry' },

            { id: 'e6', sourceNodeId: 'audio', sourceSocketId: 'amp', targetNodeId: 'prop', targetSocketId: 'value' }
        ]
    }), [trackIndex]);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        const audioData = midiAudio.getAudioData(); // This call triggers updates, specific data pulled inside SignalEngine via trackIndex

        // 1. Evaluate Geometry
        // SignalEngine returns local coordinate (Polar conversion result)
        const vec = signalEngine.evaluateGraph(graph, time, audioData, `track_${trackIndex}`);
        
        if (meshRef.current) {
            meshRef.current.position.set(vec.x, vec.y, vec.z);
        }

        // 2. Update Trail
        for (let i = trailLength - 1; i > 0; i--) {
            trailPositions[i * 3] = trailPositions[(i - 1) * 3];
            trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
            trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
        }
        trailPositions[0] = vec.x;
        trailPositions[1] = vec.y;
        trailPositions[2] = vec.z;
        
        if (lineRef.current) {
            lineRef.current.geometry.attributes.position.needsUpdate = true;
        }

        // 3. Evaluate Properties (Mix Factor)
        const props = signalEngine.evaluateProperties(graph, time, audioData, `track_${trackIndex}`);
        const mix = Math.max(0, Math.min(1, props.mixFactor || 0));

        if (matRef.current) {
            matRef.current.uniforms.uMix.value = mix;
        }
    });

    // Shader for "Texture" Interpolation
    const shader = useMemo(() => ({
        uniforms: {
            uMix: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uMix;
            varying vec2 vUv;
            void main() {
                vec3 colA = vec3(0.1, 0.1, 0.1); // Silent (Gray)
                vec3 colB = vec3(0.0, 0.8, 1.0); // Active (Blue)
                vec3 colC = vec3(1.0, 0.0, 0.8); // High (Pink)
                
                vec3 activeCol = mix(colB, colC, uMix); 
                vec3 finalCol = mix(colA, activeCol, smoothstep(0.01, 0.2, uMix));
                
                // Simple sphere shading
                float d = 1.0 - distance(vUv, vec2(0.5));
                float alpha = d > 0.5 ? 1.0 : 0.0; // Hard edge circle for performance
                
                gl_FragColor = vec4(finalCol * d * 2.0, 1.0);
            }
        `
    }), []);

    // Spherical Distribution
    // Rotate the plane of the orbit based on track index
    const rotX = (trackIndex / total) * Math.PI; 
    const rotY = (trackIndex / total) * Math.PI * 2;

    return (
        <group rotation={[rotX, rotY, 0]}>
            {/* @ts-ignore */}
            <line ref={lineRef as any} geometry={lineGeometry}>
                <lineBasicMaterial color={`hsl(${trackIndex / total * 360}, 100%, 50%)`} transparent opacity={0.4} linewidth={1} />
            </line>
            <mesh ref={meshRef}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <shaderMaterial ref={matRef} args={[shader]} transparent />
            </mesh>
        </group>
    );
}

const HolonScene = () => {
    const trackCount = midiAudio.getTrackCount();
    const tracks = Array.from({length: trackCount}, (_, i) => i);

    return (
        <group>
            {tracks.map(i => (
                <HolonTrackRenderer key={i} trackIndex={i} offset={0} total={trackCount || 1} />
            ))}
            {trackCount === 0 && (
                <mesh>
                    <sphereGeometry args={[1, 32, 32]} />
                    <meshBasicMaterial color="red" wireframe />
                </mesh>
            )}
        </group>
    );
};

// --- MAIN APP ---

export const MidiPlayerApp: React.FC<MidiPlayerProps> = ({ initialFile }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSong, setCurrentSong] = useState(initialFile?.name || "No File Loaded");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFilePicker, setShowFilePicker] = useState(false);
    const [activeTab, setActiveTab] = useState<'global' | 'holon'>('global');
    
    const loadMidi = async (file: VirtualFile) => {
        setIsLoading(true);
        setError(null);
        setCurrentSong(file.name);
        midiAudio.stop();
        setIsPlaying(false);

        try {
            const buffer = await fileSystem.readFile(file);
            if (buffer && buffer instanceof ArrayBuffer) {
                await midiAudio.loadArrayBuffer(buffer);
                console.log("MIDI Loaded Successfully:", file.name);
            } else {
                throw new Error("Invalid file content");
            }
        } catch (e: any) {
            console.error("Failed to load MIDI", e);
            setError(e.message || "Failed to load MIDI");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (initialFile) loadMidi(initialFile);
        return () => midiAudio.stop();
    }, [initialFile]);

    const handlePlay = async () => {
        if (error || isLoading) return;
        try {
            await midiAudio.initialize();
            midiAudio.play();
            setIsPlaying(true);
        } catch (e: any) {
            setError(e.message || "Playback Failed");
        }
    };

    const handleStop = () => {
        midiAudio.stop();
        setIsPlaying(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.mid') || file.name.endsWith('.midi'))) {
            setIsLoading(true);
            setError(null);
            try {
                const buffer = await file.arrayBuffer();
                await midiAudio.loadArrayBuffer(buffer);
                setCurrentSong(file.name);
                handlePlay();
            } catch(e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const menuData = [
        {
            label: 'File',
            items: [
                { label: 'Open MIDI...', action: () => setShowFilePicker(true), shortcut: 'Ctrl+O' },
                { divider: true },
                { label: 'Exit', action: () => {} }
            ]
        },
        {
            label: 'Playback',
            items: [
                { label: 'Play', action: handlePlay, disabled: isLoading || !!error },
                { label: 'Stop', action: handleStop, disabled: !isPlaying }
            ]
        }
    ];

    return (
        <div className="flex flex-col h-full bg-[#111] text-white font-mono text-xs">
            <MenuBar menus={menuData} />
            
            <FilePicker 
                isOpen={showFilePicker} 
                onCancel={() => setShowFilePicker(false)} 
                onSelect={(f) => { loadMidi(f); setShowFilePicker(false); }}
                extensions={['audio']}
                title="Open MIDI Sequence"
                allowImport
            />

            {/* Tab Bar */}
            <div className="flex border-b border-white/10 bg-[#161616]">
                <button 
                    onClick={() => setActiveTab('global')}
                    className={`flex-1 py-2 flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'global' ? 'border-cyan-500 text-white bg-white/5' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
                >
                    <Grid className="w-3 h-3" /> Global View
                </button>
                <button 
                    onClick={() => setActiveTab('holon')}
                    className={`flex-1 py-2 flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'holon' ? 'border-purple-500 text-white bg-white/5' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
                >
                    <Activity className="w-3 h-3" /> Holon Tracks
                </button>
            </div>

            <div 
                className="flex-1 flex flex-col relative overflow-hidden"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
            >
                <div className="flex-1 relative bg-black flex items-center justify-center">
                    <Canvas camera={{ position: [0, 10, 20], fov: 45 }}>
                        <color attach="background" args={['#050505']} />
                        <fog attach="fog" args={['#050505', 10, 50]} />
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} intensity={1} />
                        
                        {activeTab === 'global' ? <VisualizerScene /> : <HolonScene />}
                        
                        <OrbitControls autoRotate autoRotateSpeed={0.2} />
                        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
                    </Canvas>
                    
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
                            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                        </div>
                    )}
                    
                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 p-4 text-center">
                            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                            <span className="text-red-400 text-xs font-mono">{error}</span>
                        </div>
                    )}

                    <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
                        <div className="bg-black/50 backdrop-blur px-3 py-1 rounded border border-white/10 text-xs font-mono flex items-center gap-2">
                            <Music className="w-3 h-3 text-cyan-400" />
                            {currentSong}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="h-16 bg-[#1a1a1a] border-t border-white/10 flex items-center px-6 gap-4 shrink-0 z-10">
                    <button 
                        onClick={isPlaying ? handleStop : handlePlay}
                        disabled={isLoading || !!error}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all 
                            ${isPlaying ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-green-500 hover:bg-green-400 text-black'}
                            ${(isLoading || !!error) ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                    
                    <div className="flex-1">
                        <div className="h-1 bg-white/10 rounded overflow-hidden">
                            {isPlaying && <div className="h-full bg-cyan-500 w-full animate-pulse opacity-50"></div>}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowFilePicker(true)} className="flex items-center gap-2 text-neutral-500 text-xs hover:text-white transition-colors">
                            <FolderOpen className="w-4 h-4" />
                            <span>Open</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};