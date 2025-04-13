
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "@/hooks/use-toast";
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Save, User, Key } from 'lucide-react';

// Map of emails to usernames for reference
const EMAIL_TO_USERNAME_MAP: Record<string, string> = {
  'admin@bluesky.com': 'admin0',
  'staff@bluesky.com': 'staff0',
  'superadmin@bluesky.com': 'superadmin',
  'auctionmanager@bluesky.com': 'manager',
};

const Users: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const { profile } = useAuth();
  
  // Only super-admin and admin can update passwords
  const canUpdatePasswords = profile?.role === 'super-admin' || profile?.role === 'admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch users from Supabase user_profiles table
      const { data, error } = await supabase.from('user_profiles').select('*');
      
      if (error) {
        throw error;
      }
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load user data"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !newPassword || newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: "Please select a user and enter a valid password (min 6 characters)"
      });
      return;
    }

    try {
      // Call Supabase's admin-level password reset function using edge function
      const { error } = await supabase.functions.invoke('admin-update-password', {
        body: { userId: selectedUser, newPassword }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully"
      });
      
      setNewPassword('');
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update password"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">User Accounts</h3>
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Username</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => canUpdatePasswords && setSelectedUser(user.id)}>
                          <td className="px-4 py-3 text-sm">{user.full_name}</td>
                          <td className="px-4 py-3 text-sm">{user.email}</td>
                          <td className="px-4 py-3 text-sm">{EMAIL_TO_USERNAME_MAP[user.email] || '-'}</td>
                          <td className="px-4 py-3 text-sm capitalize">{user.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {canUpdatePasswords && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-medium">Update Password</h3>
                  <form onSubmit={updatePassword} className="space-y-4">
                    <div>
                      <Label htmlFor="user-select">Selected User</Label>
                      <div className="relative mt-1.5">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <select
                          id="user-select"
                          className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={selectedUser || ''}
                          onChange={(e) => setSelectedUser(e.target.value)}
                          required
                        >
                          <option value="">Select a user</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.full_name} ({EMAIL_TO_USERNAME_MAP[user.email] || user.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative mt-1.5">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-10"
                          placeholder="Enter new password"
                          minLength={6}
                          required
                        />
                      </div>
                    </div>
                    
                    <Button type="submit" className="flex gap-2">
                      <Save size={16} />
                      Update Password
                    </Button>
                  </form>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
