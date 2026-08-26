interface Window {
  electronAPI?: {
    platform: string;
    isElectron: boolean;
    quitApp: () => void;
    openWindow: (url: string, options?: { width?: number; height?: number }) => void;
  };
}
