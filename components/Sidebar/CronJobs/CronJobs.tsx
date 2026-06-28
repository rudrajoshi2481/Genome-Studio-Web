"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Play, RefreshCcw, Clock, Calendar, Save, Pencil, ScrollText, CheckCircle2, XCircle, Loader2, CircleDot } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { getServerConfig } from '@/config/server'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import SimpleCodeEditor from '@/components/Sidebar/Nodebar/CustomNode/SimpleCodeEditor'

const config = getServerConfig()
const API_URL = `${config.api.protocol}://${config.api.host}:${config.api.port}${config.api.baseUrl}`

const SCHEDULE_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every week (Sunday midnight)', value: '0 0 * * 0' },
  { label: 'Custom...', value: 'custom' },
]

interface CronJob {
  id: string
  name: string
  command: string
  schedule: string
  enabled: boolean
  description: string
  created_at: string
  last_run: string | null
  last_status: string | null
  next_run: string | null
}

function CronJobs() {
  const { token, isAuthenticated } = useAuthStore()
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CronJob | null>(null)
  const [detailJob, setDetailJob] = useState<CronJob | null>(null)
  const [detailLogs, setDetailLogs] = useState<string>('')
  const [detailLogsLoading, setDetailLogsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [schedulePreset, setSchedulePreset] = useState('*/5 * * * *')
  const [editSchedulePreset, setEditSchedulePreset] = useState('')

  const [newJob, setNewJob] = useState({
    name: '',
    command: '',
    schedule: '*/5 * * * *',
    description: '',
  })

  const [editJob, setEditJob] = useState({
    name: '',
    command: '',
    schedule: '',
    description: '',
  })

  const loadJobs = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/cron-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch cron jobs')
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch (err) {
      console.error('Error fetching cron jobs:', err)
      toast.error('Failed to load cron jobs')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (isAuthenticated && token) {
      loadJobs()
    }
  }, [isAuthenticated, token, loadJobs])

  const handleCreate = async () => {
    if (!token) return
    if (!newJob.name.trim() || !newJob.command.trim() || !newJob.schedule.trim()) {
      toast.error('Name, command, and schedule are required')
      return
    }

    try {
      const res = await fetch(`${API_URL}/cron-jobs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newJob.name,
          command: newJob.command,
          schedule: newJob.schedule,
          description: newJob.description,
          enabled: true,
        }),
      })
      if (!res.ok) throw new Error('Failed to create cron job')
      toast.success('Cron job created')
      setNewJob({ name: '', command: '', schedule: '*/5 * * * *', description: '' })
      setSchedulePreset('*/5 * * * *')
      setIsCreateOpen(false)
      loadJobs()
    } catch (err) {
      console.error('Error creating cron job:', err)
      toast.error('Failed to create cron job')
    }
  }

  const handleDelete = async (job: CronJob) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/cron-jobs/${job.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete cron job')
      toast.success(`"${job.name}" deleted`)
      setDeleteTarget(null)
      setDetailJob(null)
      loadJobs()
    } catch (err) {
      console.error('Error deleting cron job:', err)
      toast.error('Failed to delete cron job')
    }
  }

  const handleToggle = async (job: CronJob) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/cron-jobs/${job.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !job.enabled }),
      })
      if (!res.ok) throw new Error('Failed to toggle cron job')
      toast.success(job.enabled ? 'Cron job disabled' : 'Cron job enabled')
      loadJobs()
    } catch (err) {
      console.error('Error toggling cron job:', err)
      toast.error('Failed to toggle cron job')
    }
  }

  const handleRunNow = async (jobId: string) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/cron-jobs/${jobId}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to run cron job')
      toast.success('Cron job triggered')
      setTimeout(() => loadJobs(), 2000)
    } catch (err) {
      console.error('Error running cron job:', err)
      toast.error('Failed to run cron job')
    }
  }

  const handleOpenDetail = async (job: CronJob) => {
    setDetailJob(job)
    setIsEditing(false)
    setDetailLogs('')
    setDetailLogsLoading(true)
    try {
      const res = await fetch(`${API_URL}/cron-jobs/${job.id}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch logs')
      const data = await res.json()
      setDetailLogs(data.logs || 'No logs yet')
    } catch (err) {
      console.error('Error fetching logs:', err)
      setDetailLogs('Failed to load logs')
    } finally {
      setDetailLogsLoading(false)
    }
  }

  const handleStartEdit = () => {
    if (!detailJob) return
    setEditJob({
      name: detailJob.name,
      command: detailJob.command,
      schedule: detailJob.schedule,
      description: detailJob.description,
    })
    const preset = SCHEDULE_PRESETS.find(p => p.value === detailJob.schedule)
    setEditSchedulePreset(preset ? preset.value : 'custom')
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!token || !detailJob) return
    if (!editJob.name.trim() || !editJob.command.trim() || !editJob.schedule.trim()) {
      toast.error('Name, command, and schedule are required')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`${API_URL}/cron-jobs/${detailJob.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editJob.name,
          command: editJob.command,
          schedule: editJob.schedule,
          description: editJob.description,
        }),
      })
      if (!res.ok) throw new Error('Failed to update cron job')
      toast.success('Cron job updated')
      setIsEditing(false)
      const updated = await res.json()
      setDetailJob(updated)
      loadJobs()
    } catch (err) {
      console.error('Error updating cron job:', err)
      toast.error('Failed to update cron job')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditSchedulePresetChange = (value: string) => {
    setEditSchedulePreset(value)
    if (value !== 'custom') {
      setEditJob(prev => ({ ...prev, schedule: value }))
    }
  }

  const getStatusIcon = (status: string | null) => {
    if (!status) return <CircleDot className="h-3.5 w-3.5 text-muted-foreground/40" />
    if (status === 'success') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    if (status === 'running') return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
    if (status.startsWith('failed') || status.startsWith('error')) return <XCircle className="h-3.5 w-3.5 text-destructive" />
    if (status === 'timeout') return <Clock className="h-3.5 w-3.5 text-destructive" />
    return <CircleDot className="h-3.5 w-3.5 text-muted-foreground/40" />
  }

  const getStatusLabel = (status: string | null) => {
    if (!status) return 'idle'
    if (status === 'success') return 'success'
    if (status === 'running') return 'running'
    if (status.startsWith('failed') || status.startsWith('error')) return 'failed'
    if (status === 'timeout') return 'timeout'
    return status
  }

  const scheduleToHuman = (schedule: string) => {
    const preset = SCHEDULE_PRESETS.find(p => p.value === schedule)
    if (preset) return preset.label
    if (schedule.startsWith('*/')) return `Every ${schedule.slice(2).split(' ')[0]} min`
    return schedule
  }

  const formatRelative = (iso: string | null) => {
    if (!iso) return null
    try {
      const d = new Date(iso)
      const now = new Date()
      const diff = now.getTime() - d.getTime()
      const mins = Math.floor(diff / 60000)
      if (mins < 1) return 'just now'
      if (mins < 60) return `${mins}m ago`
      const hours = Math.floor(mins / 60)
      if (hours < 24) return `${hours}h ago`
      const days = Math.floor(hours / 24)
      if (days < 7) return `${days}d ago`
      return d.toLocaleDateString()
    } catch {
      return null
    }
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return 'Never'
    try {
      const d = new Date(iso)
      return d.toLocaleString()
    } catch {
      return iso
    }
  }

  const handleSchedulePresetChange = (value: string) => {
    setSchedulePreset(value)
    if (value !== 'custom') {
      setNewJob(prev => ({ ...prev, schedule: value }))
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="h-[calc(100vh-56px)] flex flex-col border-r">
        <div className="flex items-center gap-2 px-3 py-3 border-b bg-muted/30">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Cron Jobs</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground">Please log in to view cron jobs.</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-56px)] flex flex-col border-r bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Cron Jobs</span>
            {jobs.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{jobs.length}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={loadJobs}
                  disabled={isLoading}
                >
                  <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Refresh</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Create cron job</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Jobs List — clean rows */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1.5">
              {isLoading && jobs.length === 0 ? (
                <div className="space-y-2 p-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                      <Skeleton className="h-5 w-10 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-muted/50 p-4 mb-3">
                    <Clock className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No cron jobs yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 mb-4">Create your first scheduled task</p>
                  <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    New Cron Job
                  </Button>
                </div>
              ) : (
                jobs.map((job) => {
                  const lastRunRel = formatRelative(job.last_run)
                  return (
                  <div
                    key={job.id}
                    className={`group flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${!job.enabled ? 'opacity-50' : ''}`}
                    onClick={() => handleOpenDetail(job)}
                  >
                    {/* Status icon */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-shrink-0 flex items-center">
                          {getStatusIcon(job.last_status)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">{getStatusLabel(job.last_status)}</TooltipContent>
                    </Tooltip>

                    {/* Name + metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{job.name}</span>
                        {!job.enabled && (
                          <Badge variant="outline" className="text-[9px] h-3.5 px-1 py-0 text-muted-foreground">off</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {scheduleToHuman(job.schedule)}
                        </span>
                        {lastRunRel && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {lastRunRel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick actions (don't trigger detail open) */}
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Switch
                              checked={job.enabled}
                              onCheckedChange={() => handleToggle(job)}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left">{job.enabled ? 'Disable' : 'Enable'}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRunNow(job.id)}
                            disabled={!job.enabled}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Run now</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">Create Cron Job</DialogTitle>
              <DialogDescription className="text-xs">
                Schedule a command to run automatically at specified intervals.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  placeholder="My scheduled task"
                  value={newJob.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewJob({ ...newJob, name: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Schedule</Label>
                <Select value={schedulePreset} onValueChange={handleSchedulePresetChange}>
                  <SelectTrigger className="h-9 text-sm w-full">
                    <SelectValue placeholder="Select a schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_PRESETS.map(preset => (
                      <SelectItem key={preset.value} value={preset.value} className="text-sm">
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {schedulePreset === 'custom' && (
                  <Input
                    placeholder="*/5 * * * *"
                    value={newJob.schedule}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewJob({ ...newJob, schedule: e.target.value })}
                    className="h-9 text-sm font-mono mt-1.5"
                  />
                )}
                <p className="text-[10px] text-muted-foreground">
                  Cron expression: minute hour day month weekday. Also supports &quot;every 30m&quot;, &quot;every 2h&quot;.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Command</Label>
                <div className="border rounded-md overflow-hidden" style={{ height: '160px' }}>
                  <SimpleCodeEditor
                    value={newJob.command}
                    onChange={(val: string) => setNewJob({ ...newJob, command: val })}
                    extension="bash"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  placeholder="What does this job do?"
                  value={newJob.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewJob({ ...newJob, description: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create Job
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail / Edit Dialog */}
        <Dialog open={!!detailJob} onOpenChange={(open: boolean) => { if (!open) { setDetailJob(null); setIsEditing(false) } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base">{isEditing ? 'Edit Cron Job' : detailJob?.name}</DialogTitle>
                  {!isEditing && detailJob && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          {getStatusIcon(detailJob.last_status)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{getStatusLabel(detailJob.last_status)}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {!isEditing && detailJob && (
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleStartEdit}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRunNow(detailJob.id)} disabled={!detailJob.enabled}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Run now</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleteTarget(detailJob)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </DialogHeader>

            {isEditing ? (
              /* ---- Edit Mode ---- */
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={editJob.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditJob({ ...editJob, name: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Schedule</Label>
                  <Select value={editSchedulePreset} onValueChange={handleEditSchedulePresetChange}>
                    <SelectTrigger className="h-9 text-sm w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_PRESETS.map(preset => (
                        <SelectItem key={preset.value} value={preset.value} className="text-sm">
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editSchedulePreset === 'custom' && (
                    <Input
                      value={editJob.schedule}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditJob({ ...editJob, schedule: e.target.value })}
                      className="h-9 text-sm font-mono mt-1.5"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Command</Label>
                  <div className="border rounded-md overflow-hidden" style={{ height: '180px' }}>
                    <SimpleCodeEditor
                      value={editJob.command}
                      onChange={(val: string) => setEditJob({ ...editJob, command: val })}
                      extension="bash"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={editJob.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditJob({ ...editJob, description: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            ) : (
              /* ---- View Mode ---- */
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="logs" className="flex-1 text-xs">
                    <ScrollText className="h-3 w-3 mr-1" />
                    Logs
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-3 mt-3">
                  {detailJob?.description && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Description</Label>
                      <p className="text-xs text-foreground">{detailJob.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Schedule</Label>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{detailJob?.schedule}</code>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Enabled</Label>
                      <div className="flex items-center gap-2">
                        <Switch checked={detailJob?.enabled ?? false} onCheckedChange={() => detailJob && handleToggle(detailJob)} />
                        <span className="text-xs text-muted-foreground">{detailJob?.enabled ? 'Active' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Command</Label>
                    <div className="border rounded-md overflow-hidden" style={{ height: '120px' }}>
                      <SimpleCodeEditor
                        value={detailJob?.command ?? ''}
                        onChange={() => {}}
                        extension="bash"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground">Last run</span>
                      <p className="font-medium">{formatTime(detailJob?.last_run ?? null)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground">Created</span>
                      <p className="font-medium">{formatTime(detailJob?.created_at ?? null)}</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Logs Tab */}
                <TabsContent value="logs" className="mt-3">
                  {detailLogsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCcw className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <pre className="text-[10px] font-mono bg-muted/40 rounded-lg p-3 max-h-[300px] overflow-auto whitespace-pre-wrap break-all border">
                      {detailLogs || 'No logs yet'}
                    </pre>
                  )}
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button onClick={handleSaveEdit} disabled={isSaving}>
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setDetailJob(null)}>Close</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base">Delete cron job?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteTarget && handleDelete(deleteTarget)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}

export default CronJobs
