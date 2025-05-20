import { create } from 'zustand'
import { Node } from 'reactflow'

interface NodeTemplate {
  type: string
  title: string
  command: string
  category: string
}

interface NodeStore {
  nodeTemplates: NodeTemplate[]
  addNodeTemplate: (template: NodeTemplate) => void
  getNodesByCategory: (category: string) => NodeTemplate[]
}

export const useNodeStore = create<NodeStore>((set, get) => ({
  nodeTemplates: [
    {
      type: 'bashNode',
      title: 'Aligners',
      command: 'bwa mem -SP5 -t 8 reference.fa R1.fastq R2.fastq > aligned.sam',
      category: 'alignment'
    },
    {
      type: 'bashNode',
      title: 'Converters',
      command: 'samtools view -bS aligned.sam | samtools sort -o aligned.sorted.bam',
      category: 'conversion'
    },
    // Add more node templates here
    {
      type: 'Pairtools',
      title: 'Pairtools',
      command: 'pairtools merge -o merged.bam aligned.sorted.bam',
      category: 'pairtools'
    },{
      type: 'Cooler',
      title: 'Cooler',
      command: 'pairtools Cooler -o cooler.bam aligned.sorted.bam',
      category: 'cooling'
    },{type:"Rowan HiC",title:"Rowan HiC",command:"rowan hic -o hic.bam aligned.sorted.bam",category:"rowan"},
    {
      type: 'bashNode',
      title: 'Bash',
      command: 'bash script.sh',
      category: 'bash'
    },
    {
      type: 'pythonNode',
      title: 'Python',
      command: 'python3 script.py',
      category: 'python'
    },
    {
      type: 'RNode',
      title: 'R',
      command: 'Rscript script.R',
      category: 'R'
    },
  ],
  
  addNodeTemplate: (template) => {
    set((state) => ({
      nodeTemplates: [...state.nodeTemplates, template]
    }))
  },

  getNodesByCategory: (category) => {
    return get().nodeTemplates.filter(node => node.category === category)
  }
}))
