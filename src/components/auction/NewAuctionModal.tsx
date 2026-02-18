import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Video, VideoOff, Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NewAuctionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const NewAuctionModal: React.FC<NewAuctionModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [themeTitle, setThemeTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entranceFee, setEntranceFee] = useState('0');

  // Initialize camera when modal opens
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      // Reset form when closing
      setTitle('');
      setDescription('');
      setThemeTitle('');
      setStartDate('');
      setEndDate('');
      setEntranceFee('0');
      setCameraError(null);
    }

    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError('Failed to access camera. Please check permissions.');
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please grant camera permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an auction title',
        variant: 'destructive',
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select start and end dates',
        variant: 'destructive',
      });
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      toast({
        title: 'Validation Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create auction event
      const { data: auctionEvent, error: auctionError } = await supabase
        .from('auction_events')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          theme_title: themeTitle.trim() || null,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          status: 'upcoming',
          entrance_fee: parseFloat(entranceFee) || 0,
        })
        .select()
        .single();

      if (auctionError) {
        throw auctionError;
      }

      // Generate a unique stream ID (we'll use the auction_streams id as the livestream_id)
      // For now, we'll create a stream entry with a placeholder URL
      // In production, you'd integrate with a streaming service (e.g., Agora, Twilio, etc.)
      const streamId = crypto.randomUUID();
      const streamUrl = `webrtc://stream-${streamId}`; // Placeholder - replace with actual streaming service URL

      // Create stream entry
      const { data: streamData, error: streamError } = await supabase
        .from('auction_streams')
        .insert({
          auction_id: auctionEvent.id,
          platform: 'custom', // Using 'custom' for browser-based streaming
          stream_url: streamUrl,
          entrance_fee: parseFloat(entranceFee) || 0,
          is_active: false, // Will be activated when auction starts
          viewer_count: 0,
        })
        .select()
        .single();

      if (streamError) {
        throw streamError;
      }

      toast({
        title: 'Success',
        description: 'Auction created successfully! You can start streaming when ready.',
      });

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating auction:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create auction. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Create New Auction with Live Stream
          </DialogTitle>
          <DialogDescription>
            Set up a new auction event and configure your live stream. Make sure your camera is ready.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Camera Preview */}
          <div className="space-y-2">
            <Label>Camera Preview</Label>
            <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
              {cameraError ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mb-2" />
                  <p className="text-sm">{cameraError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startCamera}
                    className="mt-4"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Retry Camera
                  </Button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center text-white">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p>Starting camera...</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            {isStreaming && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Video className="w-3 h-3 text-green-500" />
                Camera is active
              </p>
            )}
          </div>

          {/* Auction Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Auction Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Spring Collection Auction"
                required
              />
            </div>

            <div>
              <Label htmlFor="themeTitle">Theme Title</Label>
              <Input
                id="themeTitle"
                value={themeTitle}
                onChange={(e) => setThemeTitle(e.target.value)}
                placeholder="e.g., Vintage Finds"
              />
            </div>

            <div>
              <Label htmlFor="entranceFee">Entrance Fee (₱)</Label>
              <Input
                id="entranceFee"
                type="number"
                min="0"
                step="0.01"
                value={entranceFee}
                onChange={(e) => setEntranceFee(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="startDate">Start Date & Time *</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date & Time *</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the auction event..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !isStreaming}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Create Auction
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
