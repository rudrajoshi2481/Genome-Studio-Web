// Canvas utility functions

// Format duration in milliseconds to a compact string (e.g., "2.5s" or "1.2m")
export const formatDuration = (ms: number): string => {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
};

// Generate unique node ID
export const generateUniqueNodeId = (): string => {
  return `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
};

// Calculate minimum height based on node content
export const calculateMinHeight = (
  inputsLength: number = 0,
  outputsLength: number = 0,
  logsLength: number = 0,
  logsOpen: boolean = false
): number => {
  const baseHeight = 180;
  const inputsHeight = inputsLength * 32;
  const outputsHeight = outputsLength * 32;
  const logsHeight = logsOpen && logsLength ? Math.min(200, logsLength * 20) : 0;
  return Math.max(baseHeight, baseHeight + inputsHeight + outputsHeight + logsHeight);
};
