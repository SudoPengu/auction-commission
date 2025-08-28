import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserPreferences {
  display_name?: string | null;
  display_name_changed_at?: string | null;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy_settings: {
    show_activity: boolean;
    show_profile: boolean;
    show_bids: boolean;
  };
  avatar_url?: string | null;
  bio?: string | null;
  theme: string;
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [canChangeDisplayName, setCanChangeDisplayName] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          display_name: data.display_name,
          display_name_changed_at: data.display_name_changed_at,
          notifications: data.notifications as any,
          privacy_settings: data.privacy_settings as any,
          avatar_url: data.avatar_url,
          bio: data.bio,
          theme: data.theme
        });
      } else {
        // Create default preferences if none exist
        const defaultPrefs = {
          user_id: user.id,
          notifications: { email: true, push: true, sms: false },
          privacy_settings: { show_activity: true, show_profile: true, show_bids: false },
          theme: 'light'
        };
        
        const { data: newData, error: insertError } = await supabase
          .from('user_preferences')
          .insert(defaultPrefs)
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences({
          display_name: newData.display_name,
          display_name_changed_at: newData.display_name_changed_at,
          notifications: newData.notifications as any,
          privacy_settings: newData.privacy_settings as any,
          avatar_url: newData.avatar_url,
          bio: newData.bio,
          theme: newData.theme
        });
      }

      // Check if user can change display name
      const { data: canChangeData, error: canChangeError } = await supabase
        .rpc('can_change_display_name', { user_id: user.id });

      if (!canChangeError) {
        setCanChangeDisplayName(canChangeData);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDisplayName = async (newDisplayName: string) => {
    try {
      const { data, error } = await supabase
        .rpc('update_display_name', { new_display_name: newDisplayName });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (result.success) {
        toast({
          title: "Display name updated",
          description: "Your display name has been successfully updated.",
        });
        await fetchPreferences(); // Refresh preferences
        return true;
      } else {
        toast({
          title: "Cannot update display name",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error updating display name:', error);
      toast({
        title: "Error",
        description: "Failed to update display name. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  };

  return {
    preferences,
    loading,
    canChangeDisplayName,
    updateDisplayName,
    updatePreferences,
    refetch: fetchPreferences
  };
}