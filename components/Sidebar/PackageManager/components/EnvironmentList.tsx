import React from 'react'
import { Loader2, CheckCircle2, Box, Layers, Terminal, Apple, Package, Code } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface Environment {
  name: string
  path: string
  is_active: boolean
  type?: string
}

interface EnvironmentListProps {
  environments: Environment[]
  selectedEnvironment: string | null
  onEnvironmentSelect: (envName: string) => void
  isLoading: boolean
}

const typeBadgeConfig: Record<string, { label: string; className: string }> = {
  conda: { label: 'conda', className: 'text-green-600 border-green-200 dark:text-green-400 dark:border-green-900' },
  linux: { label: 'linux', className: 'text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-900' },
  mac: { label: 'mac', className: 'text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-900' },
  pip: { label: 'pip', className: 'text-purple-600 border-purple-200 dark:text-purple-400 dark:border-purple-900' },
  r: { label: 'r', className: 'text-indigo-600 border-indigo-200 dark:text-indigo-400 dark:border-indigo-900' },
}

const typeIconConfig: Record<string, { Icon: React.ElementType; className: string }> = {
  conda: { Icon: Layers, className: 'text-green-600 dark:text-green-400' },
  linux: { Icon: Terminal, className: 'text-orange-600 dark:text-orange-400' },
  mac: { Icon: Apple, className: 'text-blue-600 dark:text-blue-400' },
  pip: { Icon: Package, className: 'text-purple-600 dark:text-purple-400' },
  r: { Icon: Code, className: 'text-indigo-600 dark:text-indigo-400' },
}

const EnvironmentList: React.FC<EnvironmentListProps> = ({
  environments,
  selectedEnvironment,
  onEnvironmentSelect,
  isLoading
}) => {
  if (isLoading && environments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mb-1" />
        <span className="text-xs">Loading environments...</span>
      </div>
    )
  }

  if (environments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
        <Box className="h-5 w-5 mb-1 opacity-50" />
        <p className="text-xs">No environments found</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {environments.map((env) => {
        const typeBadge = env.type ? typeBadgeConfig[env.type] : null
        const typeIcon = env.type ? typeIconConfig[env.type] : null
        const EnvIcon = typeIcon?.Icon || Box
        return (
          <div
            key={env.name}
            className={cn(
              'flex items-center px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors',
              selectedEnvironment === env.name
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted/50 text-foreground'
            )}
            onClick={() => onEnvironmentSelect(env.name)}
          >
            <EnvIcon className={cn('h-3 w-3 mr-2 flex-shrink-0', selectedEnvironment === env.name ? 'text-primary' : (typeIcon?.className || 'text-muted-foreground'))} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1">
                <span className="font-medium truncate">{env.name}</span>
                {env.is_active && (
                  <CheckCircle2 className="h-2.5 w-2.5 text-green-600 flex-shrink-0" />
                )}
              </div>
            </div>
            {typeBadge && (
              <Badge variant="outline" className={cn('text-[9px] h-3.5 px-1 ml-1 flex-shrink-0 font-mono', typeBadge.className)}>
                {typeBadge.label}
              </Badge>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default EnvironmentList
