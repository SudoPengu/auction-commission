
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Upload, X } from 'lucide-react';

interface ItemPhotoUploadProps {
  itemId: string;
  currentPhotoUrl?: string | null;
  onUpdate: () => void;
}

export const ItemPhotoUpload: React.FC<ItemPhotoUploadProps> = ({
  itemId,
  currentPhotoUrl,
  onUpdate
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${itemId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('inventory-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('inventory-photos')
        .getPublicUrl(fileName);

      // Update item record
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ photo_url: publicUrl })
        .eq('id', itemId);

      if (updateError) throw updateError;

      toast({
        title: "Photo Uploaded",
        description: "Item photo has been updated successfully",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const removePhoto = async () => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ photo_url: null })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Photo Removed",
        description: "Item photo has been removed",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-2">
      {currentPhotoUrl ? (
        <div className="relative">
          <img
            src={currentPhotoUrl}
            alt={`Photo of ${itemId}`}
            className="w-full h-32 object-cover rounded border"
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 bg-background/80"
            onClick={removePhoto}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <div className="w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded flex items-center justify-center bg-muted/10">
          <div className="text-center">
            <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">No photo</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"  
          size="sm"
          className="flex-1"
          disabled={isUploading}
          onClick={() => document.getElementById(`photo-${itemId}`)?.click()}
        >
          <Upload className="w-3 h-3 mr-1" />
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>

      <input
        id={`photo-${itemId}`}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
