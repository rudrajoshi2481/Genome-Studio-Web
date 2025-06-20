import React from 'react'

interface LoadingComponentProps {
  isConnected: boolean
}

const LoadingComponent: React.FC<LoadingComponentProps> = ({ isConnected }) => (
  <div className='flex items-center justify-center h-full'>
    <div className='text-center'>
      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4 mx-auto'></div>
      <p>Loading file content...</p>
      {isConnected && <p className="text-sm text-green-600 mt-2">File watching active</p>}
    </div>
  </div>
)

export default LoadingComponent
