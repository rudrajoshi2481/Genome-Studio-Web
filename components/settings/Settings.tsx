'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getHost, getPort, getServerConfig } from '@/config/server';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings as SettingsIcon, X, Upload, Trash2, User, Mail, Shield, LogOut, Camera, Calendar, Loader2, Check, IdCard, Clock, AlertTriangle } from 'lucide-react';
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

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

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

  const handleChange = (field: keyof AccountFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getToken = (): string | null => {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie =>
      cookie.trim().startsWith(`${config.auth.tokenStorageKey}=`)
    );
    return tokenCookie ? tokenCookie.split('=')[1] : null;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = getToken();
      if (!token) {
        // toast.error('Not authenticated. Please log in again.');
        return;
      }

      const response = await fetch(`http://${getHost()}:${getPort()}/api/v1/me`, {
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      useAuthStore.setState({ user: updatedUser });
      // toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: unknown) {
      // toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
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

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    // toast.success('Logged out successfully');
  };

  const getAvatarUrl = (avatarPath: string | undefined) => {
    if (!avatarPath) return '/profile_photo.jpg';
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return `http://${getHost()}:${getPort()}${avatarPath}`;
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      // toast.error('Please select a valid image file (JPG, PNG, GIF, or WebP)');
      setIsUploadingAvatar(false);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // toast.error('Image must be less than 5MB');
      setIsUploadingAvatar(false);
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        // toast.error('Not authenticated');
        setIsUploadingAvatar(false);
        return;
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch(`http://${getHost()}:${getPort()}/api/v1/upload-avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload avatar');
      }

      const result = await response.json();
      handleChange('avatar', result.avatar_url);
      useAuthStore.setState({ user: { ...user!, avatar: result.avatar_url } });
      // toast.success('Avatar uploaded successfully!');
    } catch (error: unknown) {
      // toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = () => {
    handleChange('avatar', '');
    // toast.info('Avatar removed. Save changes to apply.');
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings" className="hover:bg-accent/80 transition-colors">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[88vh] min-w-[70vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b bg-gradient-to-r from-muted/40 to-muted/10">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
              <SettingsIcon className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight">Settings</DialogTitle>
              <DialogDescription className="text-xs">Manage your account and preferences</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading your settings...</p>
            </div>
          </div>
        ) : !isAuthenticated || !user ? (
          <div className="px-8 py-20 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Not Signed In</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Please sign in to access your account settings and preferences
            </p>
            <Button onClick={() => setIsOpen(false)} variant="outline" size="lg">Close</Button>
          </div>
        ) : (
          <Tabs defaultValue="account" className="flex-1 flex-row gap-0">
            {/* Sidebar Tab Navigation */}
            <TabsList className="w-56 shrink-0 border-r bg-muted/20 p-3 h-auto flex-col items-stretch justify-start gap-1 rounded-none">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pb-1.5 pt-1">General</p>
              <TabsTrigger value="account" className="justify-start w-full h-auto flex-none px-3 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <User className="h-4 w-4 mr-2.5" />
                Account
              </TabsTrigger>
              {user.is_admin && (
                <TabsTrigger value="admin" className="justify-start w-full h-auto flex-none px-3 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                  <Shield className="h-4 w-4 mr-2.5" />
                  Admin
                </TabsTrigger>
              )}
              <TabsTrigger value="storage" className="justify-start w-full h-auto flex-none px-3 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <AlertTriangle className="h-4 w-4 mr-2.5" />
                Storage
              </TabsTrigger>
              <Separator className="my-2" />
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pb-1.5">Session</p>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="justify-start w-full px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
              >
                <LogOut className="h-4 w-4 mr-2.5" />
                Sign Out
              </Button>
            </TabsList>

            {/* Account Tab Content */}
            <TabsContent value="account" className="flex-1 m-0 p-0">
              <ScrollArea className="h-[calc(88vh-73px)]">
                <div className="p-8 space-y-8 max-w-2xl mx-auto">

                  {/* Profile Header — no card, just the gradient flowing into the page */}
                  <div className="relative">
                    <div className="h-24 rounded-xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />
                    <div className="px-1 -mt-12">
                      <div className="flex items-end gap-4">
                        <div className="relative group shrink-0">
                          <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                            <AvatarImage
                              src={getAvatarUrl(formData.avatar)}
                              alt="Profile picture"
                              className="object-cover"
                            />
                            <AvatarFallback className="text-2xl font-semibold bg-muted">
                              {getInitials()}
                            </AvatarFallback>
                          </Avatar>

                          {isEditing && (
                            <div
                              className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer transition-opacity opacity-0 group-hover:opacity-100"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {isUploadingAvatar ? (
                                <Loader2 className="h-7 w-7 text-white animate-spin" />
                              ) : (
                                <Camera className="h-7 w-7 text-white" />
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

                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-center gap-2.5">
                            <h2 className="text-2xl font-bold tracking-tight truncate">
                              {formData.full_name || user.username}
                            </h2>
                            {user.is_admin && (
                              <Badge variant="outline" className="border-primary/30 text-primary gap-1 shrink-0 bg-primary/5">
                                <Shield className="h-3 w-3" />
                                Admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">@{user.username}</p>
                        </div>

                        <div className="shrink-0 flex gap-2 pb-2">
                          {!isEditing ? (
                            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="h-8">
                              <User className="h-3.5 w-3.5 mr-1.5" />
                              Edit Profile
                            </Button>
                          ) : (
                            <>
                              <Button onClick={handleCancel} disabled={isSaving} variant="ghost" size="sm" className="h-8">
                                <X className="h-3.5 w-3.5 mr-1.5" />
                                Cancel
                              </Button>
                              <Button onClick={handleSave} disabled={isSaving} size="sm" className="h-8">
                                {isSaving ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                {isSaving ? 'Saving...' : 'Save Changes'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Avatar Actions Bar */}
                      {isEditing && (
                        <div className="flex items-center gap-3 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingAvatar}
                            className="text-xs h-7"
                          >
                            <Upload className="h-3 w-3 mr-1.5" />
                            Upload Photo
                          </Button>
                          {formData.avatar && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveAvatar}
                              className="text-xs h-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-1.5" />
                              Remove
                            </Button>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            JPG, PNG, GIF or WebP — Max 5MB
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Personal Information — flat section, no card border */}
                  <div className="space-y-5">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <h3 className="text-base font-semibold tracking-tight">Personal Information</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Update your personal details</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                        <Input
                          id="username"
                          value={user.username}
                          disabled
                          className="bg-muted/50 font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">Cannot be changed</p>
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
                        className={`min-h-[100px] resize-none ${!isEditing ? 'bg-muted/30' : ''}`}
                        maxLength={500}
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">Brief description for your profile</p>
                        <p className={`text-xs tabular-nums ${formData.bio.length > 450 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {formData.bio.length}/500
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Account Details — flat inline rows instead of card grid */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-semibold tracking-tight">Account Details</h3>
                    </div>
                    <div className="space-y-px">
                      <div className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2.5 text-muted-foreground">
                          <IdCard className="h-4 w-4" />
                          <span className="text-sm">Account ID</span>
                        </div>
                        <p className="font-mono text-sm font-semibold tabular-nums">#{user.id}</p>
                      </div>
                      <div className="flex items-center justify-between py-2.5 border-t">
                        <div className="flex items-center gap-2.5 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">Member Since</span>
                        </div>
                        <p className="text-sm font-semibold">{formatDate(user.created_at)}</p>
                      </div>
                      <div className="flex items-center justify-between py-2.5 border-t">
                        <div className="flex items-center gap-2.5 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Last Updated</span>
                        </div>
                        <p className="text-sm font-semibold">{formatDate(user.updated_at)}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Sign Out — flat, just a row with a button */}
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="font-medium text-sm">Sign Out</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        End your current session and return to the login page
                      </p>
                    </div>
                    <Button onClick={handleLogout} variant="outline" size="sm" className="h-8 text-destructive hover:bg-destructive/5 hover:text-destructive">
                      <LogOut className="h-3.5 w-3.5 mr-1.5" />
                      Sign Out
                    </Button>
                  </div>

                </div>
              </ScrollArea>
            </TabsContent>

            {/* Admin Panel Tab */}
            {user.is_admin && (
              <TabsContent value="admin" className="flex-1 m-0 p-0">
                <ScrollArea className="h-[calc(88vh-73px)]">
                  <div className="p-8">
                    <AdminPanel />
                  </div>
                </ScrollArea>
              </TabsContent>
            )}

            {/* Storage Tab */}
            <TabsContent value="storage" className="flex-1 m-0 p-0">
              <ScrollArea className="h-[calc(88vh-73px)]">
                <div className="p-8 space-y-6 max-w-2xl mx-auto">
                  <div>
                    <h3 className="text-base font-semibold tracking-tight">Storage & Cache</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage cached data and local storage</p>
                  </div>

                  <Separator />

                  {/* Danger Zone - Clear Cache */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <h4 className="text-sm font-semibold text-destructive">Danger Zone</h4>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">Clear All Cache & Storage</p>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
                        Removes all localStorage, sessionStorage, and zustand persisted state (chat sessions, model selection, workspace paths, UI preferences) except login token and authentication data. The page will reload.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5 h-8"
                      onClick={() => {
                        if (!window.confirm('This will clear ALL cached data except login token. The page will reload. Continue?')) return;
                        const PRESERVE_KEYS = new Set([
                          'auth_token',
                          'bioinformatics_studio_token',
                          'bioinformatics_studio_refresh_token',
                          'bioinformatics_studio_token_expiry',
                        ]);
                        const preserved: Record<string, string> = {};
                        PRESERVE_KEYS.forEach(key => {
                          const val = localStorage.getItem(key);
                          if (val !== null) preserved[key] = val;
                        });
                        localStorage.clear();
                        Object.entries(preserved).forEach(([key, val]) => {
                          localStorage.setItem(key, val);
                        });
                        sessionStorage.clear();
                        window.location.reload();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear Cache
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
