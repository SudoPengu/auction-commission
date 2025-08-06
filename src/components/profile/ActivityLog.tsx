import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  LogIn, 
  LogOut, 
  Gavel, 
  Settings, 
  User, 
  CreditCard, 
  Shield,
  Smartphone,
  Monitor,
  MapPin
} from 'lucide-react';

interface ActivityLogEntry {
  id: string;
  action: string;
  resource: string;
  details: any;
  ip_address?: string;
  device_type?: 'mobile' | 'desktop';
  location?: string;
  created_at: string;
}

interface ActivityLogProps {
  entries: ActivityLogEntry[];
  className?: string;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ entries, className }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return <LogIn size={16} className="text-green-600" />;
      case 'logout':
        return <LogOut size={16} className="text-orange-600" />;
      case 'bid_placed':
      case 'auction_joined':
        return <Gavel size={16} className="text-blue-600" />;
      case 'profile_updated':
        return <User size={16} className="text-purple-600" />;
      case 'payment_processed':
        return <CreditCard size={16} className="text-green-600" />;
      case 'settings_changed':
        return <Settings size={16} className="text-gray-600" />;
      case 'security_event':
        return <Shield size={16} className="text-red-600" />;
      default:
        return <div className="w-4 h-4 bg-muted rounded-full" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'logout':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'bid_placed':
      case 'auction_joined':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'profile_updated':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'payment_processed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'settings_changed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'security_event':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const formatActivityDescription = (entry: ActivityLogEntry) => {
    const { action, resource, details } = entry;
    
    switch (action.toLowerCase()) {
      case 'login':
        return `Signed in to the platform`;
      case 'logout':
        return `Signed out from the platform`;
      case 'bid_placed':
        return `Placed bid of $${details?.amount || 'N/A'} on "${details?.item_name || resource}"`;
      case 'auction_joined':
        return `Joined auction: "${details?.auction_title || resource}"`;
      case 'profile_updated':
        return `Updated ${details?.field || 'profile information'}`;
      case 'payment_processed':
        return `Payment of $${details?.amount || 'N/A'} processed for ${details?.purpose || resource}`;
      case 'settings_changed':
        return `Modified ${details?.setting || resource} settings`;
      case 'security_event':
        return `Security event: ${details?.event_type || resource}`;
      default:
        return `${action.replace('_', ' ')} - ${resource}`;
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formatActivityDescription(entry).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>
          Complete history of your account activity (view-only for security)
        </CardDescription>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search activity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No matching activities found' : 'No activity recorded yet'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(entry.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium leading-tight">
                        {formatActivityDescription(entry)}
                      </p>
                      <Badge variant="outline" className={`text-xs ${getActionColor(entry.action)} flex-shrink-0`}>
                        {entry.action.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{new Date(entry.created_at).toLocaleString()}</span>
                      
                      {entry.device_type && (
                        <div className="flex items-center gap-1">
                          {entry.device_type === 'mobile' ? (
                            <Smartphone size={12} />
                          ) : (
                            <Monitor size={12} />
                          )}
                          <span className="capitalize">{entry.device_type}</span>
                        </div>
                      )}
                      
                      {entry.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{entry.location}</span>
                        </div>
                      )}
                      
                      {entry.ip_address && (
                        <span className="font-mono">
                          {entry.ip_address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};