import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NodeState {
  // Node properties
  nodeName: string
  nodeLanguage: 'Python' | 'R' | 'Bash'
  description: string
  tags: string[]
  
  // Node code
  code: string
  
  // Actions
  setNodeName: (name: string) => void
  setNodeLanguage: (language: 'Python' | 'R' | 'Bash') => void
  setDescription: (description: string) => void
  setTags: (tags: string[]) => void
  addTag: (tag: string) => void
  removeTag: (tag: string) => void
  setCode: (code: string) => void
  resetNode: () => void
}

// Language-specific code templates
const CODE_TEMPLATES = {
  Python: `@node()
def functionName(name: str):
    print("Hello World")
    return f"Hello, {name}"
`,
  R: `@node()
functionName <- function(name) {
    print("Hello World")
    return(paste("Hello,", name))
}
`,
  Bash: `#!/bin/bash
# Input variables (will become input handles)
THREADS=8
INPUT_FILE="./files.fq"

# Your bash commands here
echo "Running alignment with $THREADS threads"
alignmer $INPUT_FILE -p $THREADS

# Fixed output variable (always 'done')
done="completed"
`
}

// Create the store with persistence
export const useNodeStore = create<NodeState>()(
  persist(
    (set) => ({
      // Initial state
      nodeName: 'New Node',
      nodeLanguage: 'Python',
      description: '',
      tags: [],
      code: CODE_TEMPLATES.Python,
      
      // Actions
      setNodeName: (name) => set({ nodeName: name }),
      setNodeLanguage: (language) => set({ 
        nodeLanguage: language,
        code: CODE_TEMPLATES[language] // Update code template when language changes
      }),
      setDescription: (description) => set({ description }),
      setTags: (tags) => set({ tags }),
      addTag: (tag) => set((state) => ({ 
        tags: [...state.tags, tag] 
      })),
      removeTag: (tag) => set((state) => ({ 
        tags: state.tags.filter(t => t !== tag) 
      })),
      setCode: (code) => set({ code }),
      resetNode: () => set({
        nodeName: 'New Node',
        nodeLanguage: 'Python',
        description: '',
        tags: [],
        code: CODE_TEMPLATES.Python,
      }),
    }),
    {
      name: 'genome-studio-node-storage', // unique name for localStorage
    }
  )
)
