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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
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

        {isAuthenticated && user ? (
          <div className="space-y-4">
            {/* User Profile Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar} alt={user.username} />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{user.full_name || user.username}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {user.role && (
                        <Badge variant="outline" className="mr-2">
                          {user.role}
                        </Badge>
                      )}
                      User ID: {user.id}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 opacity-70" />
                  <span className="font-medium">Username:</span>
                  <span>{user.username}</span>
                </div>
                
                {user.email && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 opacity-70" />
                    <span className="font-medium">Email:</span>
                    <span>{user.email}</span>
                  </div>
                )}
                
                {user.role && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Shield className="h-4 w-4 opacity-70" />
                    <span className="font-medium">Role:</span>
                    <span>{user.role}</span>
                  </div>
                )}
              </CardContent>
              <Separator />
              <CardFooter className="pt-3">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="ml-auto flex items-center space-x-1"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-muted-foreground">You are not currently logged in.</p>
            <Button className="mt-4" variant="outline">Login</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default Settings