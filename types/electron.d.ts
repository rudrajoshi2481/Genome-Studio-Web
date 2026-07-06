interface Window {
  electronAPI?: {
    platform: string;
    isElectron: boolean;
    quitApp: () => void;
  };
}
