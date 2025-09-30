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
    } catch (error: any) {
      console.error('❌ [SETTINGS-NEW] Save error:', error);
      toast.error(error.message || 'Failed to update profile');
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
    } catch (error: any) {
      console.error('❌ [SETTINGS-NEW] Avatar upload error:', error);
      toast.error(error.message || 'Failed to upload avatar');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl min-w-[50vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Manage your account settings and preferences
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
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Not Signed In</h3>
              <p className="text-muted-foreground mb-4">
                Please sign in to access your account settings
              </p>
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="account">
                <User className="h-4 w-4 mr-2" />
                Account
              </TabsTrigger>
              {user.is_admin && (
                <TabsTrigger value="admin">
                  <Users className="h-4 w-4 mr-2" />
                  User Management
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="account" className="space-y-6 mt-6">
              {/* Account Information Card */}
              <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>
                      Update your personal details and profile picture
                    </CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} size="sm">
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        size="sm"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        onClick={handleCancel}
                        disabled={isSaving}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-start gap-6 p-4 bg-muted/30 rounded-lg">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage src={formData.avatar} alt="Profile picture" />
                    <AvatarFallback className="text-xl font-semibold">{getInitials()}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm">Profile Picture</h4>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG or GIF. Max 5MB.
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
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Photo
                        </Button>
                        {formData.avatar && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleChange('avatar', '')}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Username (Read-only) */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Username
                    </Label>
                    <Input
                      id="username"
                      value={user.username}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Username cannot be changed
                    </p>
                  </div>

                  {/* Role (Read-only) */}
                  <div className="space-y-2">
                    <Label htmlFor="role" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Role
                    </Label>
                    <Input
                      id="role"
                      value={user.is_admin ? 'Admin' : 'User'}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      {user.is_admin ? 'You have admin privileges' : 'Standard user account'}
                    </p>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="full_name">
                      Full Name
                    </Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => handleChange('full_name', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
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

                {/* Bio - Full Width */}
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="bio" className="text-sm font-semibold">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Tell us about yourself..."
                    className="min-h-[120px] resize-none"
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      Brief description for your profile
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formData.bio.length} / 500
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-3 gap-6 text-sm">
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">Account ID</dt>
                    <dd className="font-mono text-base font-semibold">{user.id}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">Member Since</dt>
                    <dd className="text-base font-medium">{new Date(user.created_at || '').toLocaleDateString()}</dd>
                  </div>
                  {user.updated_at && (
                    <div className="space-y-1">
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">Last Updated</dt>
                      <dd className="text-base font-medium">{new Date(user.updated_at).toLocaleString()}</dd>
                    </div>
                  )}
                </dl>
                
                <Separator />
                
                {/* Logout Button */}
                <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <div>
                    <h4 className="font-medium text-sm">Sign Out</h4>
                    <p className="text-xs text-muted-foreground">
                      Sign out of your current session
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
              </CardContent>
            </Card>
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
