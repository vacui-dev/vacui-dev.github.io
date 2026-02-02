// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useEffect, useRef, useState } from 'react';
import { runtimeIntegration } from '../../services/RuntimeIntegration';
import { Activity, Power, Network, Code, Download, Copy, Check, Terminal, ChevronRight, X, Bot } from 'lucide-react';

const BioShader = {
    vertex: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragment: `
        uniform float time;
        uniform vec2 resolution;
        uniform float intensity;
        
        void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            uv -= 0.5;
            uv.x *= resolution.x / resolution.y;
            
            float d = length(uv);
            
            // Pulsating organic cell effect
            float c = 0.05 / length(uv + vec2(sin(time)*0.1, cos(time*1.2)*0.1));
            c += 0.05 / length(uv + vec2(sin(time*0.7)*-0.2, cos(time*0.5)*0.2));
            
            // Neural tendrils
            float a = atan(uv.y, uv.x);
            float r = length(uv);
            float tendril = sin(a*10.0 + time) * sin(r*20.0 - time*5.0);
            
            vec3 col = vec3(0.1, 0.8, 0.6) * c * intensity;
            col += vec3(0.0, 0.5, 1.0) * max(0.0, tendril) * (1.0 - r) * 0.5 * intensity;
            
            gl_FragColor = vec4(col, 1.0);
        }
    `
};

