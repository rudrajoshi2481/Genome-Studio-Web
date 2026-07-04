import React, { useState } from 'react'
import { Plus, Loader2, Layers, Code, Package, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type EnvType = 'conda' | 'venv' | 'r'

interface CreateEnvironmentDialogProps {
  onCreate: (envName: string, pythonVersion: string | undefined, envType: EnvType) => Promise<void>
}


const PYTHON_VERSIONS = [
  '3.12', '3.11', '3.10', '3.9', '3.8', '3.7',
]

const ENV_TYPES: Record<EnvType, { label: string; description: string; icon: React.ElementType }> = {
  conda: { label: 'Conda', description: 'Create a conda environment with a specific Python version', icon: Layers },
  venv: { label: 'Python venv', description: 'Create a Python virtual environment using venv', icon: Package },
  r: { label: 'R Library', description: 'Create a new R library location for R packages', icon: Code },
}

const CreateEnvironmentDialog: React.FC<CreateEnvironmentDialogProps> = ({ onCreate }) => {
  const [open, setOpen] = useState(false)
  const [envType, setEnvType] = useState<EnvType>('conda')
  const [envName, setEnvName] = useState('')
  const [pythonVersion, setPythonVersion] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!envName.trim()) {
      setError('Environment name is required')
      return
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(envName.trim())) {
      setError('Only letters, numbers, hyphens, underscores, and dots allowed')
      return
    }

    try {
      setIsCreating(true)
      setError(null)
      await onCreate(envName.trim(), pythonVersion || undefined, envType)
      setOpen(false)
      setEnvName('')
      setPythonVersion('')
      setEnvType('conda')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create environment')
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (!v) {
      setError(null)
      setEnvName('')
      setPythonVersion('')
      setEnvType('conda')
    }
  }

  const config = ENV_TYPES[envType]
  const EnvIcon = config.icon
  const showPythonVersion = envType === 'conda' || envType === 'venv'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Create new environment"
          disabled={isCreating}
        >
          {isCreating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <EnvIcon className="h-4 w-4 text-muted-foreground" />
            Create Environment
          </DialogTitle>
          <DialogDescription className="text-xs">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Name + Type side by side */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium">
                {envType === 'r' ? 'Library Name' : 'Name'}
              </label>
              <Input
                className="h-8 text-xs"
                placeholder={envType === 'r' ? 'e.g. my-r-libs' : 'e.g. my-env'}
                value={envName}
                onChange={(e) => {
                  setEnvName(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCreating) {
                    handleCreate()
                  }
                }}
              />
            </div>
            <div className="w-[120px] space-y-1.5">
              <label className="text-xs font-medium">Type</label>
              <Select value={envType} onValueChange={(v) => { setEnvType(v as EnvType); setError(null) }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conda" className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3 w-3 text-muted-foreground" />
                      Conda
                    </span>
                  </SelectItem>
                  <SelectItem value="venv" className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      Python venv
                    </span>
                  </SelectItem>
                  <SelectItem value="r" className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <Code className="h-3 w-3 text-muted-foreground" />
                      R Library
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Python Version — only for conda and venv */}
          {showPythonVersion && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Python Version</label>
              <div className="flex flex-wrap gap-1">
                <button
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                    pythonVersion === ''
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                  onClick={() => setPythonVersion('')}
                >
                  Latest
                </button>
                {PYTHON_VERSIONS.map((v) => (
                  <button
                    key={v}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors font-mono ${
                      pythonVersion === v
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                    onClick={() => setPythonVersion(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* R-specific info */}
          {envType === 'r' && (
            <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1.5 rounded">
              Creates a new R library directory. Packages installed via the R package manager will use this library.
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 px-2 py-1 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs bg-green-600 hover:bg-green-700"
            onClick={handleCreate}
            disabled={isCreating || !envName.trim()}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateEnvironmentDialog
