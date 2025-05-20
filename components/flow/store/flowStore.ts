import { create } from 'zustand';
import { Node, Edge, Connection, addEdge } from 'reactflow';
import { nanoid } from 'nanoid';

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Partial<Node>) => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: state.nodes.map(node => {
        const change = changes.find((c: any) => c.id === node.id);
        if (change) {
          return { ...node, ...change };
        }
        return node;
      })
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: state.edges.map(edge => {
        const change = changes.find((c: any) => c.id === edge.id);
        if (change) {
          return { ...edge, ...change };
        }
        return edge;
      })
    }));
  },

  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(connection, state.edges)
    }));
  },

  addNode: (node) => {
    const newNode = {
      id: nanoid(),
      ...node,
    };
    set((state) => ({
      nodes: [...state.nodes, newNode as Node]
    }));
  }
}));
