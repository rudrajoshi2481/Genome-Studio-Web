import React from 'react'

interface ErrorComponentProps {
  error: string
  onRetry: () => void
}

const ErrorComponent: React.FC<ErrorComponentProps> = ({ error, onRetry }) => (
  <div className='flex items-center justify-center h-full'>
    <div className='text-center text-red-500'>
      <p>{error}</p>
      <button 
        onClick={onRetry}
        className='mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
      >
        Try Again
      </button>
    </div>
  </div>
)

export default ErrorComponent
