import { useState, useCallback, useEffect } from 'react';

interface UseCommandNodeProps {
  generateCommand: () => string;
  initialCommand?: string;
}

export const useCommandNode = ({ generateCommand, initialCommand = '' }: UseCommandNodeProps) => {
  const [command, setCommand] = useState(initialCommand);

  useEffect(() => {
    setCommand(generateCommand());
  }, [generateCommand]);

  const handleRun = useCallback(() => {
    console.log('Running command:', command);
    // TODO: Implement actual command execution
  }, [command]);

  return {
    command,
    setCommand,
    handleRun,
  };
};
