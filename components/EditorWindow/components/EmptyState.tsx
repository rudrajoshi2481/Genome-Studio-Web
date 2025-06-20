import React from 'react'

const EmptyState: React.FC = () => (
  <div className='flex-1 flex items-center justify-center'>
    <div className='text-center'>
      <h3 className='text-xl font-semibold mb-2'>No file selected</h3>
      <p>Open a file from the tabs above or from the file explorer</p>
    </div>
  </div>
)

export default EmptyState
