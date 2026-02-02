// Virtual filesystem types

export interface VirtualFile {
  id: string;
  name: string;
  type: 'text' | 'image' | 'audio' | 'simulation' | 'material' | 'shader' | 'folder' | 'shortcut' | 'sheet' | string;
  content?: any;
  url?: string;
  loaded?: boolean;
  isBinary?: boolean;
  updatedAt?: number;
  parentId?: string;
  icon?: string;
  [key: string]: any;
}

export interface VirtualFolder {
  id: string;
  name: string;
  files: VirtualFile[];
  icon?: string;
  permissions?: Record<string, string>;
}

export interface UserProfile {
  id: string;
  displayName: string;
  password?: string;
  avatar?: string;
  desktopConfig?: {
    theme?: string;
    defaultSimulation?: string;
    wallpaper?: string;
    [key: string]: any;
  };
  [key: string]: any;
}
