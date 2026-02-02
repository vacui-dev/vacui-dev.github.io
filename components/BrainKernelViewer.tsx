
// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState } from 'react';
import { Terminal, Copy, Check, X } from 'lucide-react';
import { CodeEditor } from './OS/CodeEditor';

// In a real build pipeline, we would import the file content directly.
// For this environment, we embed the matching content of vacui_kernel.py
const BRAIN_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
import math
import asyncio
import websockets
import json
from typing import Tuple, List, Dict

# --- CONFIGURATION ---
DIM_MODEL = 768
DIM_KEY = 64
N_MODULES = 8
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# --- MECHANISM 1: TEMPERATURE SCHEDULE ---
class TemperatureSchedule:
    def __init__(self, start_temp: float = 5.0, min_temp: float = 0.1, decay_rate: float = 0.9995):
        self.temp = start_temp
        self.min_temp = min_temp
        self.decay_rate = decay_rate
        self.steps = 0

    def get(self) -> float:
        return max(self.min_temp, self.temp)

    def step(self):
        # Exponential decay simulates "hardening" of neuroplasticity
        self.temp = max(self.min_temp, self.temp * self.decay_rate)
        self.steps += 1

# --- MECHANISM 6: CONTENT ADDRESSABLE BUS ---
class ContentAddressableBus:
    """
    Allows modules to find relevant data without knowing WHO sent it.
    Replaces direct module addressing.
    """
    def __init__(self, memory_dim: int, key_dim: int):
        self.memory_dim = memory_dim
        # Every memory write includes a small semantic Key
        self.bus_keys = {} # (version, id) -> KeyTensor
        self.bus_vals = {} # (version, id) -> ValueTensor

    def publish(self, module_id: int, version: int, key: torch.Tensor, value: torch.Tensor):
        self.bus_keys[(version, module_id)] = key
        self.bus_vals[(version, module_id)] = value

    def query(self, query_vec: torch.Tensor, version: int, top_k: int = 3) -> torch.Tensor:
        """
        Returns weighted sum of memories from the previous tick.
        """
        relevant_keys = [k for k in self.bus_keys.keys() if k[0] == version]
        if not relevant_keys: return torch.zeros(self.memory_dim).to(query_vec.device)
        
        keys = torch.stack([self.bus_keys[k] for k in relevant_keys])
        vals = torch.stack([self.bus_vals[k] for k in relevant_keys])
        
        # Dot product attention
        # query_vec: [Batch, KeyDim], keys: [NumMemories, KeyDim]
        scores = torch.matmul(query_vec, keys.T) 
        weights = F.softmax(scores, dim=-1)
        
        # Weighted sum of values
        return torch.matmul(weights, vals)

# --- SENTRY NETWORK (INPUT GATE) ---
class SentryNetwork(nn.Module):
    """
    Lightweight probe to estimate gradient magnitude without full backprop.
    """
    def __init__(self, input_dim):
        super().__init__()
        self.probe = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1) # Predicts estimated loss/difficulty
        )
    
    def estimate_difficulty(self, x):
        return self.probe(x)

class InputGate:
    def __init__(self, input_dim, gradient_threshold=10.0):
        self.gradient_threshold = gradient_threshold
        self.rejection_level = 0.0
        self.sentry = SentryNetwork(input_dim).to(DEVICE)
    
    def evaluate(self, x: torch.Tensor) -> Tuple[str, float]:
        # Fast Path: Use Sentry, not full backward pass
        with torch.no_grad():
            difficulty = self.sentry.estimate_difficulty(x).item()
        
        if difficulty > self.gradient_threshold:
            self.rejection_level = min(1.0, self.rejection_level + 0.1)
            return ('reject', 0.0)
        
        return ('accept', 1.0)

# --- DIFFERENTIABLE ROUTER ---
class DifferentiableRouter(nn.Module):
    def __init__(self, n_modules: int, hidden_dim: int, temp_schedule: TemperatureSchedule):
        super().__init__()
        self.router_net = nn.Linear(hidden_dim, n_modules)
        self.temp_schedule = temp_schedule
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        logits = self.router_net(x)
        temp = self.temp_schedule.get()
        
        # Gumbel-Sigmoid for independent binary decisions
        u = torch.rand_like(logits).clamp(1e-8, 1 - 1e-8)
        gumbel_noise = torch.log(u) - torch.log(1 - u)
        soft = torch.sigmoid((logits + gumbel_noise) / temp)
        
        # Straight-through estimator
        hard = (soft > 0.5).float()
        return hard - soft.detach() + soft 

