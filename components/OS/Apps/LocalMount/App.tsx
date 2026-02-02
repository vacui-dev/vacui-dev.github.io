// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect } from 'react';
import { localFileSystemBridge, BridgeMountConfig } from '../../../../services/LocalFileSystemBridge';
import { HardDrive, Power, Copy, Check, Download, Terminal, Plus, Server, Network, Folder, Trash2, Shield } from 'lucide-react';
import { CodeEditor } from '../../CodeEditor';

const ADVANCED_PYTHON_SCRIPT = `
import asyncio
import websockets
import json
import base64
import os
import sys
import tkinter as tk
from tkinter import filedialog

# Requires: pip install websockets asyncio paramiko smbprotocol
# Note: For this script to work fully, install dependencies. 
# It will gracefully degrade if libs are missing.

try:
    import paramiko
except ImportError:
    paramiko = None

try:
    import smbclient
    import smbprotocol.connection
except ImportError:
    smbclient = None

PORT = 8081
active_mounts = {}

# --- PROVIDERS ---

class LocalProvider:
    def list_dir(self, path):
        tree = []
        try:
            for entry in os.scandir(path):
                if entry.is_dir():
                    tree.append({"name": entry.name, "path": entry.path, "type": "directory", "children": self.list_dir(entry.path)})
                else:
                    tree.append({"name": entry.name, "path": entry.path, "type": "file", "size": entry.stat().st_size})
        except Exception as e:
            print(f"Error scanning {path}: {e}")
        return tree

    def read_file(self, path):
        with open(path, "rb") as f:
            return f.read()

class SSHProvider:
    def __init__(self, config):
        if not paramiko: raise Exception("paramiko not installed")
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.client.connect(config['host'], port=int(config.get('port', 22)), username=config['user'], password=config.get('pass'))
        self.sftp = self.client.open_sftp()
        self.root = config['path']

    def list_dir(self, path):
        tree = []
        try:
            for entry in self.sftp.listdir_attr(path):
                full_path = path.rstrip('/') + '/' + entry.filename
                if entry.st_mode & 0o40000: # Directory
                    tree.append({"name": entry.filename, "path": full_path, "type": "directory", "children": self.list_dir(full_path)})
                else:
                    tree.append({"name": entry.filename, "path": full_path, "type": "file", "size": entry.st_size})
        except Exception as e:
            print(f"SSH Scan Error: {e}")
        return tree

    def read_file(self, path):
        with self.sftp.open(path, 'rb') as f:
            return f.read()

class SMBProvider:
    def __init__(self, config):
        if not smbclient: raise Exception("smbprotocol not installed")
        self.share = f"\\\\{config['host']}\\{config['share']}"
        smbclient.register_session(config['host'], username=config['user'], password=config['pass'])
        self.root = self.share

    def list_dir(self, path):
        tree = []
        try:
            for filename in smbclient.listdir(path):
                full_path = path.rstrip('\\\\') + '\\\\' + filename
                try:
                    stat = smbclient.stat(full_path)
                    if stat.st_mode & 0o40000:
                         tree.append({"name": filename, "path": full_path, "type": "directory", "children": self.list_dir(full_path)})
                    else:
                         tree.append({"name": filename, "path": full_path, "type": "file", "size": stat.st_size})
                except:
                    pass
        except Exception as e:
            print(f"SMB Scan Error: {e}")
        return tree

    def read_file(self, path):
        with smbclient.open_file(path, mode='rb') as f:
            return f.read()

# --- HANDLER ---

async def handler(websocket):
    print(f"[BRIDGE] Client connected")
    
    async for message in websocket:
        try:
            cmd = json.loads(message)
            
            if cmd['type'] == 'ADD_MOUNT':
                cfg = cmd['payload']
                mid = cfg['id']
                print(f"[BRIDGE] Adding Mount: {cfg['name']} ({cfg['type']})")
                
                try:
                    if cfg['type'] == 'local':
                        # If path not provided, ask
                        path = cfg['config'].get('path')
                        if not path:
                            root = tk.Tk(); root.withdraw(); root.attributes('-topmost', True)
                            path = filedialog.askdirectory(title=f"Select Folder for {cfg['name']}")
                            root.destroy()
                        
                        if path:
                            active_mounts[mid] = LocalProvider()
                            structure = active_mounts[mid].list_dir(path)
                            await websocket.send(json.dumps({
                                "type": "MOUNT_UPDATE", "mountId": mid, "rootName": cfg['name'], "structure": structure
                            }))
                            
                    elif cfg['type'] == 'ssh':
                        active_mounts[mid] = SSHProvider(cfg['config'])
                        structure = active_mounts[mid].list_dir(cfg['config']['path'])
                        await websocket.send(json.dumps({
                            "type": "MOUNT_UPDATE", "mountId": mid, "rootName": cfg['name'], "structure": structure
                        }))

                    elif cfg['type'] == 'smb':
                        active_mounts[mid] = SMBProvider(cfg['config'])
                        # Basic scan of root
                        structure = active_mounts[mid].list_dir(active_mounts[mid].root)
                        await websocket.send(json.dumps({
                            "type": "MOUNT_UPDATE", "mountId": mid, "rootName": cfg['name'], "structure": structure
                        }))

                except Exception as e:
                    print(f"Mount Error: {e}")
                    await websocket.send(json.dumps({"type": "ERROR", "requestId": "mount", "message": str(e)}))

            elif cmd['type'] == 'REMOVE_MOUNT':
                mid = cmd['payload']['id']
                if mid in active_mounts:
                    del active_mounts[mid]
                    print(f"[BRIDGE] Removed Mount: {mid}")

            elif cmd['type'] == 'READ':
                # Path format: "mountId::real/path"
                full_path = cmd['path']
                if '::' in full_path:
                    mid, real_path = full_path.split('::', 1)
                    if mid in active_mounts:
                        try:
                            print(f"[BRIDGE] Reading {mid} -> {real_path}")
                            data = active_mounts[mid].read_file(real_path)
                            b64 = base64.b64encode(data).decode('utf-8')
                            is_binary = b'\\0' in data[:1024]
                            await websocket.send(json.dumps({
                                "type": "CONTENT", "requestId": cmd['requestId'], "data": b64, "isBinary": is_binary
                            }))
                        except Exception as e:
                            await websocket.send(json.dumps({"type": "ERROR", "requestId": cmd['requestId'], "message": str(e)}))
                    else:
                        await websocket.send(json.dumps({"type": "ERROR", "requestId": cmd['requestId'], "message": "Mount not found"}))

        except Exception as e:
            print(f"Msg Error: {e}")

async def main():
    print(f"GENESIS BRIDGE v2.0 running on port {PORT}")
    async with websockets.serve(handler, "localhost", PORT):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
`;

