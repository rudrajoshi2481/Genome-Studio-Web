import React from 'react'
import { CheckCircle, Clock, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncStatusIndicatorProps {
  isPending: boolean
  hasFailed: boolean
  pendingCount: number
  failedCount: number
  isFullySynced: boolean
  isConnected: boolean
  onRetryFailed?: () => void
  className?: string
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  isPending,
  hasFailed,
  pendingCount,
  failedCount,
  isFullySynced,
  isConnected,
  onRetryFailed,
  className
}) => {
  const getStatusInfo = () => {
    if (!isConnected) {
      return {
        icon: WifiOff,
        text: 'Offline',
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      }
    }

    if (hasFailed) {
      return {
        icon: AlertCircle,
        text: `${failedCount} failed`,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      }
    }

    if (isPending) {
      return {
        icon: Clock,
        text: `Saving ${pendingCount}...`,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      }
    }

    if (isFullySynced) {
      return {
        icon: CheckCircle,
        text: 'Saved',
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      }
    }

    return {
      icon: Wifi,
      text: 'Connected',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    }
  }

  const status = getStatusInfo()
  const Icon = status.icon

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200',
        status.color,
        status.bgColor,
        status.borderColor,
        className
      )}
    >
      <Icon 
        className={cn(
          'w-3 h-3',
          isPending && 'animate-spin'
        )} 
      />
      <span>{status.text}</span>
      
      {hasFailed && onRetryFailed && (
        <button
          onClick={onRetryFailed}
          className="ml-1 px-2 py-0.5 bg-orange-100 hover:bg-orange-200 rounded text-orange-700 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export default SyncStatusIndicator
