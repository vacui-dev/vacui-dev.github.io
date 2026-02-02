// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../../types/filesystem';
import { mockNetwork } from '../../services/MockNetwork';
import { ArrowRight, Loader2 } from 'lucide-react';

interface LoginScreenProps {
    onLogin: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                // 1. Get List of Users (New location)
                const listRes = await mockNetwork.fetch('/home/index.json');
                const userList: string[] = await listRes.json();

                // 2. Hydrate Profiles
                const loadedUsers: UserProfile[] = [];
                for (const uid of userList) {
                    try {
                        const profileRes = await mockNetwork.fetch(`/home/${uid}/config.json`);
                        const profile = await profileRes.json();
                        loadedUsers.push(profile);
                    } catch (e) {
                        console.warn(`Failed to load profile for ${uid}`, e);
                    }
                }
                
                // Filter out bots for login screen if desired
                const visibleUsers = loadedUsers.filter(u => u.role !== 'bot');
                setUsers(visibleUsers);
                
                if (visibleUsers.length > 0) {
                    setSelectedUser(visibleUsers[0]);
                }
            } catch (e) {
                console.error("System Failure: Could not load user registry.", e);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    // Auto-focus input when user changes
    useEffect(() => {
        if (selectedUser && inputRef.current) {
            inputRef.current.focus();
        }
    }, [selectedUser]);

    const handleLogin = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!selectedUser) return;

        if (selectedUser.password && password !== selectedUser.password) {
            setError(true);
            setTimeout(() => setError(false), 500); // Shake animation duration
            return;
        }

        onLogin(selectedUser);
    };

    if (loading) {
        return (
            <div className="absolute inset-0 z-[9999] bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mx-auto" />
                    <div className="text-xs font-mono text-cyan-400 animate-pulse">INITIALIZING USER MATRIX...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-[9999] bg-black flex flex-col items-center justify-center font-sans selection:bg-white/20 pointer-events-auto">
            {/* Background Ambient */}
            <div className="absolute inset-0 bg-[url('https://vacui.dev/assets/noise.png')] opacity-5 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-[#111] pointer-events-none" />

            <div className="z-10 flex flex-col items-center w-full max-w-2xl animate-in fade-in zoom-in-95 duration-500 px-4">
                
                {/* Avatar Large Preview */}
                <div className="mb-8 relative group">
                    <div className="w-32 h-32 rounded-full border-4 border-white/10 bg-black/50 p-4 flex items-center justify-center shadow-2xl overflow-hidden relative z-10 transition-transform duration-300 group-hover:scale-105">
                        {selectedUser && (
                            <div 
                                className="w-full h-full text-neutral-300 drop-shadow-glow"
                                dangerouslySetInnerHTML={{ __html: selectedUser.iconSvg }} 
                            />
                        )}
                    </div>
                    <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                {/* User Selection List */}
                <div className="flex flex-wrap justify-center gap-4 mb-8 w-full">
                    {users.map(u => (
                        <button
                            key={u.id}
                            onClick={() => { setSelectedUser(u); setPassword(''); setError(false); }}
                            className={`flex flex-col items-center gap-2 transition-all p-2 rounded-lg ${selectedUser?.id === u.id ? 'opacity-100 scale-110 bg-white/5' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}
                        >
                            <div className={`w-12 h-12 rounded-full bg-black/40 border-2 flex items-center justify-center p-2 ${selectedUser?.id === u.id ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-white/10'}`}>
                                <div className="w-full h-full text-current" dangerouslySetInnerHTML={{ __html: u.iconSvg }} />
                            </div>
                            <span className="text-[10px] font-bold tracking-wider uppercase text-white">{u.name}</span>
                        </button>
                    ))}
                </div>

                {/* Auth Form */}
                <div className="w-full max-w-xs">
                    <h1 className="text-2xl font-bold text-white text-center mb-1 tracking-tight">
                        {selectedUser?.name}
                    </h1>
                    <p className="text-xs text-neutral-500 text-center font-mono mb-6">
                        {selectedUser?.role.toUpperCase()}
                    </p>

                    {/* Password Input */}
                    <form onSubmit={handleLogin} className="relative group">
                        <input
                            ref={inputRef}
                            type="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(false); }}
                            placeholder={selectedUser?.password ? "Enter Password" : "Press Enter to Login"}
                            autoFocus
                            className={`w-full bg-white/5 border rounded-lg py-3 px-4 text-center text-white placeholder-white/20 outline-none transition-all
                                ${error ? 'border-red-500 animate-shake' : 'border-white/10 focus:border-cyan-500/50 focus:bg-white/10'}
                            `}
                        />
                        <button 
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-neutral-400 hover:text-white transition-colors"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        {selectedUser?.password && (
                            <div className="absolute -bottom-6 left-0 right-0 text-center text-[9px] text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                Hint: {selectedUser.password}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};