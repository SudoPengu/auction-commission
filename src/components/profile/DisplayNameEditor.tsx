import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Edit3, Save, X, Clock, AlertCircle } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/contexts/AuthContext';

const DisplayNameEditor: React.FC = () => {
  const { profile } = useAuth();
  const { preferences, canChangeDisplayName, updateDisplayName } = useUserPreferences();
  const [isEditing, setIsEditing] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStartEdit = () => {
    setNewDisplayName(preferences?.display_name || profile?.full_name || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!newDisplayName.trim()) return;
    
    setIsLoading(true);
    const success = await updateDisplayName(newDisplayName.trim());
    setIsLoading(false);
    
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewDisplayName('');
  };

  const getNextChangeDate = () => {
    if (!preferences?.display_name_changed_at) return null;
    const lastChange = new Date(preferences.display_name_changed_at);
    const nextChange = new Date(lastChange.getTime() + 7 * 24 * 60 * 60 * 1000);
    return nextChange;
  };

  const nextChangeDate = getNextChangeDate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 size={20} />
          Display Name
        </CardTitle>
        <CardDescription>
          Your display name is shown to other users. You can change it once every 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Current Display Name</Label>
            <div className="flex items-center gap-2">
              <p className="font-medium">
                {preferences?.display_name || profile?.full_name || 'Not set'}
              </p>
              {preferences?.display_name && (
                <Badge variant="secondary" className="text-xs">Custom</Badge>
              )}
            </div>
          </div>
          
          {!isEditing && (
            <Button
              variant="outline"
              onClick={handleStartEdit}
              disabled={!canChangeDisplayName}
              className="flex items-center gap-2"
            >
              <Edit3 size={16} />
              {canChangeDisplayName ? 'Change' : 'Locked'}
            </Button>
          )}
        </div>

        {!canChangeDisplayName && nextChangeDate && (
          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
            <Clock size={16} className="text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-muted-foreground">Cooldown Active</p>
              <p className="text-muted-foreground">
                You can change your display name again on{' '}
                <span className="font-medium">
                  {nextChangeDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </p>
            </div>
          </div>
        )}

        {isEditing && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">New Display Name</Label>
                <Input
                  id="displayName"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  {newDisplayName.length}/50 characters
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle size={16} className="text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Important</p>
                  <p>Once changed, you'll need to wait 7 days before changing it again.</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X size={16} className="mr-1" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!newDisplayName.trim() || isLoading}
                  className="flex items-center gap-2"
                >
                  <Save size={16} />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DisplayNameEditor;