'use client';

import React, { useState, useEffect } from 'react';
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
import { Settings as SettingsIcon, Save, X, Upload, Trash2, User, Mail, Shield, Users, LogOut } from 'lucide-react';
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

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📸 [SETTINGS-NEW] Avatar upload started:', file.name);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => 
        cookie.trim().startsWith(`${config.auth.tokenStorageKey}=`)
      );

      if (!tokenCookie) {
        console.error('❌ [SETTINGS-NEW] No token found for avatar upload');
        toast.error('Not authenticated');
        return;
      }
      
      const token = tokenCookie.split('=')[1];

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://${host}:${port}/api/v1/upload-avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload avatar');
      }

      const result = await response.json();
      console.log('✅ [SETTINGS-NEW] Avatar uploaded:', result);

      // Update form data with new avatar URL
      handleChange('avatar', `http://${host}:${port}${result.avatar_url}`);

      toast.success('Avatar uploaded successfully!');
    } catch (error: unknown) {
      console.error('❌ [SETTINGS-NEW] Avatar upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[85vh] min-w-[65vw] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">Settings</DialogTitle>
          <DialogDescription className="text-sm">
            Manage your account and preferences
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        ) : !isAuthenticated || !user ? (
          <div className="px-6 py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Not Signed In</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please sign in to access your account settings
            </p>
            <Button onClick={() => setIsOpen(false)} variant="outline">Close</Button>
          </div>
        ) : (
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="mx-6 mt-4 grid w-auto inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1">
              <TabsTrigger value="account" className="rounded-md px-3">
                <User className="h-4 w-4 mr-2" />
                Account
              </TabsTrigger>
              {user.is_admin && (
                <TabsTrigger value="admin" className="rounded-md px-3">
                  <Users className="h-4 w-4 mr-2" />
                  Admin
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="account" className="px-6 pb-6 mt-6 space-y-6 overflow-y-auto max-h-[calc(85vh-180px)]">
              {/* Profile Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Profile</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your personal information
                    </p>
                  </div>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCancel}
                        disabled={isSaving}
                        variant="ghost"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        size="sm"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={formData.avatar} alt="Profile picture" />
                    <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium">Profile Picture</p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG or GIF. Max 5MB
                      </p>
                    </div>
                    {isEditing && (
                      <div className="flex gap-2">
                        <input
                          type="file"
                          id="avatar-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('avatar-upload')?.click()}
                        >
                          <Upload className="h-3.5 w-3.5 mr-2" />
                          Upload
                        </Button>
                        {formData.avatar && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleChange('avatar', '')}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-sm">Username</Label>
                      <Input
                        id="username"
                        value={user.username}
                        disabled
                        className="bg-muted/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-sm">Role</Label>
                      <Input
                        id="role"
                        value={user.is_admin ? 'Admin' : 'User'}
                        disabled
                        className="bg-muted/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-sm">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => handleChange('full_name', e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        disabled={!isEditing}
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-sm">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleChange('bio', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Tell us about yourself..."
                      className="min-h-[100px] resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {formData.bio.length} / 500
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Account Details</h3>
                  <p className="text-sm text-muted-foreground">
                    View your account information
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Account ID</p>
                    <p className="font-mono text-sm font-medium">{user.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Member Since</p>
                    <p className="text-sm font-medium">{new Date(user.created_at || '').toLocaleDateString()}</p>
                  </div>
                  {user.updated_at && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="text-sm font-medium">{new Date(user.updated_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground">
                    Irreversible actions
                  </p>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Sign Out</p>
                    <p className="text-xs text-muted-foreground">
                      End your current session
                    </p>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="destructive"
                    size="sm"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Admin Panel Tab */}
            {user.is_admin && (
              <TabsContent value="admin" className="mt-6">
                <AdminPanel />
              </TabsContent>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
