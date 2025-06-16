import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NodeState {
  // Node properties
  nodeName: string
  nodeLanguage: 'Python' | 'R'
  description: string
  tags: string[]
  
  // Node code
  code: string
  
  // Actions
  setNodeName: (name: string) => void
  setNodeLanguage: (language: 'Python' | 'R') => void
  setDescription: (description: string) => void
  setTags: (tags: string[]) => void
  addTag: (tag: string) => void
  removeTag: (tag: string) => void
  setCode: (code: string) => void
  resetNode: () => void
}

// Default node code template
const DEFAULT_NODE_CODE = `@node()
def functionName():


  res = ""
  return res
`

// Create the store with persistence
export const useNodeStore = create<NodeState>()(
  persist(
    (set) => ({
      // Initial state
      nodeName: 'New Node',
      nodeLanguage: 'Python',
      description: '',
      tags: [],
      code: DEFAULT_NODE_CODE,
      
      // Actions
      setNodeName: (name) => set({ nodeName: name }),
      setNodeLanguage: (language) => set({ nodeLanguage: language }),
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
        code: DEFAULT_NODE_CODE,
      }),
    }),
    {
      name: 'genome-studio-node-storage', // unique name for localStorage
    }
  )
)
