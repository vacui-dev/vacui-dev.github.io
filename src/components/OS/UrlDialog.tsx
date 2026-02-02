import React, { useState } from 'react';

interface UrlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (url: string) => Promise<void>;
}

export const UrlDialog: React.FC<UrlDialogProps> = ({ isOpen, onClose, onDownload }) => {
  const [url, setUrl] = useState('');

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-black/90 border border-white/10 rounded-lg p-4 w-96 space-y-3">
        <div className="text-xs font-mono text-cyan-400">Download from URL</div>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono text-white"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1 text-xs font-mono text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={async () => { await onDownload(url); onClose(); setUrl(''); }}
            className="px-3 py-1 text-xs font-mono bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};
