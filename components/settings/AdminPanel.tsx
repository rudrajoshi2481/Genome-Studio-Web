'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { host, port, getServerConfig } from '@/config/server';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield, ShieldOff, ShieldCheck, Users, RefreshCw, User as UserIcon, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const config = getServerConfig();

interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  avatar?: string;
  bio?: string;
  disabled: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at?: string;
}

export default function AdminPanel() {
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<'promote' | 'demote'>('promote');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    is_admin: false,
  });
  const [createError, setCreateError] = useState('');

  // Check if current user is admin
  const isAdmin = currentUser?.is_admin === true;

  // Fetch all users
  const fetchUsers = async () => {
    console.log('👥 [ADMIN-PANEL] Fetching users...');
    setIsLoading(true);

    try {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie =>
        cookie.trim().startsWith(`${config.auth.tokenStorageKey}=`)
      );

      if (!tokenCookie) {
        // toast.error('Not authenticated');
        return;
      }

      const token = tokenCookie.split('=')[1];

      const response = await fetch(`http://${host}:${port}/api/v1/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('👥 [ADMIN-PANEL] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch users');
      }

      const data = await response.json();
      console.log('✅ [ADMIN-PANEL] Users fetched:', data.length);
      setUsers(data);
    } catch (error: unknown) {
      console.error('❌ [ADMIN-PANEL] Error:', error);
      // toast.error(error instanceof Error ? error.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  // Update user role
  const updateUserRole = async (userId: number, isAdmin: boolean) => {
    console.log(`👑 [ADMIN-PANEL] Updating user ${userId} admin status to:`, isAdmin);

    try {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie =>
        cookie.trim().startsWith(`${config.auth.tokenStorageKey}=`)
      );

      if (!tokenCookie) {
        // toast.error('Not authenticated');
        return;
      }

      const token = tokenCookie.split('=')[1];

      const response = await fetch(`http://${host}:${port}/api/v1/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_admin: isAdmin }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update user role');
      }

      const updatedUser = await response.json();
      console.log('✅ [ADMIN-PANEL] User role updated:', updatedUser);

      // Update local state
      setUsers(users.map(u => u.id === userId ? updatedUser : u));

      // toast.success(
        // isAdmin
          // ? `${updatedUser.username} is now an admin`
          // : `${updatedUser.username} is no longer an admin`
      // );
    } catch (error: unknown) {
      console.error('❌ [ADMIN-PANEL] Error:', error);
      // toast.error(error instanceof Error ? error.message : 'Failed to update user role');
    }
  };

  // Handle role change confirmation
  const handleRoleChange = (user: User, newAdminStatus: boolean) => {
    setSelectedUser(user);
    setActionType(newAdminStatus ? 'promote' : 'demote');
    setShowConfirmDialog(true);
  };

  // Confirm role change
  const confirmRoleChange = () => {
    if (selectedUser) {
      updateUserRole(selectedUser.id, actionType === 'promote');
    }
    setShowConfirmDialog(false);
    setSelectedUser(null);
  };

  // Toggle user selection for bulk delete
  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Toggle select all (excluding self)
  const toggleSelectAll = () => {
    const selectableUsers = users.filter(u => u.id !== currentUser?.id);
    if (selectedUserIds.size === selectableUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(selectableUsers.map(u => u.id)));
    }
  };

  // Create new user (admin only)
  const handleCreateUser = async () => {
    setCreateError('');
    if (createForm.password.length < 8) {
      setCreateError('Password must be at least 8 characters');
      return;
    }
    setIsCreating(true);
    try {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie =>
        cookie.trim().startsWith(`${config.auth.tokenStorageKey}=`)
      );
      if (!tokenCookie) return;
      const token = tokenCookie.split('=')[1];

      const response = await fetch(`http://${host}:${port}/api/v1/users/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: createForm.username,
          email: createForm.email,
          password: createForm.password,
          full_name: createForm.full_name || null,
          is_admin: createForm.is_admin,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create user');
      }

      const newUser = await response.json();
      console.log('✅ [ADMIN-PANEL] User created:', newUser);
      setUsers(prev => [...prev, newUser]);
      setCreateForm({ username: '', email: '', password: '', full_name: '', is_admin: false });
      setShowCreateDialog(false);
    } catch (error: unknown) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  // Bulk delete users
  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie =>
        cookie.trim().startsWith(`${config.auth.tokenStorageKey}=`)
      );
      if (!tokenCookie) return;
      const token = tokenCookie.split('=')[1];

      const response = await fetch(`http://${host}:${port}/api/v1/users/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ user_ids: Array.from(selectedUserIds) }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete users');
      }

      const data = await response.json();
      console.log('✅ [ADMIN-PANEL] Bulk delete result:', data);

      // Remove deleted users from state
      setUsers(prev => prev.filter(u => !selectedUserIds.has(u.id)));
      setSelectedUserIds(new Set());
      setShowBulkDeleteDialog(false);
    } catch (error: unknown) {
      console.error('❌ [ADMIN-PANEL] Bulk delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getAvatarUrl = (avatarPath: string | undefined) => {
    if (!avatarPath) return '/profile_photo.jpg';
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return `http://${host}:${port}${avatarPath}`;
  };

  // Get user initials
  const getInitials = (user: User) => {
    if (user.full_name) {
      const parts = user.full_name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  // Load users on mount
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchUsers();
    }
  }, [isAuthenticated, isAdmin]);

  // Show access denied if not admin
  if (!isAuthenticated || !isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
          <p className="text-muted-foreground">
            You need administrator privileges to access this panel
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedUserIds.size > 0 && (
                <Button
                  onClick={() => setShowBulkDeleteDialog(true)}
                  disabled={isDeleting}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedUserIds.size})
                </Button>
              )}
              <Button
                onClick={() => setShowCreateDialog(true)}
                variant="default"
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
              <Button
                onClick={fetchUsers}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && users.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={users.length > 1 && selectedUserIds.size === users.filter(u => u.id !== currentUser?.id).length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={selectedUserIds.has(user.id) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        {user.id !== currentUser?.id && (
                          <Checkbox
                            checked={selectedUserIds.has(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={getAvatarUrl(user.avatar)} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            {user.full_name && (
                              <div className="text-xs text-muted-foreground">
                                {user.full_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <Badge variant="default" className="gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <UserIcon className="h-3 w-3" />
                            User
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {user.id === currentUser?.id ? (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        ) : user.is_admin ? (
                          <Button
                            onClick={() => handleRoleChange(user, false)}
                            variant="outline"
                            size="sm"
                          >
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Remove Admin
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleRoleChange(user, true)}
                            variant="default"
                            size="sm"
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Make Admin
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
            <div>
              Total Users: <span className="font-medium text-foreground">{users.length}</span>
            </div>
            <div>
              Admins: <span className="font-medium text-foreground">
                {users.filter(u => u.is_admin).length}
              </span>
            </div>
            <div>
              Regular Users: <span className="font-medium text-foreground">
                {users.filter(u => !u.is_admin).length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'promote' ? 'Promote to Admin?' : 'Remove Admin Privileges?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'promote' ? (
                <>
                  Are you sure you want to make <strong>{selectedUser?.username}</strong> an administrator?
                  They will have full access to all system features including user management.
                </>
              ) : (
                <>
                  Are you sure you want to remove admin privileges from <strong>{selectedUser?.username}</strong>?
                  They will lose access to administrative features.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              {actionType === 'promote' ? 'Promote' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedUserIds.size} User{selectedUserIds.size > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">
                Are you sure you want to delete <strong>{selectedUserIds.size}</strong> user{selectedUserIds.size > 1 ? 's' : ''}?
                This action <strong>cannot be undone</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                Users to be deleted: {users.filter(u => selectedUserIds.has(u.id)).map(u => u.username).join(', ')}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : `Delete ${selectedUserIds.size} User${selectedUserIds.size > 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) setCreateError(''); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Add a new user account. They can log in immediately with these credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {createError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {createError}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="create-username">Username <span className="text-red-500">*</span></Label>
              <Input
                id="create-username"
                placeholder="Enter username"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                disabled={isCreating}
                minLength={3}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">3-50 characters, alphanumeric only</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="create-email"
                type="email"
                placeholder="user@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                disabled={isCreating}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-fullname">Full Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="create-fullname"
                placeholder="User's full name"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                disabled={isCreating}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-password">Password <span className="text-red-500">*</span></Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Minimum 8 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                disabled={isCreating}
                minLength={8}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="create-admin" className="cursor-pointer">Admin privileges</Label>
                <p className="text-xs text-muted-foreground">Grant this user admin access</p>
              </div>
              <Switch
                id="create-admin"
                checked={createForm.is_admin}
                onCheckedChange={(checked) => setCreateForm({ ...createForm, is_admin: checked })}
                disabled={isCreating}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={isCreating || !createForm.username.trim() || !createForm.email.trim() || !createForm.password.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}