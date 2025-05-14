export interface TerminalTab {
  id: string;
  name: string;
  type: 'tty' | 'DB' | null;
}

export interface TerminalProps {
  className?: string;
  defaultHeight?: number;
}

export interface TerminalDimensions {
  cols: number;
  rows: number;
}
