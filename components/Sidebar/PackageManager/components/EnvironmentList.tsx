import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, Folder, FolderOpen } from 'lucide-react'

interface Environment {
  name: string
  path: string
  is_active: boolean
}

interface EnvironmentListProps {
  environments: Environment[]
  selectedEnvironment: string | null
  onEnvironmentSelect: (envName: string) => void
  isLoading: boolean
}

const EnvironmentList: React.FC<EnvironmentListProps> = ({
  environments,
  selectedEnvironment,
  onEnvironmentSelect,
  isLoading
}) => {
  if (isLoading && environments.length === 0) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="h-3 w-3 animate-spin mr-2" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (environments.length === 0) {
    return (
      <div className="text-center py-2">
        <p className="text-xs text-muted-foreground">No environments found</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {environments.map((env) => (
        <div
          key={env.name}
          className={`flex items-center px-2 py-1 rounded cursor-pointer text-xs hover:bg-muted/50 ${
            selectedEnvironment === env.name
              ? 'bg-primary/10 text-primary'
              : 'text-foreground'
          }`}
          onClick={() => onEnvironmentSelect(env.name)}
        >
          <Folder className="h-3 w-3 mr-2 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <span className="font-medium truncate">{env.name}</span>
              {env.is_active && (
                <CheckCircle className="h-2 w-2 text-green-600 flex-shrink-0" />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default EnvironmentList
