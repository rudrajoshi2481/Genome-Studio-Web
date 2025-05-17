import { Cell, CellOutput } from '../store/types';

interface ExecutionResult {
  outputs: CellOutput[];
  executionTime: number;
}

export const executeCode = async (cell: Cell): Promise<ExecutionResult> => {
  // Simulate execution delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const outputs: CellOutput[] = [];
  const startTime = performance.now();

  // Mock different outputs based on language
  switch (cell.metadata.language) {
    case 'python':
      outputs.push({
        output_type: 'stream',
        name: 'stdout',
        text: ['Hello from Python! 🐍\n']
      });
      break;
    case 'r':
      outputs.push({
        output_type: 'stream',
        name: 'stdout',
        text: ['[1] "Hello from R! 📊"\n']
      });
      break;
    case 'bash':
      outputs.push({
        output_type: 'stream',
        name: 'stdout',
        text: ['Hello from Bash! 🐚\n']
      });
      break;
    default:
      outputs.push({
        output_type: 'stream',
        name: 'stdout',
        text: ['Hello World! 👋\n']
      });
  }

  // Add cell source code as additional output
  outputs.push({
    output_type: 'stream',
    name: 'stdout',
    text: [`\nExecuted code:\n${cell.source}\n`]
  });

  const executionTime = (performance.now() - startTime) / 1000;
  return { outputs, executionTime };
};