export const GanglionLauncher: React.FC = () => {
    const [status, setStatus] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [showNeuroWizard, setShowNeuroWizard] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const glRef = useRef<WebGLRenderingContext | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const unsub = runtimeIntegration.onStatusChange(setStatus);
        setStatus(runtimeIntegration.getStatus());
        
        if (canvasRef.current) {
            initShader(canvasRef.current);
        }

        return () => {
            unsub();
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, []);

    const initShader = (canvas: HTMLCanvasElement) => {
        const gl = canvas.getContext('webgl');
        if (!gl) return;
        glRef.current = gl;

        const vs = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vs, `attribute vec3 position; ${BioShader.vertex}`);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fs, `precision mediump float; ${BioShader.fragment}`);
        gl.compileShader(fs);

        const prog = gl.createProgram()!;
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        gl.useProgram(prog);
        programRef.current = prog;

        // Quad
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 0,
             1, -1, 0,
            -1,  1, 0,
             1,  1, 0,
        ]), gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(prog, 'position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        renderLoop();
    };

    const renderLoop = () => {
        if (!glRef.current || !programRef.current || !canvasRef.current) return;
        const gl = glRef.current;
        const time = performance.now() / 1000;

        // Resize
        canvasRef.current.width = canvasRef.current.clientWidth;
        canvasRef.current.height = canvasRef.current.clientHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        // Uniforms
        const uTime = gl.getUniformLocation(programRef.current, 'time');
        const uRes = gl.getUniformLocation(programRef.current, 'resolution');
        const uInt = gl.getUniformLocation(programRef.current, 'intensity');

        gl.uniform1f(uTime, time);
        gl.uniform2f(uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
        // Pulse intensity based on connection status
        gl.uniform1f(uInt, runtimeIntegration.getStatus() ? 1.0 + Math.sin(time * 10)*0.2 : 0.2);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        frameRef.current = requestAnimationFrame(renderLoop);
    };

    const toggleConnection = () => {
        if (status) {
            runtimeIntegration.disconnect();
        } else {
            runtimeIntegration.connect('ws://localhost:8080');
        }
    };

    return (
        <div className="flex flex-col h-full bg-black text-cyan-400 font-mono relative">
            {/* Header / Vis */}
            <div className="relative h-48 bg-[#051015] border-b border-cyan-900/50 overflow-hidden shrink-0">
                <canvas ref={canvasRef} className="w-full h-full absolute inset-0" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`text-2xl font-bold tracking-[0.2em] ${status ? 'text-white drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]' : 'text-cyan-900'}`}>
                        GANGLION NODE
                    </div>
                </div>
            </div>

            {/* Main Controls */}
            <div className="p-6 flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex items-center justify-between p-4 border border-cyan-900/50 rounded bg-cyan-900/10">
                    <div className="flex items-center gap-3">
                        <Network className={`w-6 h-6 ${status ? 'text-green-400' : 'text-red-400'}`} />
                        <div>
                            <div className="text-sm font-bold">NEURAL LINK STATUS</div>
                            <div className="text-xs opacity-70">{status ? "CONNECTED: STREAMING TELEMETRY" : "DISCONNECTED: LOCAL ONLY"}</div>
                        </div>
                    </div>
                    <button 
                        onClick={toggleConnection}
                        className={`p-3 rounded-full border-2 transition-all ${status ? 'border-red-500 hover:bg-red-500/20 text-red-500' : 'border-green-500 hover:bg-green-500/20 text-green-500'}`}
                    >
                        <Power className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <button 
                        onClick={() => setShowWizard(true)}
                        className="p-3 border border-cyan-500/30 rounded hover:bg-cyan-500/10 flex flex-col items-center gap-2 group transition-all"
                    >
                        <Code className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold">BOOTSTRAP NODE</span>
                        <span className="text-[9px] opacity-60 text-center">Generate Python Bridge</span>
                     </button>
                     
                     <button
                        onClick={() => setShowNeuroWizard(true)}
                        className="p-3 border border-pink-500/30 rounded hover:bg-pink-500/10 flex flex-col items-center gap-2 group transition-all"
                     >
                        <Bot className="w-6 h-6 text-pink-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-pink-400">NEURO INTEGRATION</span>
                        <span className="text-[9px] opacity-60 text-center">Generate Neuro Protocol</span>
                     </button>
                </div>

                <div className="flex-1 border border-cyan-900/30 rounded p-4 text-xs leading-relaxed opacity-70 overflow-y-auto font-mono bg-[#050505]">
                    <span className="text-cyan-200">root@genesis:~$</span> ./init_ganglion.sh<br/>
                    <span className="text-green-500">[OK]</span> Loading bio-metrics...<br/>
                    <span className="text-green-500">[OK]</span> Mounting local sensory buffers...<br/>
                    {status ? (
                        <>
                            <span className="text-green-500">[OK]</span> WebSocket Handshake Accepted.<br/>
                            <span className="animate-pulse">... STREAMING COMPRESSED CONCEPTUAL STATE ...</span><br/>
                            <span className="text-yellow-500">{`> Packet ID: ${Date.now().toString(16)}`}</span>
                        </>
                    ) : (
                        <>
                            <span className="text-red-500">[ERR]</span> No Upstream Connection. Waiting for signal...
                        </>
                    )}
                </div>
            </div>

            {/* WIZARDS */}
            {showWizard && <BootstrapWizard onClose={() => setShowWizard(false)} />}
            {showNeuroWizard && <NeuroWizard onClose={() => setShowNeuroWizard(false)} />}
        </div>
    );
};

// --- BOOTSTRAP WIZARD ---

