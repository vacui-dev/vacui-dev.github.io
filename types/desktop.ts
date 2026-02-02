// Copyright (c) 2025 vacui.dev, all rights reserved

export interface DesktopShortcut {
    label: string;
    url: string;
    action: 'app' | 'file';
    icon?: string;
    color?: string;
}