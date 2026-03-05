import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  Settings,
  Bell,
  Eye,
  Lock,
  Download,
  Camera,
  Save,
  Edit3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ActivityLog } from '@/components/profile/ActivityLog';
import { BidderFriendlyStats } from '@/components/profile/BidderFriendlyStats';
import DisplayNameEditor from '@/components/profile/DisplayNameEditor';
import { toast } from "@/hooks/use-toast";

const Profile: React.FC = () => {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    showActivity: true,
    showProfile: true,
    showBids: false
  });

  // TODO: Replace with actual activity log data from backend
  const mockActivityLog: any[] = [];

  // TODO: Replace with actual bidder stats from backend
  const mockBidderStats = {
    auctionWins: 0,
    participationRate: 0,
    favoriteItems: 0,
    memberSince: 'N/A',
    loyaltyPoints: 0,
    winningStreak: 0,
    totalAuctions: 0,
    avgPosition: 0
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'admin':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'auction-manager':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'staff':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'bidder':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSaveProfile = () => {
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved successfully.",
    });
  };

  const handleExportActivity = () => {
    toast({
      title: "Export Requested",
      description: "Your activity data export will be sent to your email shortly.",
    });
  };

  const isBidder = profile?.role === 'bidder';
  const isStaffOrAdmin = profile?.role && ['staff', 'admin', 'super-admin', 'auction-manager'].includes(profile.role);

  return (
    <div className="space-y-6 max-w-4xl mx-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile</h1>
        <Button
          variant="outline"
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2"
        >
          <Edit3 size={16} />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4 gap-1 p-1">
          <TabsTrigger value="overview" className="px-2 py-2 text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="activity" className="px-2 py-2 text-xs sm:text-sm">Activity</TabsTrigger>
          <TabsTrigger value="preferences" className="px-2 py-2 text-xs sm:text-sm">Preferences</TabsTrigger>
          <TabsTrigger value="security" className="px-2 py-2 text-xs sm:text-sm">Security</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Profile Header Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src="/placeholder-avatar.jpg" alt={profile?.full_name} />
                    <AvatarFallback className="text-lg">
                      {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0"
                    >
                      <Camera size={14} />
                    </Button>
                  )}
                </div>
                
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                    <h2 className="text-2xl font-bold break-words">{profile?.full_name}</h2>
                    <Badge variant="outline" className={`w-fit ${getRoleBadgeColor(profile?.role || '')}`}>
                      <Shield size={12} className="mr-1" />
                      {profile?.role?.replace('-', ' ')}
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground min-w-0">
                    <div className="flex items-start gap-1 min-w-0">
                      <Mail size={14} />
                      <span className="break-all">{profile?.email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      Member since N/A
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile?.full_name || ''}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-muted' : ''}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-muted' : ''}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profile?.phone_number || ''}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-muted' : ''}
                    placeholder="Enter your phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={profile?.role?.replace('-', ' ') || ''}
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
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-muted' : ''}
                  rows={3}
                />
              </div>
              
              {isEditing && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} className="flex items-center gap-2">
                    <Save size={16} />
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bidder-Friendly Stats (only for bidders) */}
          {isBidder && (
            <Card>
              <CardHeader>
                <CardTitle>My Auction Journey</CardTitle>
                <CardDescription>
                  Your achievements and participation highlights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BidderFriendlyStats stats={mockBidderStats} />
              </CardContent>
            </Card>
          )}

          {/* Staff/Admin Performance (only for staff/admin) */}
          {isStaffOrAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>
                  Your work activity and system performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                     <div className="text-2xl font-bold text-primary">0</div>
                     <p className="text-sm text-muted-foreground">Auctions Managed</p>
                   </div>
                   <div className="text-center">
                     <div className="text-2xl font-bold text-primary">0</div>
                     <p className="text-sm text-muted-foreground">POS Transactions</p>
                   </div>
                   <div className="text-center">
                     <div className="text-2xl font-bold text-primary">0%</div>
                     <p className="text-sm text-muted-foreground">System Uptime</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Activity History</h3>
              <p className="text-sm text-muted-foreground">
                Complete log of your account activity (read-only for security)
              </p>
            </div>
            <Button variant="outline" onClick={handleExportActivity} className="flex items-center gap-2">
              <Download size={16} />
              Export Data
            </Button>
          </div>
          
          <ActivityLog entries={mockActivityLog} />
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <DisplayNameEditor />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell size={20} />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to receive updates and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive auction updates via email
                  </p>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, emailNotifications: checked }))
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Real-time notifications in your browser
                  </p>
                </div>
                <Switch
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, pushNotifications: checked }))
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Important updates via text message
                  </p>
                </div>
                <Switch
                  checked={preferences.smsNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, smsNotifications: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye size={20} />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Control what information is visible to others
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Activity Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others see when you're online
                  </p>
                </div>
                <Switch
                  checked={preferences.showActivity}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, showActivity: checked }))
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Make your profile visible to other users
                  </p>
                </div>
                <Switch
                  checked={preferences.showProfile}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, showProfile: checked }))
                  }
                />
              </div>
              
              {isBidder && (
                <>
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Bid History</Label>
                      <p className="text-sm text-muted-foreground">
                        Display your bidding activity to others
                      </p>
                    </div>
                    <Switch
                      checked={preferences.showBids}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, showBids: checked }))
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock size={20} />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Change Password</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input type="password" placeholder="Current password" />
                  <Input type="password" placeholder="New password" />
                  <Button className="w-full sm:w-auto">Update</Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
                <Button variant="outline">Enable 2FA</Button>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Session Management</Label>
                <p className="text-sm text-muted-foreground">
                  View and manage your active sessions
                </p>
                <Button variant="outline">View Active Sessions</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;