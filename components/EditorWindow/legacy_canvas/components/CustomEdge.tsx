import React, { useState, useCallback } from 'react'
import { BaseEdge, EdgeProps, getBezierPath, useReactFlow } from '@xyflow/react'
import { X } from 'lucide-react'
import { toast } from 'sonner'

// Custom edge component with delete button
const CustomEdge = ({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  sourcePosition, 
  targetPosition, 
  style = {}, 
  markerEnd 
}: EdgeProps) => {
  const [showDeleteButton, setShowDeleteButton] = useState(false)
  const { setEdges } = useReactFlow()
  
  // Get the path for the edge
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // Handle edge deletion
  const onEdgeDelete = useCallback(
    (event: React.MouseEvent, edgeId: string) => {
      event.stopPropagation()
      setEdges((edges) => edges.filter((edge) => edge.id !== edgeId))
      toast.success('Connection deleted')
    },
    [setEdges]
  )

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <path
        className="react-flow__edge-interaction"
        d={edgePath}
        strokeWidth={15}
        fill="none"
        stroke="transparent"
        strokeOpacity={0}
        onMouseEnter={() => setShowDeleteButton(true)}
        onMouseLeave={() => setShowDeleteButton(false)}
      />
      {showDeleteButton && (
        <foreignObject
          width={20}
          height={20}
          x={labelX - 10}
          y={labelY - 10}
          className="edgebutton-foreignobject"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div
            className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-white cursor-pointer hover:bg-zinc-700 border border-zinc-700 shadow-sm transition-colors"
            onClick={(event) => onEdgeDelete(event, id)}
          >
            <X size={12} />
          </div>
        </foreignObject>
      )}
    </>
  )
}

export default CustomEdge
