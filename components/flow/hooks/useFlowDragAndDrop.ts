import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { useFlowStore } from '../store/flowStore';

export const useFlowDragAndDrop = () => {
  const { project } = useReactFlow();
  const addNode = useFlowStore((state) => state.addNode);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const nodeData = event.dataTransfer.getData('application/reactflow');
      if (!nodeData) return;

      try {
        const parsedData = JSON.parse(nodeData);
        const position = project({
          x: event.clientX,
          y: event.clientY,
        });

        const newNode = {
          id: `${Date.now()}`,
          type: 'bashNode', // Default to bashNode as per your existing implementation
          position,
          data: {
            title: parsedData.title,
            command: parsedData.command,
            status: 'Upcoming',
            logs: [],
          },
        };

        addNode(newNode);
      } catch (error) {
        console.error('Error creating node:', error);
      }
    },
    [project, addNode]
  );

  return { onDragOver, onDrop };
};
