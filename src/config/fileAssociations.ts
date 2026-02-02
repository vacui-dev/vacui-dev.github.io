// File type → app associations

import { VirtualFile } from '../types/filesystem';

const FILE_ASSOCIATIONS: Record<string, string> = {
  'text': 'note',
  'image': 'image_viewer',
  'audio': 'audio_player',
  'simulation': 'sim_editor',
  'material': 'note',
  'shader': 'note',
  'sheet': 'spreadsheet',
  'folder': 'file_explorer',
};

const APP_TITLES: Record<string, string> = {
  'note': 'Notepad',
  'file_explorer': 'File Explorer',
  'sim_editor': 'Simulation Editor',
  'image_viewer': 'Image Viewer',
  'audio_player': 'Audio Player',
  'spreadsheet': 'Spreadsheet',
  'terminal': 'Terminal',
  'browser': 'Browser',
};

export function getAppForFile(file: VirtualFile): string {
  return FILE_ASSOCIATIONS[file.type] || 'note';
}

export function getAppTitle(appType: string): string {
  return APP_TITLES[appType] || 'Window';
}
