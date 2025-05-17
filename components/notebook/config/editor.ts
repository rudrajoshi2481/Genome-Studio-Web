export interface Language {
  id: string;
  name: string;
  mimeType: string;
  fileExtension: string;
  displayName: string;
}

export interface NotebookConfig {
  languages: Language[];
  defaultLanguage: string;
  editorOptions: {
    theme: string;
    fontSize: number;
    tabSize: number;
    lineNumbers: boolean;
    lineWrapping: boolean;
  };
}

export const notebookConfig: NotebookConfig = {
  languages: [
    {
      id: 'python',
      name: 'python',
      mimeType: 'text/x-python',
      fileExtension: '.py',
      displayName: 'Python'
    },
  
    {
      id: 'r',
      name: 'r',
      mimeType: 'text/x-r',
      fileExtension: '.r',
      displayName: 'R'
    },
    {
      id: 'bash',
      name: 'bash',
      mimeType: 'text/x-sh',
      fileExtension: '.sh',
      displayName: 'Bash'
    },
  ],
  defaultLanguage: 'python',
  editorOptions: {
    theme: 'default',
    fontSize: 14,
    tabSize: 2,
    lineNumbers: true,
    lineWrapping: true
  }
};
