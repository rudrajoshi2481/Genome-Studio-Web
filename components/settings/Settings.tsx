import React from 'react'
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Settings as SettingsIcon, User, Mail, Shield, LogOut } from "lucide-react"

function Settings() {
  // Get user data from auth store
  const { user, isAuthenticated, logout } = useAuthStore()

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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open settings">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription>
            View and manage your account details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isAuthenticated && user ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={user.avatar} 
                      alt={`${user.username}'s avatar`} 
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {user.full_name || user.username}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {user.role && (
                        <Badge variant="secondary" className="text-xs">
                          {user.role}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ID: {user.id}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground">Username:</span>
                    <span className="ml-2 text-muted-foreground truncate">
                      {user.username}
                    </span>
                  </div>
                </div>
                
                {user.email && (
                  <div className="flex items-center space-x-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground">Email:</span>
                      <span className="ml-2 text-muted-foreground truncate">
                        {user.email}
                      </span>
                    </div>
                  </div>
                )}
                
                {user.role && (
                  <div className="flex items-center space-x-3 text-sm">
                    <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground">Role:</span>
                      <span className="ml-2 text-muted-foreground">
                        {user.role}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
              
              <Separator />
              
              <CardFooter className="pt-4">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="ml-auto"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="space-y-4">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Not logged in</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please log in to view your account settings
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default Settings
