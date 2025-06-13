import React from 'react'
import { FlipVertical2 } from 'lucide-react'
import CustomNode from './CustomNode/CustomNode'

function Nodebar() {
  return (
    <div className="h-[calc(100vh-56px)] flex flex-col border-r border-gray-200">
    {/* Header with refresh button */}
    <CustomNode/>
    <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
      <h3 className="text-sm font-medium">Nodebar</h3>
    </div>
    {/* Nodebar content */}
    <div className="flex-1 overflow-y-auto p-2">
        <h1 className="text-sm font-medium mb-2">Basic Workflow</h1>
      <div className="flex flex-col gap-2">
        <button className="flex items-center gap-2 px-2 py-1 border border-gray-200 rounded hover:bg-gray-50">
          
          <FlipVertical2 className="w-4 h-4"/>
          <div className='flex flex-col items-start ml-2'>
          <span>Aligner</span>
          <p className="text-xs text-gray-500">Aligns reads to a reference genome</p>
          </div>
        </button>
        <button className="flex items-center gap-2 px-2 py-1 border border-gray-200 rounded hover:bg-gray-50">
          <FlipVertical2 className="w-4 h-4"/>
          <div className='flex flex-col items-start ml-2'>
          <span>Variant Caller</span>
          <p className="text-xs text-gray-500">Identifies variants in aligned reads</p>
          </div>
        </button>
      </div>
    </div>
    </div>
  )
}

export default Nodebar