export const LocalMountApp: React.FC = () => {
    const [connected, setConnected] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'script'>('dashboard');
    const [mounts, setMounts] = useState<BridgeMountConfig[]>([]);
    
    // Add Mount Form
    const [showAdd, setShowAdd] = useState(false);
    const [mountType, setMountType] = useState<'local'|'ssh'|'smb'>('local');
    const [formData, setFormData] = useState<any>({ name: '', host: '', user: '', pass: '', path: '/', port: '22', share: '' });

    useEffect(() => {
        setConnected(localFileSystemBridge.getStatus());
        setMounts(localFileSystemBridge.getActiveMounts());
        
        const unsub = localFileSystemBridge.onStatusChange(s => {
            setConnected(s);
            if(s) setMounts(localFileSystemBridge.getActiveMounts());
        });
        return unsub;
    }, []);

    const handleConnect = () => {
        if (connected) localFileSystemBridge.disconnect();
        else localFileSystemBridge.connect();
    };

    const handleAddMount = () => {
        const id = `mount_${Date.now()}`;
        const config = { ...formData };
        
        const newMount: BridgeMountConfig = {
            id,
            type: mountType,
            name: formData.name || `${mountType.toUpperCase()} Mount`,
            config
        };

        localFileSystemBridge.addMount(newMount);
        // Refresh local list (bridge stores it too, but we optimistically update UI)
        setMounts(prev => [...prev, newMount]);
        setShowAdd(false);
        setFormData({ name: '', host: '', user: '', pass: '', path: '/', port: '22', share: '' });
    };

    const handleRemoveMount = (id: string) => {
        localFileSystemBridge.removeMount(id);
        setMounts(prev => prev.filter(m => m.id !== id));
    };

    const renderForm = () => {
        return (
            <div className="space-y-3 mt-4 p-4 bg-black/30 rounded border border-white/10">
                <div>
                    <label className="block text-[10px] text-neutral-500 uppercase font-bold mb-1">Mount Name</label>
                    <input className="w-full bg-black border border-white/10 rounded px-2 py-1 text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="My Drive" />
                </div>
                
                {mountType !== 'local' && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] text-neutral-500 uppercase font-bold mb-1">Host</label>
                            <input className="w-full bg-black border border-white/10 rounded px-2 py-1 text-xs" value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} placeholder="192.168.1.X" />
                        </div>
                        {mountType === 'ssh' && (
                            <div>
                                <label className="block text-[10px] text-neutral-500 uppercase font-bold mb-1">Port</label>
                                <input className="w-full bg-black border border-white/10 rounded px-2 py-1 text-xs" value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})} placeholder="22" />
                            </div>
                        )}
                        {mountType === 'smb' && (
                            <div>
                                <label className="block text-[10px] text-neutral-500 uppercase font-bold mb-1">Share Name</label>
                                <input className="w-full bg-black border border-white/10 rounded px-2 py-1 text-xs" value={formData.share} onChange={e => setFormData({...formData, share: e.target.value})} placeholder="public" />
                            </div>
                        )}
                    </div>
                )}

                {mountType !== 'local' && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] text-neutral-500 uppercase font-bold mb-1">Username</label>
                            <input className="w-full bg-black border border-white/10 rounded px-2 py-1 text-xs" value={formData.user} onChange={e => setFormData({...formData, user: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] text-neutral-500 uppercase font-bold mb-1">Password</label>
                            <input type="password" className="w-full bg-black border border-white/10 rounded px-2 py-1 text-xs" value={formData.pass} onChange={e => setFormData({...formData, pass: e.target.value})} />
                        </div>
                    </div>
                )}

                {mountType === 'ssh' && (
                    <div>
                        <label className="block text-[10px] text-neutral-500 uppercase font-bold mb-1">Remote Path</label>
                        <input className="w-full bg-black border border-white/10 rounded px-2 py-1 text-xs" value={formData.path} onChange={e => setFormData({...formData, path: e.target.value})} />
                    </div>
                )}

                {mountType === 'local' && (
                    <div className="text-[10px] text-neutral-400 italic">
                        Path selection will open a native dialog on the host machine when you click Add.
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white">Cancel</button>
                    <button onClick={handleAddMount} className="px-4 py-1.5 text-xs bg-cyan-700 text-white rounded font-bold hover:bg-cyan-600">Add Mount</button>
                </div>
            </div>
        );
    };

    const copyScript = () => { navigator.clipboard.writeText(ADVANCED_PYTHON_SCRIPT); };
    const downloadScript = () => {
        const blob = new Blob([ADVANCED_PYTHON_SCRIPT], { type: 'text/x-python' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fs_bridge_advanced.py';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="flex flex-col h-full bg-[#0d1117] text-white font-sans">
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-[#161b22]">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <HardDrive className="w-6 h-6 text-cyan-400" />
                            Network & Local Bridge
                        </h1>
                        <p className="text-xs text-neutral-400 mt-2">
                            Manage connections to the physical world via Python Intermediary.
                        </p>
                    </div>
                    <button 
                        onClick={handleConnect}
                        className={`flex items-center gap-2 px-4 py-2 rounded font-bold text-xs transition-colors ${connected ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}
                    >
                        <Power className="w-4 h-4" />
                        {connected ? 'DISCONNECT BRIDGE' : 'CONNECT BRIDGE'}
                    </button>
                </div>
                
                <div className="flex gap-4 mt-6">
                    <button onClick={() => setActiveTab('dashboard')} className={`text-xs font-bold pb-2 border-b-2 transition-colors ${activeTab === 'dashboard' ? 'text-white border-cyan-500' : 'text-neutral-500 border-transparent'}`}>DASHBOARD</button>
                    <button onClick={() => setActiveTab('script')} className={`text-xs font-bold pb-2 border-b-2 transition-colors ${activeTab === 'script' ? 'text-white border-cyan-500' : 'text-neutral-500 border-transparent'}`}>SCRIPT SOURCE</button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-[#0d1117]">
                {activeTab === 'script' ? (
                    <div className="flex flex-col h-full">
                        <div className="p-2 border-b border-white/10 bg-[#111] flex justify-end gap-2">
                            <button onClick={copyScript} className="p-1.5 hover:bg-white/10 rounded text-neutral-400"><Copy className="w-4 h-4"/></button>
                            <button onClick={downloadScript} className="p-1.5 hover:bg-white/10 rounded text-neutral-400"><Download className="w-4 h-4"/></button>
                        </div>
                        <CodeEditor value={ADVANCED_PYTHON_SCRIPT} language="python" readOnly className="flex-1" />
                    </div>
                ) : (
                    <div className="p-6 max-w-3xl mx-auto">
                        {!connected && (
                            <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs text-yellow-200 flex items-start gap-3">
                                <Terminal className="w-5 h-5 shrink-0" />
                                <div>
                                    <div className="font-bold mb-1">Bridge Disconnected</div>
                                    <p>Run the script in the "Script Source" tab on your host machine to enable filesystem access.</p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold text-neutral-300">Active Mounts</h2>
                            <button 
                                onClick={() => setShowAdd(!showAdd)} 
                                disabled={!connected}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold ${connected ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/5 text-neutral-600 cursor-not-allowed'}`}
                            >
                                <Plus className="w-3 h-3" /> Add Mount
                            </button>
                        </div>

                        {showAdd && (
                            <div className="mb-6 animate-in slide-in-from-top-2">
                                <div className="flex gap-2 mb-2">
                                    <button onClick={() => setMountType('local')} className={`flex-1 py-2 text-xs font-bold rounded border ${mountType === 'local' ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'border-transparent bg-black/30 text-neutral-500'}`}>Local Folder</button>
                                    <button onClick={() => setMountType('ssh')} className={`flex-1 py-2 text-xs font-bold rounded border ${mountType === 'ssh' ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'border-transparent bg-black/30 text-neutral-500'}`}>SSH / SFTP</button>
                                    <button onClick={() => setMountType('smb')} className={`flex-1 py-2 text-xs font-bold rounded border ${mountType === 'smb' ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'border-transparent bg-black/30 text-neutral-500'}`}>SMB / NAS</button>
                                </div>
                                {renderForm()}
                            </div>
                        )}

                        <div className="space-y-2">
                            {mounts.length === 0 ? (
                                <div className="text-center p-8 border border-dashed border-white/10 rounded text-neutral-500 text-xs italic">
                                    No active mounts. Connect the bridge and add a source.
                                </div>
                            ) : (
                                mounts.map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-4 bg-[#161b22] border border-white/5 rounded hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded flex items-center justify-center ${m.type === 'ssh' ? 'bg-green-900/20 text-green-400' : m.type === 'smb' ? 'bg-blue-900/20 text-blue-400' : 'bg-neutral-800 text-neutral-400'}`}>
                                                {m.type === 'ssh' ? <Terminal className="w-5 h-5" /> : m.type === 'smb' ? <Network className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{m.name}</div>
                                                <div className="text-[10px] text-neutral-500 font-mono">
                                                    {m.type === 'local' ? 'Local Host' : `${m.config.user}@${m.config.host}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-[10px] bg-white/5 px-2 py-1 rounded text-neutral-400 border border-white/5">
                                                {m.type.toUpperCase()}
                                            </div>
                                            <button onClick={() => handleRemoveMount(m.id)} className="text-neutral-500 hover:text-red-400 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};