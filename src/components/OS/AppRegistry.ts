// App registry — maps app types to metadata

const REGISTRY: Record<string, { title: string; icon?: string }> = {
  file_explorer: { title: 'File Explorer' },
  note: { title: 'Notepad' },
  terminal: { title: 'Terminal' },
  browser: { title: 'Browser' },
  sim_editor: { title: 'Simulation Editor' },
  image_viewer: { title: 'Image Viewer' },
  audio_player: { title: 'Audio Player' },
  spreadsheet: { title: 'Spreadsheet' },
  holon_construct: { title: 'Node Graph' },
  test_suite: { title: 'System Health' },
  dvd: { title: 'Screen Saver' },
  github_mount: { title: 'GitHub Mount' },
};

export function getAppTitle(appType: string): string {
  return REGISTRY[appType]?.title || 'Window';
}
