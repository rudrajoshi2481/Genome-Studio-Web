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
import { Shield, ShieldOff, Users, RefreshCw, Crown, User as UserIcon } from 'lucide-react';

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
        toast.error('Not authenticated');
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
    } catch (error: any) {
      console.error('❌ [ADMIN-PANEL] Error:', error);
      toast.error(error.message || 'Failed to fetch users');
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
        toast.error('Not authenticated');
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

      toast.success(
        isAdmin
          ? `${updatedUser.username} is now an admin`
          : `${updatedUser.username} is no longer an admin`
      );
    } catch (error: any) {
      console.error('❌ [ADMIN-PANEL] Error:', error);
      toast.error(error.message || 'Failed to update user role');
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
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
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
                            <Crown className="h-3 w-3" />
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

      {/* Confirmation Dialog */}
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
    </>
  );
}