# --- MAIN ARCHITECTURE ---
class VacuiNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.temp_schedule = TemperatureSchedule()
        self.bus = ContentAddressableBus(DIM_MODEL, DIM_KEY)
        self.input_gate = InputGate(DIM_MODEL)
        self.router = DifferentiableRouter(N_MODULES, DIM_MODEL, self.temp_schedule)
        
        # Modules (Simulated as distinct experts)
        self.modules = nn.ModuleList([
            nn.Sequential(
                nn.Linear(DIM_MODEL, DIM_MODEL * 4),
                nn.GELU(),
                nn.Linear(DIM_MODEL * 4, DIM_MODEL)
            ) for _ in range(N_MODULES)
        ])
        
        # Bus Projectors (Context Key Generation)
        self.key_proj = nn.Linear(DIM_MODEL, DIM_KEY)
        
        self.version = 0

    def forward(self, x):
        # 1. Input Gate (Sentry Check)
        status, _ = self.input_gate.evaluate(x.mean(dim=0))
        if status == 'reject':
            return None, []

        # 2. Context Query (Read from Bus, previous tick)
        query_key = self.key_proj(x.mean(dim=0))
        context = self.bus.query(query_key, max(0, self.version - 1))
        
        # Inject Context
        x_ctx = x + context.unsqueeze(0)

        # 3. Routing
        routing_decisions = self.router(x_ctx.mean(dim=1)) 
        
        # 4. Modular Execution
        output = torch.zeros_like(x)
        active_modules = []
        
        for i, module in enumerate(self.modules):
            activation = routing_decisions[:, i].mean()
            
            # Sparse Execution
            if activation > 0.5:
                mod_out = module(x_ctx)
                output += mod_out * activation
                active_modules.append(i)
                
                # Publish to Bus for next tick
                out_key = self.key_proj(mod_out.mean(dim=0).detach())
                self.bus.publish(i, self.version, out_key, mod_out.mean(dim=0).detach())

        self.version += 1
        self.temp_schedule.step()
        
        return output, active_modules

# --- RUNTIME LOOP ---
async def vacui_kernel_loop():
    model = VacuiNet().to(DEVICE)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
    
    uri = "ws://localhost:8080"
    print(f"VACUI KERNEL v2.1 [DEVICE: {DEVICE}]")
    print("Initializing Content-Addressable Bus...")
    
    async with websockets.connect(uri) as websocket:
        while True:
            # 1. Receive Telemetry
            msg = await websocket.recv()
            data = json.loads(msg)
            
            # Simulate Tensor Input from Telemetry
            # (In reality, this transforms World State -> Embeddings)
            state_vec = torch.randn(1, 10, DIM_MODEL).to(DEVICE) 
            
            # 2. Forward Pass
            optimizer.zero_grad()
            output, active = model(state_vec)
            
            if output is None:
                print(f"[Cycle {model.version}] Input Rejected by Sentry.")
                continue
                
            # 3. Dummy Loss (Simulating Fight Club Signal)
            # We optimize for curve area in real implementation
            loss = output.mean()
            loss.backward()
            optimizer.step()
            
            # 4. Reporting
            temp = model.temp_schedule.get()
            print(f"[Cycle {model.version}] Temp: {temp:.4f} | Active Modules: {active}")
            
            # 5. Feedback to Simulation
            if len(active) > 4:
                # If too many modules active, request entropy reduction
                await websocket.send(json.dumps({
                    "type": "TRIGGER_EVENT", 
                    "payload": {"event": "high_load", "value": len(active)}
                }))

if __name__ == "__main__":
    try:
        asyncio.run(vacui_kernel_loop())
    except KeyboardInterrupt:
        print("Kernel Shutdown.")
`;

interface BrainKernelViewerProps {
    onClose: () => void;
}

export const BrainKernelViewer: React.FC<BrainKernelViewerProps> = ({ onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(BRAIN_CODE);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-in fade-in duration-200">
            <div className="w-full max-w-5xl h-[85vh] bg-[#0d1117] border border-neutral-700 rounded-lg shadow-2xl flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-[#161b22]">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-5 h-5 text-green-400" />
                        <div>
                            <h2 className="text-sm font-mono font-bold text-neutral-200">vacui_kernel.py</h2>
                            <p className="text-[10px] text-neutral-500 font-mono">Vacui Neural Architecture v2.1</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleCopy}
                            className="p-2 hover:bg-white/5 rounded text-neutral-400 hover:text-white transition-colors"
                            title="Copy Code"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-red-900/20 rounded text-neutral-400 hover:text-red-400 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Code Content */}
                <div className="flex-1 overflow-hidden">
                    <CodeEditor 
                        value={BRAIN_CODE} 
                        language="python" 
                        readOnly={true} 
                    />
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-[#161b22] border-t border-neutral-800 flex justify-between items-center text-[10px] text-neutral-500 font-mono">
                    <div className="flex gap-4">
                        <span>Ln {BRAIN_CODE.split('\n').length}, Col 1</span>
                        <span>UTF-8</span>
                        <span>Python</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span>KERNEL: ONLINE</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
