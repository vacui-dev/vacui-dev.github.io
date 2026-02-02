// Copyright (c) 2025 vacui.dev, all rights reserved
//
// GitHubSettings — Configuration panel for the ouroboros write path.
// Lives in the OS system tray / settings menu.

import React, { useState, useEffect } from 'react';
import { githubFS, GitHubFSConfig } from '../../services/GitHubFS';
import { fileSystemCore } from '../../services/FileSystemCore';

export const GitHubSettings: React.FC = () => {
    const [config, setConfig] = useState<GitHubFSConfig>(githubFS.getConfig());
    const [tokenInput, setTokenInput] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');
    const [prStatus, setPrStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
    const [prMessage, setPrMessage] = useState('');
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const unsub = githubFS.onConfigChange((newConfig) => {
            setConfig(newConfig);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setPendingCount(fileSystemCore.getPendingWriteCount());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleSaveToken = () => {
        githubFS.setToken(tokenInput || null);
        setTokenInput('');
        setTestStatus('idle');
    };

    const handleClearToken = () => {
        githubFS.setToken(null);
        setTestStatus('idle');
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        try {
            // Test read access (always works for public repos)
            const response = await githubFS.readFile('/home/index.json');
            const text = await response.text();
            JSON.parse(text); // Validate it's JSON

            // Test write access if token is set
            if (config.token) {
                const testUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
                const res = await fetch(testUrl, {
                    headers: {
                        'Authorization': `Bearer ${config.token}`,
                        'Accept': 'application/vnd.github+json',
                    }
                });
                if (res.ok) {
                    const repo = await res.json();
                    const perms = repo.permissions || {};
                    setTestMessage(
                        `Read: ✓  |  Write: ${perms.push ? '✓' : '✗'}  |  Admin: ${perms.admin ? '✓' : '✗'}`
                    );
                } else {
                    setTestMessage(`Read: ✓  |  Token: Invalid (${res.status})`);
                }
            } else {
                setTestMessage('Read: ✓  |  Write: No token configured');
            }
            setTestStatus('ok');
        } catch (e: any) {
            setTestStatus('error');
            setTestMessage(`Connection failed: ${e.message}`);
        }
    };

    const handleSubmitPR = async () => {
        setPrStatus('submitting');
        setPrMessage('');
        const result = await fileSystemCore.submitChangesAsPR();
        if (result.success) {
            setPrStatus('done');
            setPrMessage(`PR created: ${result.prUrl}`);
            setPendingCount(0);
        } else {
            setPrStatus('error');
            setPrMessage(result.error || 'Unknown error');
        }
    };

    const maskedToken = config.token
        ? `${config.token.slice(0, 6)}${'•'.repeat(20)}${config.token.slice(-4)}`
        : null;

    return (
        <div style={{
            padding: '16px',
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#e0e0e0',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
        }}>
            {/* Header */}
            <div style={{
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '12px',
            }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px' }}>
                    ⚡ GitHub Filesystem
                </div>
                <div style={{ color: '#888', fontSize: '11px' }}>
                    The OS reads from and writes to its own source repository.
                </div>
            </div>

            {/* Repository Info */}
            <div style={{
                background: 'rgba(255,255,255,0.04)',
                padding: '12px',
                borderRadius: '6px',
            }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '6px' }}>REPOSITORY</div>
                <div style={{ color: '#4ec9b0' }}>
                    {config.owner}/{config.repo}
                </div>
                <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>
                    branch: {config.branch} &nbsp;·&nbsp; root: /{config.basePath}/
                </div>
            </div>

            {/* Connection Status */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            }}>
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: testStatus === 'ok' ? '#4ec9b0' :
                                testStatus === 'error' ? '#f44747' :
                                testStatus === 'testing' ? '#dcdcaa' : '#555',
                    boxShadow: testStatus === 'ok' ? '0 0 6px #4ec9b0' :
                               testStatus === 'error' ? '0 0 6px #f44747' : 'none',
                }} />
                <span style={{ color: '#888', fontSize: '12px' }}>
                    {testStatus === 'idle' && 'Not tested'}
                    {testStatus === 'testing' && 'Testing...'}
                    {testStatus === 'ok' && 'Connected'}
                    {testStatus === 'error' && 'Error'}
                </span>
                <button
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing'}
                    style={{
                        marginLeft: 'auto',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#ccc',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                    }}
                >
                    Test
                </button>
            </div>
            {testMessage && (
                <div style={{
                    fontSize: '11px',
                    color: testStatus === 'error' ? '#f44747' : '#4ec9b0',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '8px',
                    borderRadius: '4px',
                    whiteSpace: 'pre-wrap',
                }}>
                    {testMessage}
                </div>
            )}

            {/* Token Management */}
            <div style={{
                background: 'rgba(255,255,255,0.04)',
                padding: '12px',
                borderRadius: '6px',
            }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>
                    WRITE ACCESS (GitHub PAT)
                </div>
                {maskedToken ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#4ec9b0', fontSize: '12px', flex: 1 }}>
                            {showToken ? config.token : maskedToken}
                        </span>
                        <button
                            onClick={() => setShowToken(!showToken)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#888',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                            }}
                        >
                            {showToken ? 'hide' : 'show'}
                        </button>
                        <button
                            onClick={handleClearToken}
                            style={{
                                background: 'rgba(244,71,71,0.15)',
                                border: '1px solid rgba(244,71,71,0.3)',
                                color: '#f44747',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                            }}
                        >
                            revoke
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="password"
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                            style={{
                                flex: 1,
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: '#e0e0e0',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                outline: 'none',
                            }}
                        />
                        <button
                            onClick={handleSaveToken}
                            disabled={!tokenInput}
                            style={{
                                background: tokenInput ? 'rgba(78,201,176,0.2)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${tokenInput ? 'rgba(78,201,176,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                color: tokenInput ? '#4ec9b0' : '#555',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: tokenInput ? 'pointer' : 'default',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                            }}
                        >
                            Save
                        </button>
                    </div>
                )}
                <div style={{ color: '#666', fontSize: '10px', marginTop: '8px' }}>
                    Needs <span style={{ color: '#888' }}>repo</span> scope.
                    Token stored in localStorage only.
                    Create at{' '}
                    <span style={{ color: '#569cd6', textDecoration: 'underline', cursor: 'pointer' }}
                          onClick={() => window.open('https://github.com/settings/tokens/new?scopes=repo&description=VACUI+OS', '_blank')}>
                        github.com/settings/tokens
                    </span>
                </div>
            </div>

            {/* Pending Writes / PR Submission */}
            {config.token && (
                <div style={{
                    background: 'rgba(255,255,255,0.04)',
                    padding: '12px',
                    borderRadius: '6px',
                }}>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>
                        PENDING CHANGES
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <span style={{ color: pendingCount > 0 ? '#dcdcaa' : '#555' }}>
                            {pendingCount} file{pendingCount !== 1 ? 's' : ''} modified
                        </span>
                        <button
                            onClick={handleSubmitPR}
                            disabled={pendingCount === 0 || prStatus === 'submitting'}
                            style={{
                                background: pendingCount > 0 ? 'rgba(78,201,176,0.2)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${pendingCount > 0 ? 'rgba(78,201,176,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                color: pendingCount > 0 ? '#4ec9b0' : '#555',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: pendingCount > 0 ? 'pointer' : 'default',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                            }}
                        >
                            {prStatus === 'submitting' ? 'Creating PR...' : 'Submit as PR'}
                        </button>
                    </div>
                    {prMessage && (
                        <div style={{
                            fontSize: '11px',
                            marginTop: '8px',
                            color: prStatus === 'error' ? '#f44747' : '#4ec9b0',
                            wordBreak: 'break-all',
                        }}>
                            {prStatus === 'done' && prMessage.startsWith('PR created:') ? (
                                <>
                                    PR created:{' '}
                                    <span
                                        style={{ color: '#569cd6', textDecoration: 'underline', cursor: 'pointer' }}
                                        onClick={() => window.open(prMessage.replace('PR created: ', ''), '_blank')}
                                    >
                                        {prMessage.replace('PR created: ', '')}
                                    </span>
                                </>
                            ) : (
                                prMessage
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Architecture Note */}
            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: '12px',
                color: '#555',
                fontSize: '10px',
                lineHeight: 1.6,
            }}>
                <div style={{ color: '#666', marginBottom: '4px' }}>HOW IT WORKS</div>
                <div>
                    <span style={{ color: '#4ec9b0' }}>Read:</span>{' '}
                    raw.githubusercontent.com/{config.owner}/{config.repo}/{config.branch}/{config.basePath}/...
                </div>
                <div>
                    <span style={{ color: '#dcdcaa' }}>Write:</span>{' '}
                    GitHub API → branch → commit → Pull Request
                </div>
                <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                    The website reads its own source. Edits become pull requests.
                    The ouroboros bites.
                </div>
            </div>
        </div>
    );
};
