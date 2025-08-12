import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuthStore } from "@/lib/stores/auth-store"
import { 
  Settings as SettingsIcon, 
  User, 
  Mail, 
  Shield, 
  LogOut, 
  Palette, 
  Bell, 
  Database, 
  Code, 
  Monitor, 
  Zap, 
  Globe, 
  Lock, 
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Eye,
  EyeOff,
  Edit,
  Save,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle
} from "lucide-react"

function Settings() {
  // Get user data from auth store
  const { user, isAuthenticated, logout } = useAuthStore()

  // State for settings
  const [activeTab, setActiveTab] = useState("account")
  const [isEditing, setIsEditing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Mock settings state (replace with actual store later)
  const [settings, setSettings] = useState({
    // Account settings
    fullName: user?.full_name || '',
    email: user?.email || '',
    bio: '',
    avatar: user?.avatar || '',
    
    // Appearance settings
    theme: 'system',
    fontSize: 14,
    sidebarWidth: 280,
    showLineNumbers: true,
    wordWrap: true,
    
    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    workflowNotifications: true,
    systemAlerts: true,
    
    // Performance
    autoSave: true,
    autoSaveInterval: 30,
    maxMemoryUsage: 80,
    enableGPUAcceleration: false,
    
    // Privacy & Security
    twoFactorAuth: false,
    sessionTimeout: 60,
    allowAnalytics: true,
    
    // Workflow settings
    defaultLanguage: 'python',
    autoExecute: false,
    parallelExecution: true,
    maxConcurrentJobs: 4,
    
    // Storage
    cacheSize: 1024,
    tempFileCleanup: true,
    backupFrequency: 'daily'
  })

  // Generate initials for avatar fallback
  const getInitials = () => {
    if (!user?.full_name) return user?.username?.substring(0, 2).toUpperCase() || 'U'
    
    const nameParts = user.full_name.split(' ')
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    }
    return nameParts[0].substring(0, 2).toUpperCase()
  }

  const handleLogout = () => {
    logout()
  }

  const handleSave = () => {
    // TODO: Implement save logic
    setIsEditing(false)
    console.log('Settings saved:', settings)
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open settings">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[40vw] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Manage your account, preferences, and application settings
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[60vh]">
          {/* Sidebar Navigation */}
          <div className="w-64 border-r bg-muted/30 p-4">
            <nav className="space-y-2">
              {[
                { id: 'account', label: 'Account', icon: User },
                { id: 'appearance', label: 'Appearance', icon: Palette },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'workflow', label: 'Workflow', icon: Code },
                { id: 'performance', label: 'Performance', icon: Zap },
                { id: 'security', label: 'Security', icon: Lock },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors
                      ${activeTab === item.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Account Section */}
            {activeTab === 'account' && (
              <div className="space-y-6">
              {isAuthenticated && user ? (
                <>
                  {/* Profile Section */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Profile Information</CardTitle>
                          <CardDescription>Update your personal details and profile picture</CardDescription>
                        </div>
                        <Button
                          variant={isEditing ? "default" : "outline"}
                          size="sm"
                          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        >
                          {isEditing ? (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </>
                          ) : (
                            <>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center space-x-6">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={settings.avatar} alt="Profile picture" />
                          <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                        </Avatar>
                        {isEditing && (
                          <div className="space-y-2">
                            <Button variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Photo
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Full Name</Label>
                          <Input
                            id="fullName"
                            value={settings.fullName}
                            onChange={(e) => updateSetting('fullName', e.target.value)}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={user.username}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={settings.email}
                            onChange={(e) => updateSetting('email', e.target.value)}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Role</Label>
                          <Input
                            id="role"
                            value={user.role || 'User'}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell us about yourself..."
                          value={settings.bio}
                          onChange={(e) => updateSetting('bio', e.target.value)}
                          disabled={!isEditing}
                          className="min-h-[80px]"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Account Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-destructive">Danger Zone</CardTitle>
                      <CardDescription>Irreversible actions for your account</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
                        <div>
                          <h4 className="font-medium">Sign Out</h4>
                          <p className="text-sm text-muted-foreground">Sign out of your current session</p>
                        </div>
                        <Button variant="destructive" onClick={handleLogout}>
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
                        <div>
                          <h4 className="font-medium">Delete Account</h4>
                          <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                        </div>
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Not Signed In</h3>
                        <p className="text-muted-foreground mt-1">
                          Please sign in to access your account settings
                        </p>
                      </div>
                      <Button>Sign In</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              </div>
            )}

            {/* Appearance Section */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Theme & Display</CardTitle>
                  <CardDescription>Customize the look and feel of your workspace</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Theme</Label>
                    <RadioGroup
                      value={settings.theme}
                      onValueChange={(value) => updateSetting('theme', value)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="light" id="light" />
                        <Label htmlFor="light">Light</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dark" id="dark" />
                        <Label htmlFor="dark">Dark</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="system" id="system" />
                        <Label htmlFor="system">System</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>Font Size: {settings.fontSize}px</Label>
                    <Slider
                      value={[settings.fontSize]}
                      onValueChange={([value]) => updateSetting('fontSize', value)}
                      max={24}
                      min={10}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Sidebar Width: {settings.sidebarWidth}px</Label>
                    <Slider
                      value={[settings.sidebarWidth]}
                      onValueChange={([value]) => updateSetting('sidebarWidth', value)}
                      max={400}
                      min={200}
                      step={10}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Line Numbers</Label>
                        <p className="text-sm text-muted-foreground">Display line numbers in code editor</p>
                      </div>
                      <Switch
                        checked={settings.showLineNumbers}
                        onCheckedChange={(checked) => updateSetting('showLineNumbers', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Word Wrap</Label>
                        <p className="text-sm text-muted-foreground">Wrap long lines in editor</p>
                      </div>
                      <Switch
                        checked={settings.wordWrap}
                        onCheckedChange={(checked) => updateSetting('wordWrap', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            {/* Notifications Section */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose what notifications you want to receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <Switch
                        checked={settings.emailNotifications}
                        onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Browser push notifications</p>
                      </div>
                      <Switch
                        checked={settings.pushNotifications}
                        onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Workflow Notifications</Label>
                        <p className="text-sm text-muted-foreground">Notifications for workflow completion</p>
                      </div>
                      <Switch
                        checked={settings.workflowNotifications}
                        onCheckedChange={(checked) => updateSetting('workflowNotifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>System Alerts</Label>
                        <p className="text-sm text-muted-foreground">Important system notifications</p>
                      </div>
                      <Switch
                        checked={settings.systemAlerts}
                        onCheckedChange={(checked) => updateSetting('systemAlerts', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            {/* Workflow Section */}
            {activeTab === 'workflow' && (
              <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Settings</CardTitle>
                  <CardDescription>Configure default workflow behavior and execution settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="defaultLanguage">Default Language</Label>
                    <Select value={settings.defaultLanguage} onValueChange={(value) => updateSetting('defaultLanguage', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="r">R</SelectItem>
                        <SelectItem value="bash">Bash</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Max Concurrent Jobs: {settings.maxConcurrentJobs}</Label>
                    <Slider
                      value={[settings.maxConcurrentJobs]}
                      onValueChange={([value]) => updateSetting('maxConcurrentJobs', value)}
                      max={16}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto Execute</Label>
                        <p className="text-sm text-muted-foreground">Automatically execute workflows when created</p>
                      </div>
                      <Switch
                        checked={settings.autoExecute}
                        onCheckedChange={(checked) => updateSetting('autoExecute', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Parallel Execution</Label>
                        <p className="text-sm text-muted-foreground">Allow parallel execution of workflow nodes</p>
                      </div>
                      <Switch
                        checked={settings.parallelExecution}
                        onCheckedChange={(checked) => updateSetting('parallelExecution', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            {/* Performance Section */}
            {activeTab === 'performance' && (
              <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance & Storage</CardTitle>
                  <CardDescription>Optimize application performance and manage storage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Auto Save Interval: {settings.autoSaveInterval} seconds</Label>
                    <Slider
                      value={[settings.autoSaveInterval]}
                      onValueChange={([value]) => updateSetting('autoSaveInterval', value)}
                      max={300}
                      min={5}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Max Memory Usage: {settings.maxMemoryUsage}%</Label>
                    <Slider
                      value={[settings.maxMemoryUsage]}
                      onValueChange={([value]) => updateSetting('maxMemoryUsage', value)}
                      max={95}
                      min={50}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Cache Size: {settings.cacheSize} MB</Label>
                    <Slider
                      value={[settings.cacheSize]}
                      onValueChange={([value]) => updateSetting('cacheSize', value)}
                      max={4096}
                      min={256}
                      step={256}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto Save</Label>
                        <p className="text-sm text-muted-foreground">Automatically save changes</p>
                      </div>
                      <Switch
                        checked={settings.autoSave}
                        onCheckedChange={(checked) => updateSetting('autoSave', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>GPU Acceleration</Label>
                        <p className="text-sm text-muted-foreground">Use GPU for computational tasks</p>
                      </div>
                      <Switch
                        checked={settings.enableGPUAcceleration}
                        onCheckedChange={(checked) => updateSetting('enableGPUAcceleration', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Temp File Cleanup</Label>
                        <p className="text-sm text-muted-foreground">Automatically clean temporary files</p>
                      </div>
                      <Switch
                        checked={settings.tempFileCleanup}
                        onCheckedChange={(checked) => updateSetting('tempFileCleanup', checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="backupFrequency">Backup Frequency</Label>
                    <Select value={settings.backupFrequency} onValueChange={(value) => updateSetting('backupFrequency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </div>
            )}


          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default Settings