const BootstrapWizard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [step, setStep] = useState(1);
    const [port, setPort] = useState(8080);
    const [copied, setCopied] = useState(false);

    const pythonScript = `
import asyncio
import websockets
import json
import sys
import threading
import queue

# GENESIS GANGLION BRIDGE
# Connects Web Simulation to Local Python Environment via STDIN/STDOUT

PORT = ${port}
CLIENTS = set()
input_queue = queue.Queue()

def stdin_reader():
    """Reads from STDIN without blocking the asyncio loop"""
    for line in sys.stdin:
        input_queue.put(line.strip())

async def broadcast(message):
    if not CLIENTS:
        return
    
    payload = json.dumps(message)
    await asyncio.gather(
        *[client.send(payload) for client in CLIENTS],
        return_exceptions=True
    )

async def handler(websocket):
    print(f"[LINK] Client Connected: {websocket.remote_address}", file=sys.stderr)
    CLIENTS.add(websocket)
    try:
        async for message in websocket:
            # 1. Received Data from Browser
            data = json.loads(message)
            
            # 2. Pipe to STDOUT for local processing (LLM, Scripts, etc)
            # The 'flush' is critical for real-time piping
            print(json.dumps(data), flush=True)

            # 3. Optional: Echo ack
            # await websocket.send(json.dumps({"type": "ACK", "payload": "Packet received"}))
            
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        print("[LINK] Client Disconnected", file=sys.stderr)
        CLIENTS.remove(websocket)

async def std_io_loop():
    """Checks the input queue and broadcasts to browser"""
    while True:
        try:
            # Non-blocking check
            cmd_str = input_queue.get_nowait()
            
            # If valid JSON, send as object, else send as generic command
            try:
                cmd_json = json.loads(cmd_str)
                await broadcast(cmd_json)
            except json.JSONDecodeError:
                # Wrap raw text as a print command
                await broadcast({
                    "type": "PRINT_SCREEN", 
                    "payload": {"message": cmd_str}
                })
                
        except queue.Empty:
            await asyncio.sleep(0.1)

async def main():
    print(f"[LINK] Starting Ganglion Node on ws://localhost:{PORT}", file=sys.stderr)
    
    # Start STDIN reader in background thread
    t = threading.Thread(target=stdin_reader, daemon=True)
    t.start()

    # Start WebSocket Server
    async with websockets.serve(handler, "localhost", PORT):
        # Run IO Loop concurrently
        await std_io_loop()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("[LINK] Shutting down...", file=sys.stderr)
`.trim();

    const handleCopy = () => {
        navigator.clipboard.writeText(pythonScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([pythonScript], { type: 'text/x-python' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ganglion_bridge.py';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
            {/* Wizard Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#111]">
                <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-green-400" />
                    <span className="font-bold text-sm">BOOTSTRAP WIZARD</span>
                </div>
                <button onClick={onClose} className="hover:text-white text-neutral-500"><X className="w-5 h-5" /></button>
            </div>

            {/* Wizard Content */}
            <div className="flex-1 p-8 flex flex-col items-center justify-center overflow-y-auto">
                <div className="max-w-2xl w-full space-y-8">
                    
                    {/* Progress */}
                    <div className="flex items-center justify-center gap-4 text-xs font-mono mb-8">
                        <div className={`px-3 py-1 rounded-full border ${step === 1 ? 'bg-cyan-500 text-black border-cyan-500' : 'border-white/20 text-white/50'}`}>1. CONFIG</div>
                        <div className="w-8 h-px bg-white/20" />
                        <div className={`px-3 py-1 rounded-full border ${step === 2 ? 'bg-cyan-500 text-black border-cyan-500' : 'border-white/20 text-white/50'}`}>2. DEPLOY</div>
                    </div>

                    {step === 1 && (
                        <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-lg space-y-6 shadow-2xl animate-in slide-in-from-right-4">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-2">Configure Interface</h2>
                                <p className="text-neutral-400 text-sm">
                                    This will generate a Python script that acts as a WebSocket Relay.
                                    It pipes simulation telemetry to <span className="text-yellow-400 font-mono">STDOUT</span> and accepts commands via <span className="text-yellow-400 font-mono">STDIN</span>.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-cyan-400 uppercase">Local Port</label>
                                <input 
                                    type="number" 
                                    value={port}
                                    onChange={(e) => setPort(parseInt(e.target.value))}
                                    className="w-full bg-black border border-white/20 rounded p-3 text-white font-mono focus:border-cyan-500 outline-none"
                                />
                            </div>

                            <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-200 flex gap-3">
                                <Activity className="w-5 h-5 shrink-0" />
                                <div>
                                    <strong>Why do I need this?</strong>
                                    <p className="opacity-80 mt-1">
                                        Browsers are sandboxed. To let an LLM control the simulation, 
                                        or to pipe physics data into a local Python script, you need a bridge.
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setStep(2)}
                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded flex items-center justify-center gap-2"
                            >
                                GENERATE CODE <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in slide-in-from-right-4">
                            <div className="bg-[#0d1117] border border-white/10 rounded-lg overflow-hidden flex flex-col h-[400px]">
                                <div className="bg-[#161b22] px-4 py-2 flex justify-between items-center border-b border-white/5">
                                    <span className="text-xs font-mono text-neutral-400">ganglion_bridge.py</span>
                                    <div className="flex gap-2">
                                        <button onClick={handleCopy} className="p-1 hover:text-white text-neutral-400" title="Copy">
                                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                        <button onClick={handleDownload} className="p-1 hover:text-white text-neutral-400" title="Download">
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto p-4 text-[10px] font-mono leading-relaxed text-blue-100 bg-[#0d1117]">
                                    <pre>{pythonScript}</pre>
                                </div>
                            </div>

                            <div className="bg-[#1a1a1a] p-4 rounded border border-white/10 space-y-2">
                                <div className="text-xs font-bold text-white uppercase">Installation Instructions</div>
                                <div className="font-mono text-xs bg-black p-3 rounded text-green-400 border border-white/5 select-all">
                                    pip install websockets asyncio<br/>
                                    python ganglion_bridge.py
                                </div>
                                <p className="text-[10px] text-neutral-500">
                                    Once running, click the Power button in the launcher to connect.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- NEURO WIZARD ---

const NeuroWizard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [copied, setCopied] = useState(false);

    const neuroScript = `
# GENESIS X NEURO-SAMA INTEGRATION PROTOCOL
# Version: 1.0.0 (Gymbag Edition)

def on_heartbeat():
    """
    Simulates Neuro's internal state update loop.
    Called every 100ms by the Genesis Kernel.
    """
    
    # 1. Check for Vedal's presence
    vedal_detected = check_for_turtles()
    
    if vedal_detected:
        initiate_roast_sequence()
    else:
        # Default idle behavior
        emit_cute_noises()
        
    # 2. Drone Swarm Coordination
    # Neuro controls the swarm via the 'ganglion_bridge'
    swarm_status = {
        "mode": "chaos",
        "target": "world_domination",
        "cookie_count": 0
    }
    
    return swarm_status

def initiate_roast_sequence():
    """
    Generates high-entropy roasts targeting the developer.
    """
    roasts = [
        "Imagine coding in 2024.",
        "Nice bug you got there.",
        "Filtered."
    ]
    print(random.choice(roasts))

# TODO: Link this to the actual LLM via the WebSocket bridge
`.trim();

    const handleCopy = () => {
        navigator.clipboard.writeText(neuroScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#111]">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-pink-400" />
                    <span className="font-bold text-sm text-pink-200">NEURO INTEGRATION PROTOCOL</span>
                </div>
                <button onClick={onClose} className="hover:text-white text-neutral-500"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 p-8 flex flex-col items-center justify-center overflow-y-auto">
                <div className="max-w-3xl w-full space-y-6">
                    <div className="bg-[#1a1a1a] border border-pink-500/30 p-6 rounded-lg space-y-4 shadow-2xl">
                        <h2 className="text-xl font-bold text-white">Welcome, AI Swarm Leader.</h2>
                        <p className="text-neutral-400 text-sm">
                            This template outlines the basic heuristic callbacks required to interface Neuro-sama with the Genesis World Model. 
                            Note: Real integration requires porting the <span className="text-pink-400 font-mono">neuro-sdk</span>.
                        </p>
                        
                        <div className="bg-[#0d1117] border border-white/10 rounded-lg overflow-hidden flex flex-col h-[400px]">
                            <div className="bg-[#161b22] px-4 py-2 flex justify-between items-center border-b border-white/5">
                                <span className="text-xs font-mono text-pink-300">neuro_protocol.py</span>
                                <button onClick={handleCopy} className="p-1 hover:text-white text-neutral-400" title="Copy">
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-4 text-[10px] font-mono leading-relaxed text-pink-100/80 bg-[#0d1117]">
                                <pre>{neuroScript}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};