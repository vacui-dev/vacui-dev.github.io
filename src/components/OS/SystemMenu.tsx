import React from 'react';
import { VirtualFile } from '../../types/filesystem';

interface SystemContextMenuProps {
  x: number;
  y: number;
  file?: VirtualFile;
  onClose: () => void;
  onAction: (action: string) => void;
  customItems?: React.ReactNode;
}

export const SystemContextMenu: React.FC<SystemContextMenuProps> = ({ x, y, file, onClose, onAction, customItems }) => {
  return (
    <div
      className="fixed bg-black/95 border border-white/10 rounded-lg py-1 min-w-48 z-50 pointer-events-auto"
      style={{ left: x, top: y }}
      onMouseDown={e => e.stopPropagation()}
    >
      {file ? (
        <>
          <button className="w-full text-left px-4 py-2 hover:bg-white/10 text-xs text-white" onClick={() => onAction('open')}>Open</button>
          <button className="w-full text-left px-4 py-2 hover:bg-white/10 text-xs text-white" onClick={() => onAction('duplicate')}>Duplicate</button>
          <button className="w-full text-left px-4 py-2 hover:bg-white/10 text-xs text-white" onClick={() => onAction('properties')}>Properties</button>
          <div className="border-t border-white/5 my-1" />
          <button className="w-full text-left px-4 py-2 hover:bg-red-500/20 text-xs text-red-400" onClick={() => onAction('delete')}>Delete</button>
        </>
      ) : (
        <>
          <button className="w-full text-left px-4 py-2 hover:bg-white/10 text-xs text-white" onClick={() => onAction('new_text')}>New Text File</button>
          <button className="w-full text-left px-4 py-2 hover:bg-white/10 text-xs text-white" onClick={() => onAction('download_url')}>Download from URL</button>
          <div className="border-t border-white/5 my-1" />
          {customItems}
        </>
      )}
    </div>
  );
};

interface FilePropertiesDialogProps {
  file: VirtualFile;
  onClose: () => void;
}

export const FilePropertiesDialog: React.FC<FilePropertiesDialogProps> = ({ file, onClose }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-black/95 border border-white/10 rounded-lg p-4 w-80 space-y-3">
        <div className="text-xs font-mono text-cyan-400">Properties: {file.name}</div>
        <div className="text-xs font-mono text-gray-400 space-y-1">
          <div>Type: {file.type}</div>
          <div>ID: {file.id}</div>
          {file.updatedAt && <div>Modified: {new Date(file.updatedAt).toLocaleString()}</div>}
        </div>
        <button onClick={onClose} className="w-full px-3 py-1 text-xs font-mono bg-white/5 text-white rounded hover:bg-white/10">Close</button>
      </div>
    </div>
  );
};
