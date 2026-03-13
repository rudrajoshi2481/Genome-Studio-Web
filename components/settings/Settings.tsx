'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { host, port, getServerConfig } from '@/config/server';
import { toast } from 'sonner';

const config = getServerConfig();
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Save, X, Upload, Trash2, User, Mail, Shield, Users, LogOut, Camera, Calendar, Clock, Loader2, Check } from 'lucide-react';
import AdminPanel from './AdminPanel';

interface AccountFormData {
  full_name: string;
  email: string;
  bio: string;
  avatar: string;
}

export default function Settings() {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    full_name: '',
    email: '',
    bio: '',
    avatar: '',
  });

  // Initialize form data when user data is available
  useEffect(() => {
    if (user) {
      console.log('⚙️ [SETTINGS-NEW] Initializing form with user data:', user);
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!user) return 'U';
    if (user.full_name) {
      const parts = user.full_name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    return user.username?.substring(0, 2).toUpperCase() || 'U';
  };

  // Handle form field changes
  const handleChange = (field: keyof AccountFormData, value: string) => {
    console.log(`⚙️ [SETTINGS-NEW] Field changed: ${field} = ${value}`);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle save
  const handleSave = async () => {
    console.log('💾 [SETTINGS-NEW] Saving account info...');
    console.log('💾 [SETTINGS-NEW] Form data:', formData);

    setIsSaving(true);

    try {
      // Get token from cookies
      const cookies = document.cookie.split(';');
      console.log('💾 [SETTINGS-NEW] All cookies:', cookies.map(c => c.split('=')[0].trim()));
      console.log('💾 [SETTINGS-NEW] Looking for cookie:', config.auth.tokenStorageKey);
      
      const tokenCookie = cookies.find(cookie => 
        cookie.trim().startsWith(`${config.auth.tokenStorageKey}=`)
      );
      
      if (!tokenCookie) {
        console.error('❌ [SETTINGS-NEW] No token found');
        console.error('❌ [SETTINGS-NEW] Expected cookie name:', config.auth.tokenStorageKey);
        toast.error('Not authenticated. Please log in again.');
        return;
      }
      
      const token = tokenCookie.split('=')[1];
      console.log('✅ [SETTINGS-NEW] Token found:', token.substring(0, 20) + '...');

      console.log('💾 [SETTINGS-NEW] Token found, making API call...');

      const response = await fetch(`http://${host}:${port}/api/v1/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          bio: formData.bio,
          avatar: formData.avatar,
        }),
      });

      console.log('💾 [SETTINGS-NEW] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [SETTINGS-NEW] Error response:', error);
        throw new Error(error.detail || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      console.log('✅ [SETTINGS-NEW] Profile updated successfully:', updatedUser);

      // Update auth store with new user data
      useAuthStore.setState({ user: updatedUser });

      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: unknown) {
      console.error('❌ [SETTINGS-NEW] Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    console.log('❌ [SETTINGS-NEW] Canceling edit');
    // Reset form to original user data
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
      });
    }
    setIsEditing(false);
  };

  // Handle logout
  const handleLogout = () => {
    console.log('🚪 [SETTINGS] Logging out...');
    logout();
    setIsOpen(false);
    toast.success('Logged out successfully');
  };

  // Get the full avatar URL
  const getAvatarUrl = (avatarPath: string | undefined) => {
    if (!avatarPath) return '';
    // If it's already a full URL, return as-is
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    // Otherwise, prepend the server URL
    return `http://${host}:${port}${avatarPath}`;
  };

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📸 [SETTINGS] Avatar upload started:', file.name);
    setIsUploadingAvatar(true);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, GIF, or WebP)');
      setIsUploadingAvatar(false);
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      setIsUploadingAvatar(false);
      return;
    }

    try {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => 
        cookie.trim().startsWith(`${config.auth.tokenStorageKey}=`)
      );

      if (!tokenCookie) {
        console.error('❌ [SETTINGS] No token found for avatar upload');
        toast.error('Not authenticated');
        setIsUploadingAvatar(false);
        return;
      }
      
      const token = tokenCookie.split('=')[1];

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch(`http://${host}:${port}/api/v1/upload-avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload avatar');
      }

      const result = await response.json();
      console.log('✅ [SETTINGS] Avatar uploaded:', result);

      // Update form data with new avatar URL (store the path, not full URL)
      handleChange('avatar', result.avatar_url);
      
      // Also update the auth store immediately
      useAuthStore.setState({ 
        user: { ...user!, avatar: result.avatar_url } 
      });

      toast.success('Avatar uploaded successfully!');
    } catch (error: unknown) {
      console.error('❌ [SETTINGS] Avatar upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle avatar removal
  const handleRemoveAvatar = () => {
    handleChange('avatar', '');
    toast.info('Avatar removed. Save changes to apply.');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings" className="hover:bg-accent/80 transition-colors">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] min-w-[65vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">Settings</DialogTitle>
          <DialogDescription>
            Manage your account and preferences
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading your settings...</p>
            </div>
          </div>
        ) : !isAuthenticated || !user ? (
          <div className="px-8 py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Not Signed In</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Please sign in to access your account settings and preferences
            </p>
            <Button onClick={() => setIsOpen(false)} variant="outline" size="lg">
              Close
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="account" className="flex-1 flex flex-col">
            <div className="px-6">
              <TabsList className="grid w-auto inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1">
                <TabsTrigger value="account" className="rounded-md px-3">
                  <User className="h-4 w-4 mr-2" />
                  Account
                </TabsTrigger>
                {user.is_admin && (
                  <TabsTrigger value="admin" className="rounded-md px-3">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="account" className="flex-1 mt-4 px-6 pb-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-6">
                {/* Profile Header Card */}
                <Card>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-end justify-between mb-4">
                        {/* Avatar with upload overlay */}
                        <div className="relative group">
                          <Avatar className="h-20 w-20">
                            <AvatarImage 
                              src={getAvatarUrl(formData.avatar)} 
                              alt="Profile picture"
                              className="object-cover"
                            />
                            <AvatarFallback className="text-xl">
                              {getInitials()}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* Upload overlay - always visible when editing */}
                          {isEditing && (
                            <div 
                              className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer transition-opacity"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {isUploadingAvatar ? (
                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                              ) : (
                                <Camera className="h-6 w-6 text-white" />
                              )}
                            </div>
                          )}
                          
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={handleAvatarUpload}
                          />
                        </div>

                        {/* Edit/Save buttons */}
                        <div className="flex gap-2">
                          {!isEditing ? (
                            <Button 
                              onClick={() => setIsEditing(true)} 
                              variant="outline" 
                              className="shadow-sm"
                            >
                              Edit Profile
                            </Button>
                          ) : (
                            <>
                              <Button
                                onClick={handleCancel}
                                disabled={isSaving}
                                variant="ghost"
                                size="sm"
                              >
                                <X className="h-4 w-4 mr-1.5" />
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                size="sm"
                                className="shadow-sm"
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 mr-1.5" />
                                )}
                                {isSaving ? 'Saving...' : 'Save'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* User info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold">
                            {formData.full_name || user.username}
                          </h3>
                          {user.is_admin && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>

                      {/* Avatar actions when editing */}
                      {isEditing && (
                        <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingAvatar}
                            className="text-xs"
                          >
                            <Upload className="h-3.5 w-3.5 mr-1.5" />
                            Upload Photo
                          </Button>
                          {formData.avatar && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveAvatar}
                              className="text-xs text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              Remove
                            </Button>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            JPG, PNG, GIF or WebP • Max 5MB
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Profile Form */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>
                      Update your personal details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                        <Input
                          id="username"
                          value={user.username}
                          disabled
                          className="bg-muted/50 font-mono"
                        />
                        <p className="text-xs text-muted-foreground">Username cannot be changed</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="full_name" className="text-sm font-medium">Full Name</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('full_name', e.target.value)}
                          disabled={!isEditing}
                          placeholder="Enter your full name"
                          className={!isEditing ? 'bg-muted/50' : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('email', e.target.value)}
                        disabled={!isEditing}
                        placeholder="your.email@example.com"
                        className={!isEditing ? 'bg-muted/50' : ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('bio', e.target.value)}
                        disabled={!isEditing}
                        placeholder="Tell us a little about yourself..."
                        className={`min-h-[120px] resize-none ${!isEditing ? 'bg-muted/30' : ''}`}
                        maxLength={500}
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          Brief description for your profile
                        </p>
                        <p className={`text-xs ${formData.bio.length > 450 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {formData.bio.length}/500
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Account Info Card */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Account Information
                    </CardTitle>
                    <CardDescription>
                      Your account details and activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account ID</p>
                        <p className="font-mono text-lg font-semibold">#{user.id}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Member Since</p>
                        <p className="text-lg font-semibold">
                          {new Date(user.created_at || '').toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Updated</p>
                        <p className="text-lg font-semibold">
                          {user.updated_at 
                            ? new Date(user.updated_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })
                            : 'Never'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Session
                    </CardTitle>
                    <CardDescription>
                      Manage your current session
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <p className="font-medium">Sign Out</p>
                        <p className="text-sm text-muted-foreground">
                          End your current session and return to login
                        </p>
                      </div>
                      <Button
                        onClick={handleLogout}
                        variant="destructive"
                        className="shadow-sm"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Admin Panel Tab */}
            {user.is_admin && (
              <TabsContent value="admin" className="flex-1 mt-4 px-6 pb-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <AdminPanel />
              </TabsContent>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
