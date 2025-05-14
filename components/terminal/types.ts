export interface TerminalTab {
  id: string;
  name: string;
  type: 'WEB' | 'DB';
}

export interface TerminalProps {
  className?: string;
  defaultHeight?: number;
}

export interface TerminalDimensions {
  cols: number;
  rows: number;
}
