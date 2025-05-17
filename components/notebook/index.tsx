import React from 'react';
import { Notebook } from './components/Notebook';
import { CellLanguage } from './store/useNotebookStore';

const NotebookPage: React.FC = () => {
  // Mock execution function - in a real implementation, this would connect to a backend
  const handleExecuteCell = async (cellId: string, code: string, language: CellLanguage): Promise<string> => {
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simple mock execution for demo purposes
    if (language === 'python') {
      if (code.includes('print')) {
        return code.match(/print\(['"](.*)['"].*\)/)?.[1] || 'Hello from Python!';
      }
      return `Executed Python code: ${code.slice(0, 50)}${code.length > 50 ? '...' : ''}`;
    } 
    
    if (language === 'javascript' || language === 'typescript') {
      if (code.includes('console.log')) {
        return code.match(/console\.log\(['"](.*)['"].*\)/)?.[1] || 'Hello from JavaScript!';
      }
      return `Executed ${language} code: ${code.slice(0, 50)}${code.length > 50 ? '...' : ''}`;
    }
    
    return 'Code executed successfully!';
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-4 mt-8">Jupyter-like Notebook</h1>
      <div className="border rounded-lg overflow-hidden bg-card">
        <Notebook onExecuteCell={handleExecuteCell} />
      </div>
    </div>
  );
};

export default NotebookPage;
