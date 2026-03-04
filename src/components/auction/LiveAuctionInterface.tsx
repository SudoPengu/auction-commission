import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Gavel, Clock, Users, AlertCircle, Mic, Video, Settings, Play, Pause, SkipForward, Camera, VideoOff, Package, Plus, Square, Volume2, VolumeX, Send, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useAuctionRealtime } from '@/hooks/useAuctionRealtime';
import { supabase } from '@/integrations/supabase/client';
import BidPanel from './BidPanel';
import { AuctionLot, BidResponse } from '@/types/auction';
import { toast } from '@/hooks/use-toast';
import { InventoryItem } from '@/services/inventoryService';
import {
  MockLotSettlementRecord,
  MockSettlementStatus,
  getAuctionMockSettlements,
  syncSoldLotsToMockSettlement,
  updateMockSettlementStatus,
} from '@/utils/mockAuctionSettlement';

// Build ICE servers list — supports custom TURN via env vars
const buildIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  // Custom TURN server from env vars (recommended: sign up at https://www.metered.ca/stun-turn for free)
  const turnUrl = import.meta.env.VITE_TURN_SERVER_URL;
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUser && turnCred) {
    // Add custom TURN server (UDP, TCP, and TLS variants)
    servers.push(
      { urls: turnUrl, username: turnUser, credential: turnCred },
    );
    // If the URL is a single turn: URL, also add TCP and TLS variants
    if (turnUrl.startsWith('turn:')) {
      const host = turnUrl.replace('turn:', '');
      servers.push(
        { urls: `turn:${host}:443?transport=tcp`, username: turnUser, credential: turnCred },
        { urls: `turns:${host}:443`, username: turnUser, credential: turnCred },
      );
    }
    console.log('[WebRTC] Using custom TURN server:', turnUrl);
  } else {
    // Fallback: free public TURN servers (may be unreliable)
    servers.push(
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turns:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:relay1.expressturn.com:3478', username: 'efQBPJVOZC9GIJSYEX', credential: 'g5wkXBjQQyCuMmqL' },
    );
    console.log('[WebRTC] Using fallback free TURN servers');
  }

  return servers;
};

// Shared WebRTC ICE configuration with STUN + TURN servers
const ICE_SERVERS_CONFIG: RTCConfiguration = {
  iceServers: buildIceServers(),
  iceCandidatePoolSize: 10,
};

interface LiveAuctionInterfaceProps {
  auctionId: string;
  auctionTitle: string;
}

const LiveAuctionInterface: React.FC<LiveAuctionInterfaceProps> = ({
  auctionId,
  auctionTitle
}) => {
  const { user, profile } = useAuth();
  const { lots, bids, isConnected } = useAuctionRealtime(auctionId);
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [currentLot, setCurrentLot] = useState<AuctionLot | null>(null);
  
  // Camera streaming state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  
  // Inventory items state
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  
  // Stream URL for bidders
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const bidderVideoRef = useRef<HTMLVideoElement>(null);
  
  // WebRTC state
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map()); // For admin: track connections per bidder
  const signalingChannelRef = useRef<any>(null);
  const [webrtcConnected, setWebrtcConnected] = useState(false);
  
  // MediaRecorder for chunk-based streaming (fallback/simple approach)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Mobile autoplay & audio state
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay, unmute after interaction

  // Quick bid state
  const [quickBidAmount, setQuickBidAmount] = useState(0);
  const [manualBidInput, setManualBidInput] = useState('');
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [settlementByLotId, setSettlementByLotId] = useState<Record<string, MockLotSettlementRecord>>({});
  const [hidePaidLots, setHidePaidLots] = useState(false);

  const isBidder = profile?.role === 'bidder';
  const isStaffOrAdmin = profile?.role && ['staff', 'admin', 'super-admin', 'auction-manager'].includes(profile.role);

  // Check access for bidders
  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !isBidder) {
        setHasAccess(true); // Staff/admin always have access
        setIsCheckingAccess(false);
        return;
      }

      try {
        // Primary check: auction_entrance_fees table
        const { data: feeData, error: feeError } = await supabase
          .from('auction_entrance_fees')
          .select('payment_status, access_expires_at')
          .eq('auction_id', auctionId)
          .eq('bidder_id', user.id)
          .eq('payment_status', 'paid')
          .maybeSingle();

        if (!feeError && feeData) {
          const now = new Date();
          const expiresAt = new Date(feeData.access_expires_at);
          setHasAccess(now < expiresAt);
          setIsCheckingAccess(false);
          return;
        }

        // Fallback check: entrance_fee_receipts table (in case fee record insert failed)
        const { data: receiptData, error: receiptError } = await supabase
          .from('entrance_fee_receipts')
          .select('status')
          .eq('auction_id', auctionId)
          .eq('bidder_id', user.id)
          .eq('status', 'approved')
          .maybeSingle();

        if (!receiptError && receiptData) {
          setHasAccess(true);
          setIsCheckingAccess(false);
          return;
        }

        setHasAccess(false);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user, isBidder, auctionId]);

  // Set current lot (first OPEN lot, or first lot if none are open)
  useEffect(() => {
    const openLot = lots.find(lot => lot.status === 'OPEN');
    setCurrentLot(openLot || lots[0] || null);
  }, [lots]);

  const refreshSettlementMap = useCallback(async () => {
    try {
      const rows = await getAuctionMockSettlements(auctionId);
      setSettlementByLotId(
        rows.reduce<Record<string, MockLotSettlementRecord>>((acc, row) => {
          acc[row.lotId] = row;
          return acc;
        }, {})
      );
    } catch (error) {
      console.error('[Auction] Failed to refresh settlement map:', error);
    }
  }, [auctionId]);

  useEffect(() => {
    const soldLots = lots
      .filter((lot) => lot.status === 'SOLD' && !!lot.current_bidder_id)
      .map((lot) => ({
        lotId: lot.id,
        auctionId: lot.auction_id,
        bidderId: lot.current_bidder_id as string,
        lotTitle: lot.title,
        lotNumber: lot.lot_number,
        amount: lot.current_price,
      }));

    const syncAndRefresh = async () => {
      try {
        if (soldLots.length > 0) {
          await syncSoldLotsToMockSettlement(soldLots);
        }
      } catch (error) {
        console.error('[Auction] Failed syncing sold lots:', error);
      } finally {
        await refreshSettlementMap();
      }
    };
    syncAndRefresh();
  }, [lots, auctionId, refreshSettlementMap]);

  // Cleanup camera on unmount — only releases hardware, does NOT end the auction
  useEffect(() => {
    return () => {
      releaseCamera();
    };
  }, []);

  // Fetch inventory items
  useEffect(() => {
    if (isStaffOrAdmin) {
      fetchInventoryItems();
    }
  }, [isStaffOrAdmin, auctionId]);

  // Set up WebRTC signaling for bidders
  useEffect(() => {
    if (isBidder) {
      setupBidderWebRTC();
      
      // Debug: Check connection state periodically
      const debugInterval = setInterval(() => {
        if (peerConnectionRef.current) {
          const pc = peerConnectionRef.current;
          console.log('[WebRTC Bidder] Debug - Connection state:', {
            connectionState: pc.connectionState,
            signalingState: pc.signalingState,
            iceConnectionState: pc.iceConnectionState,
            iceGatheringState: pc.iceGatheringState,
            hasRemoteDescription: !!pc.remoteDescription,
            hasLocalDescription: !!pc.localDescription,
            videoSrcObject: !!bidderVideoRef.current?.srcObject
          });
        }
      }, 5000);
      
      return () => {
        clearInterval(debugInterval);
        cleanupWebRTC();
      };
    }
  }, [isBidder, auctionId]);

  // Set up WebRTC signaling for admin when stream starts
  useEffect(() => {
    if (isStaffOrAdmin && !isBidder && isStreaming && streamRef.current) {
      // Small delay to ensure stream is fully ready
      const timer = setTimeout(() => {
        setupAdminWebRTC();
      }, 500);
      
      return () => {
        clearTimeout(timer);
        cleanupWebRTC();
      };
    } else if (isStaffOrAdmin && !isBidder && !isStreaming) {
      cleanupWebRTC();
    }
  }, [isStaffOrAdmin, isBidder, isStreaming, auctionId]);

  // Ref to track the stream-available announcement interval
  const streamAnnounceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setupAdminWebRTC = async () => {
    if (!streamRef.current) return;

    try {
      console.log('[WebRTC Admin] Setting up WebRTC broadcasting');
      
      // Set up signaling channel first
      setupSignalingChannel('admin');
      
      // Wait for channel to be ready, then announce stream availability
      setTimeout(() => {
        announceStreamAvailable();
      }, 1500);

    } catch (error) {
      console.error('[WebRTC Admin] Error setting up:', error);
    }
  };

  // Announce that the stream is available — bidders will request an offer
  const announceStreamAvailable = () => {
    console.log('[WebRTC Admin] Announcing stream available');
    sendSignalingMessage('stream-available', { streamerId: user?.id });
    
    // Re-announce periodically so late-joining bidders can discover the stream
    if (streamAnnounceIntervalRef.current) {
      clearInterval(streamAnnounceIntervalRef.current);
    }
    streamAnnounceIntervalRef.current = setInterval(() => {
      // Use ref (not state) to avoid stale closure
      if (streamRef.current) {
        console.log('[WebRTC Admin] Re-announcing stream available');
        sendSignalingMessage('stream-available', { streamerId: user?.id });
      } else {
        if (streamAnnounceIntervalRef.current) {
          clearInterval(streamAnnounceIntervalRef.current);
          streamAnnounceIntervalRef.current = null;
        }
      }
    }, 5000); // Re-announce every 5 seconds
  };

  // Create a dedicated peer connection for a specific bidder and send them an offer
  const createOfferForBidder = async (bidderId: string) => {
    if (!streamRef.current) {
      console.warn('[WebRTC Admin] No stream available for offer creation');
      return;
    }

    // Close existing connection for this bidder if any
    const existingPc = peerConnectionsRef.current.get(bidderId);
    if (existingPc) {
      console.log(`[WebRTC Admin] Closing existing connection for ${bidderId}`);
      existingPc.close();
      peerConnectionsRef.current.delete(bidderId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS_CONFIG);
    peerConnectionsRef.current.set(bidderId, pc);

    // Add local stream tracks
    streamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, streamRef.current!);
      console.log(`[WebRTC Admin] Added ${track.kind} track for bidder ${bidderId}`);
    });

    // Handle ICE candidates — tag with bidderId so only the right bidder processes them
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC Admin] Sending ICE candidate for ${bidderId}`);
        sendSignalingMessage('ice-candidate', { ...event.candidate.toJSON(), targetBidderId: bidderId });
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC Admin] Connection state for ${bidderId}:`, pc.connectionState);
      const hasConnected = Array.from(peerConnectionsRef.current.values())
        .some(conn => conn.connectionState === 'connected');
      setWebrtcConnected(hasConnected);
      
      if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        peerConnectionsRef.current.delete(bidderId);
      }
    };

    try {
      // Create and send offer targeted at this specific bidder
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      sendSignalingMessage('offer', { ...offer, targetBidderId: bidderId });
      console.log(`[WebRTC Admin] Sent offer to bidder ${bidderId}`);
    } catch (error) {
      console.error(`[WebRTC Admin] Error creating offer for ${bidderId}:`, error);
    }
  };

  const setupBidderWebRTC = async () => {
    try {
      console.log('[WebRTC Bidder] Setting up to receive stream');
      
      // Set up signaling channel to listen for stream announcements and offers
      setupSignalingChannel('bidder');
      
      // After subscribing, request the stream (in case admin is already streaming)
      setTimeout(() => {
        console.log('[WebRTC Bidder] Sending initial request-offer');
        sendSignalingMessage('request-offer', { bidderId: user?.id });
      }, 2000);

    } catch (error) {
      console.error('[WebRTC Bidder] Error setting up:', error);
    }
  };

  const createBidderPeerConnection = async () => {
    // Close existing connection if any
    if (peerConnectionRef.current) {
      console.log('[WebRTC Bidder] Closing existing connection');
      peerConnectionRef.current.close();
    }
    
    // Create peer connection with TURN servers for cross-network support
    const pc = new RTCPeerConnection(ICE_SERVERS_CONFIG);
    peerConnectionRef.current = pc;
    
    console.log('[WebRTC Bidder] Created new peer connection with TURN servers');

    // Handle incoming stream
    pc.ontrack = (event) => {
      console.log('[WebRTC Bidder] ontrack event fired!', {
        streams: event.streams.length,
        trackKind: event.track.kind,
        trackId: event.track.id,
        trackReadyState: event.track.readyState
      });
      
      if (event.streams && event.streams.length > 0) {
        const stream = event.streams[0];
        console.log('[WebRTC Bidder] Stream has', stream.getTracks().length, 'tracks');
        stream.getTracks().forEach(track => {
          console.log('[WebRTC Bidder] Track:', track.kind, track.id, track.readyState);
        });
        
        if (bidderVideoRef.current) {
          console.log('[WebRTC Bidder] Assigning stream to video element');
          bidderVideoRef.current.srcObject = stream;
          bidderVideoRef.current.muted = true; // Must be muted for autoplay on mobile
          bidderVideoRef.current.playsInline = true;
          setIsStreamActive(true);
          setWebrtcConnected(true);
          
          // Try to play the video — if blocked on mobile, show tap-to-play
          const playPromise = bidderVideoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log('[WebRTC Bidder] Video play() succeeded (muted for autoplay)');
              setNeedsTapToPlay(false);
              // Try to unmute — this may fail without user gesture on some browsers
              if (bidderVideoRef.current) {
                bidderVideoRef.current.muted = false;
                setIsMuted(false);
                console.log('[WebRTC Bidder] Unmuted after autoplay');
              }
            }).catch(err => {
              console.warn('[WebRTC Bidder] Auto-play blocked on mobile:', err);
              setNeedsTapToPlay(true);
            });
          }
        } else {
          console.warn('[WebRTC Bidder] Video ref is null!');
        }
      } else {
        console.warn('[WebRTC Bidder] No streams in event, trying event.track');
        // Fallback: try to get stream from track
        if (event.track && bidderVideoRef.current) {
          const stream = new MediaStream([event.track]);
          bidderVideoRef.current.srcObject = stream;
          setIsStreamActive(true);
          setWebrtcConnected(true);
          console.log('[WebRTC Bidder] Created stream from track');
        }
      }
    };

    // Handle ICE candidates — tag with bidderId so admin routes to correct connection
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC Bidder] Sending ICE candidate');
        sendSignalingMessage('ice-candidate', { ...event.candidate.toJSON(), bidderId: user?.id });
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC Bidder] Connection state changed:', {
        state: pc.connectionState,
        signalingState: pc.signalingState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState
      });
      
      setWebrtcConnected(pc.connectionState === 'connected');
      
      if (pc.connectionState === 'connected') {
        console.log('[WebRTC Bidder] Connection established!');
        setIsStreamActive(true);
      } else if (pc.connectionState === 'failed') {
        console.error('[WebRTC Bidder] Connection failed!');
        setIsStreamActive(false);
        // Try to reconnect
        setTimeout(() => {
          if (signalingChannelRef.current) {
            console.log('[WebRTC Bidder] Attempting to reconnect...');
            setupBidderWebRTC();
          }
        }, 3000);
      } else if (pc.connectionState === 'disconnected') {
        console.warn('[WebRTC Bidder] Connection disconnected');
        setIsStreamActive(false);
      }
    };
    
    // Also monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC Bidder] ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('[WebRTC Bidder] ICE connection established!');
      } else if (pc.iceConnectionState === 'failed') {
        console.error('[WebRTC Bidder] ICE connection failed!');
      }
    };

    return pc;
  };

  const setupSignalingChannel = (role: 'admin' | 'bidder') => {
    // Clean up existing channel first
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
    }

    const channelName = `webrtc-signaling-${auctionId}`;
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false } // Don't receive own messages
        }
      })
      .on('broadcast', { event: 'webrtc-signal' }, (payload) => {
        console.log(`[WebRTC ${role}] Received signal:`, payload.payload.type);
        handleSignalingMessage(payload.payload, role);
      })
      .subscribe((status) => {
        console.log(`[WebRTC ${role}] Channel subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`[WebRTC ${role}] Successfully subscribed to channel`);
        }
      });

    signalingChannelRef.current = channel;
    console.log(`[WebRTC ${role}] Signaling channel set up:`, channelName);
  };

  const sendSignalingMessage = (type: string, data: any) => {
    if (!signalingChannelRef.current) {
      console.warn('[WebRTC] Signaling channel not ready');
      return;
    }

    try {
      // For ICE candidates, ensure we're sending the JSON representation
      let serializedData = data;
      if (type === 'ice-candidate' && data && typeof data === 'object') {
        // If it's already a toJSON() result, use it; otherwise convert
        if (data.candidate && typeof data.candidate === 'string') {
          serializedData = data; // Already in correct format
        } else {
          // Try to get JSON representation
          serializedData = JSON.parse(JSON.stringify(data));
        }
      } else {
        serializedData = JSON.parse(JSON.stringify(data)); // Ensure serializable
      }
      
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: {
          type,
          data: serializedData,
          from: user?.id,
          auctionId
        }
      });
      console.log(`[WebRTC] Sent ${type} message`, type === 'ice-candidate' ? { candidate: serializedData.candidate?.substring(0, 50) } : '');
    } catch (error) {
      console.error('[WebRTC] Error sending signal:', error);
    }
  };

  const handleSignalingMessage = async (message: any, role: 'admin' | 'bidder') => {
    if (message.auctionId !== auctionId) return;
    if (message.from === user?.id) return; // Ignore own messages

    try {
      // ── ADMIN: bidder is requesting an offer ──
      if (role === 'admin' && message.type === 'request-offer') {
        const bidderId = message.data?.bidderId || message.from;
        console.log(`[WebRTC Admin] Bidder ${bidderId} requested an offer`);
        await createOfferForBidder(bidderId);
        return;
      }

      // ── BIDDER: admin announces stream is available ──
      if (role === 'bidder' && message.type === 'stream-available') {
        console.log('[WebRTC Bidder] Stream is available, requesting offer');
        // Only request if we don't already have an active connection
        if (!peerConnectionRef.current || 
            peerConnectionRef.current.connectionState === 'failed' ||
            peerConnectionRef.current.connectionState === 'closed' ||
            peerConnectionRef.current.connectionState === 'disconnected') {
          sendSignalingMessage('request-offer', { bidderId: user?.id });
        }
        return;
      }

      // ── BIDDER: received an offer from admin ──
      if (role === 'bidder' && message.type === 'offer') {
        // Only process offers targeted at this bidder (or broadcast offers)
        const targetBidderId = message.data?.targetBidderId;
        if (targetBidderId && targetBidderId !== user?.id) {
          return; // This offer is for a different bidder
        }

        console.log('[WebRTC Bidder] Received offer targeted at us');

        // Always create a fresh connection for a new offer
        await createBidderPeerConnection();
        const pc = peerConnectionRef.current;
        if (!pc) {
          console.error('[WebRTC Bidder] Failed to create peer connection');
          return;
        }

        try {
          // Extract SDP from data (strip our custom fields)
          const { targetBidderId: _, ...sdpData } = message.data || {};
          await pc.setRemoteDescription(new RTCSessionDescription(sdpData));
          console.log('[WebRTC Bidder] Remote description set');

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log('[WebRTC Bidder] Answer created, sending to admin');
          
          sendSignalingMessage('answer', { ...answer, bidderId: user?.id });
        } catch (error) {
          console.error('[WebRTC Bidder] Error handling offer:', error);
        }
        return;
      }

      // ── ADMIN: received an answer from a bidder ──
      if (role === 'admin' && message.type === 'answer') {
        const bidderId = message.data?.bidderId || message.from || 'unknown';
        const pc = peerConnectionsRef.current.get(bidderId);

        if (!pc) {
          console.error(`[WebRTC Admin] Received answer from ${bidderId} but no connection exists`);
          return;
        }

        try {
          if (pc.signalingState === 'have-local-offer') {
            // Extract SDP from data (strip our custom fields)
            const { bidderId: _, ...sdpData } = message.data || {};
            await pc.setRemoteDescription(new RTCSessionDescription(sdpData));
            console.log(`[WebRTC Admin] Answer set for ${bidderId}, state: ${pc.signalingState}`);
          } else {
            console.warn(`[WebRTC Admin] Unexpected signaling state for ${bidderId}: ${pc.signalingState}`);
          }
        } catch (error) {
          console.error(`[WebRTC Admin] Error setting answer for ${bidderId}:`, error);
        }
        return;
      }

      // ── ICE candidates (both roles) ──
      if (message.type === 'ice-candidate') {
        let targetPc: RTCPeerConnection | null = null;

        if (role === 'bidder') {
          // Only accept ICE candidates targeted at us
          const targetBidderId = message.data?.targetBidderId;
          if (targetBidderId && targetBidderId !== user?.id) return;
          targetPc = peerConnectionRef.current;
        } else if (role === 'admin') {
          const bidderId = message.data?.bidderId || message.from;
          targetPc = peerConnectionsRef.current.get(bidderId) || null;
        }

        if (!targetPc) {
          console.warn('[WebRTC] No peer connection for ICE candidate');
          return;
        }

        // Clean metadata fields from candidate data
        let candidateData = { ...message.data };
        delete candidateData.targetBidderId;
        delete candidateData.bidderId;

        if (candidateData?.candidate && typeof candidateData.candidate === 'string') {
          try {
            const candidateInit: RTCIceCandidateInit = {
              candidate: candidateData.candidate,
              sdpMLineIndex: candidateData.sdpMLineIndex ?? 0,
              sdpMid: candidateData.sdpMid ?? null,
              usernameFragment: candidateData.usernameFragment ?? undefined,
            };
            await targetPc.addIceCandidate(new RTCIceCandidate(candidateInit));
            console.log(`[WebRTC ${role}] Added ICE candidate`);
          } catch (error) {
            console.error(`[WebRTC ${role}] Error adding ICE candidate:`, error);
          }
        }
        return;
      }
    } catch (error) {
      console.error(`[WebRTC ${role}] Error handling signal:`, error);
    }
  };

  const cleanupWebRTC = () => {
    // Stop stream announcements
    if (streamAnnounceIntervalRef.current) {
      clearInterval(streamAnnounceIntervalRef.current);
      streamAnnounceIntervalRef.current = null;
    }

    // Close all peer connections
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    peerConnectionsRef.current.forEach((pc, bidderId) => {
      console.log(`[WebRTC] Closing connection for bidder: ${bidderId}`);
      pc.close();
    });
    peerConnectionsRef.current.clear();
    
    // Stop media recorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    // Remove signaling channel
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }
    
    setWebrtcConnected(false);
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsLoadingCamera(true);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsLoadingCamera(false);
        throw new Error('getUserMedia is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.');
      }

      // Check if we're on HTTPS (required for camera access in most browsers)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        setIsLoadingCamera(false);
        throw new Error('Camera access requires HTTPS. Please access the site via HTTPS.');
      }

      // Start with the simplest constraints possible to avoid OverconstrainedError
      let stream: MediaStream | null = null;
      
      // Try progressively simpler constraints - start with the simplest first
      const constraintAttempts = [
        // Attempt 1: Simplest possible (most compatible)
        { video: true, audio: true },
        // Attempt 2: Just video, no audio
        { video: true, audio: false },
        // Attempt 3: Basic facingMode (if supported)
        { video: { facingMode: 'user' }, audio: true },
        // Attempt 4: FacingMode with ideal (fallback)
        { video: { facingMode: { ideal: 'user' } }, audio: true },
      ];

      let lastError: any = null;
      
      for (let i = 0; i < constraintAttempts.length; i++) {
        const constraints = constraintAttempts[i];
        try {
          console.log(`[Camera] Attempt ${i + 1}/${constraintAttempts.length} with constraints:`, constraints);
          
          // Add timeout to prevent hanging
          const getUserMediaPromise = navigator.mediaDevices.getUserMedia(constraints);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Camera access timeout')), 5000);
          });
          
          stream = await Promise.race([getUserMediaPromise, timeoutPromise]);
          console.log('[Camera] Access successful!');
          break; // Success, exit loop
        } catch (error: any) {
          console.warn(`[Camera] Attempt ${i + 1} failed:`, error.name, error.message);
          lastError = error;
          
          // If it's not an OverconstrainedError, don't try other constraints
          if (error.name !== 'OverconstrainedError' && 
              error.name !== 'ConstraintNotSatisfiedError' &&
              error.message !== 'Camera access timeout') {
            setIsLoadingCamera(false);
            throw error; // Re-throw non-constraint errors immediately
          }
          // Continue to next constraint attempt
        }
      }

      if (!stream) {
        setIsLoadingCamera(false);
        throw lastError || new Error('Could not access camera with any available constraints.');
      }

      streamRef.current = stream;
      
      // Wait a tiny bit to ensure video element is rendered (React needs a moment)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try to get video element, with retries
      let videoElement = videoRef.current;
      let retries = 0;
      while (!videoElement && retries < 5) {
        console.log(`[Camera] Video ref not ready, retry ${retries + 1}/5`);
        await new Promise(resolve => setTimeout(resolve, 100));
        videoElement = videoRef.current;
        retries++;
      }
      
      if (!videoElement) {
        console.error('[Camera] Video ref is still null after retries!');
        setIsLoadingCamera(false);
        setCameraError('Video element not found. Please refresh the page.');
        return;
      }

      console.log('[Camera] Video element found, setting stream');
      
      // Set video properties BEFORE setting srcObject
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = true;
      
      // Set the stream
      videoElement.srcObject = stream;
      
      // Update state immediately - don't wait for events
      setIsStreaming(true);
      setIsLoadingCamera(false);
      console.log('[Camera] Stream assigned and state updated');
      
      // Update stream status in database to notify bidders
      try {
        const { error: updateError } = await supabase
          .from('auction_streams')
          .update({ 
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('auction_id', auctionId);

        if (updateError) {
          console.warn('[Camera] Failed to update stream status:', updateError);
        } else {
          console.log('[Camera] Stream status updated in database - bidders will see stream is active');
        }
      } catch (dbError) {
        console.warn('[Camera] Error updating stream status:', dbError);
      }
      
      // Try to play immediately
      videoElement.play().then(() => {
        console.log('[Camera] Video play() succeeded');
      }).catch((playError) => {
        console.warn('[Camera] Video play() error (non-fatal):', playError);
      });

      // Set up event listeners for debugging (but don't block on them)
      const onLoaded = () => {
        console.log('[Camera] Video metadata/loaded event fired');
        videoElement.play().catch(err => console.warn('[Camera] Play error:', err));
      };

      videoElement.addEventListener('loadedmetadata', onLoaded, { once: true });
      videoElement.addEventListener('canplay', onLoaded, { once: true });
      videoElement.addEventListener('loadeddata', () => {
        console.log('[Camera] Video data loaded');
      }, { once: true });
      
      // Check if already ready
      if (videoElement.readyState >= 2) {
        console.log('[Camera] Video already ready, state:', videoElement.readyState);
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setIsLoadingCamera(false);
      setIsStreaming(false);
      
      let errorMessage = 'Failed to access camera. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and refresh the page.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found. Please connect a camera device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'Camera does not support the requested settings. Please try a different camera or check your camera settings.';
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage += 'Please check your camera permissions and try again.';
      }
      
      setCameraError(errorMessage);
      toast({
        title: 'Camera Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  // Release camera and WebRTC without ending the auction
  // This is safe to call on unmount/refresh — the auction stays LIVE
  const releaseCamera = () => {
    cleanupWebRTC();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  // Stop camera stream only (auction stays live, admin can restart stream)
  const stopCamera = () => {
    releaseCamera();
    toast({
      title: 'Stream Paused',
      description: 'Camera stopped. The auction is still live — click "Start Stream" to resume.',
    });
  };

  // End the auction entirely — sets status to completed (admin must explicitly choose this)
  const endAuction = async () => {
    try {
      releaseCamera();
      const nowIso = new Date().toISOString();

      // Finalize remaining lots so winning bidders are reflected in My Bids.
      // OPEN/PENDING lots with a highest bidder become SOLD; otherwise SKIPPED.
      const { data: lotsToFinalize, error: lotsFetchError } = await supabase
        .from('auction_lots')
        .select('id, current_bidder_id')
        .eq('auction_id', auctionId)
        .in('status', ['OPEN', 'PENDING']);

      if (lotsFetchError) {
        console.warn('[Auction] Failed to fetch lots for finalization:', lotsFetchError);
      } else if (lotsToFinalize && lotsToFinalize.length > 0) {
        const soldLotIds = lotsToFinalize.filter((lot) => !!lot.current_bidder_id).map((lot) => lot.id);
        const skippedLotIds = lotsToFinalize.filter((lot) => !lot.current_bidder_id).map((lot) => lot.id);

        if (soldLotIds.length > 0) {
          const { error: soldUpdateError } = await supabase
            .from('auction_lots')
            .update({ status: 'SOLD', updated_at: nowIso })
            .in('id', soldLotIds);

          if (soldUpdateError) {
            console.warn('[Auction] Failed to mark sold lots:', soldUpdateError);
          }
        }

        if (skippedLotIds.length > 0) {
          const { error: skippedUpdateError } = await supabase
            .from('auction_lots')
            .update({ status: 'SKIPPED', updated_at: nowIso })
            .in('id', skippedLotIds);

          if (skippedUpdateError) {
            console.warn('[Auction] Failed to mark skipped lots:', skippedUpdateError);
          }
        }
      }

      // Update auction status to completed
      const { error: auctionError } = await supabase
        .from('auction_events')
        .update({ 
          status: 'completed',
          updated_at: nowIso
        })
        .eq('id', auctionId);

      if (auctionError) {
        console.error('[Auction] Failed to update auction status:', auctionError);
        toast({
          title: 'Error',
          description: 'Failed to end auction',
          variant: 'destructive',
        });
        return;
      }
      
      // Update stream status in database
      const { error: updateError } = await supabase
        .from('auction_streams')
        .update({ 
          is_active: false,
          updated_at: nowIso
        })
        .eq('auction_id', auctionId);

      if (updateError) {
        console.warn('[Auction] Failed to update stream status:', updateError);
      }

      toast({
        title: 'Auction Ended',
        description: 'The auction has been ended and marked as completed.',
      });
    } catch (dbError) {
      console.error('[Auction] Error ending auction:', dbError);
      toast({
        title: 'Error',
        description: 'Failed to end auction',
        variant: 'destructive',
      });
    }
  };

  const fetchInventoryItems = async () => {
    setIsLoadingInventory(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('status', 'pending_auction')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInventoryItems(data as unknown as InventoryItem[]);
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inventory items',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const convertInventoryToLot = async (inventoryItem: InventoryItem) => {
    try {
      // Get the next lot number
      const { data: existingLots } = await supabase
        .from('auction_lots')
        .select('lot_number')
        .eq('auction_id', auctionId)
        .order('lot_number', { ascending: false })
        .limit(1);

      const nextLotNumber = existingLots && existingLots.length > 0 
        ? existingLots[0].lot_number + 1 
        : 1;

      // Create auction lot from inventory item
      const { data: newLot, error: lotError } = await supabase
        .from('auction_lots')
        .insert({
          auction_id: auctionId,
          lot_number: nextLotNumber,
          title: inventoryItem.name || `Item ${inventoryItem.id}`,
          description: `Category: ${inventoryItem.category_name || 'N/A'}, Condition: ${inventoryItem.condition}`,
          starting_price: inventoryItem.starting_bid_price,
          current_price: inventoryItem.starting_bid_price,
          status: 'OPEN',
        })
        .select()
        .single();

      if (lotError) throw lotError;

      // Update inventory item status
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ status: 'pending_auction' }) // Keep as pending_auction until sold
        .eq('id', inventoryItem.id);

      if (updateError) {
        console.warn('Failed to update inventory status:', updateError);
      }

      toast({
        title: 'Success',
        description: `Item "${inventoryItem.name || inventoryItem.id}" added as Lot #${nextLotNumber}`,
      });

      // Refresh inventory list
      fetchInventoryItems();
    } catch (error: any) {
      console.error('Error converting inventory to lot:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item to auction',
        variant: 'destructive',
      });
    }
  };

  // Remove a lot from the auction (admin only)
  const removeLotFromAuction = async (lotId: string, lotTitle: string) => {
    try {
      const { error } = await supabase
        .from('auction_lots')
        .delete()
        .eq('id', lotId);

      if (error) throw error;

      // If the removed lot was the current lot, deselect it
      if (currentLot?.id === lotId) {
        setCurrentLot(null);
      }

      toast({
        title: 'Lot Removed',
        description: `"${lotTitle}" has been removed from the auction.`,
      });
    } catch (error: any) {
      console.error('Error removing lot:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove lot',
        variant: 'destructive',
      });
    }
  };

  const handleBidSuccess = (response: BidResponse) => {
    console.log('Bid placed successfully:', response);
    // The realtime subscription will handle updating the UI
  };

  // Quick bid: add increment to the running total
  const addQuickBid = (increment: number) => {
    setQuickBidAmount(prev => prev + increment);
  };

  // Submit the quick bid
  const submitQuickBid = async (amount: number) => {
    if (!currentLot || amount <= 0) return;
    if (currentLot.status !== 'OPEN') {
      toast({ title: "Lot Closed", description: "This lot is no longer accepting bids.", variant: "destructive" });
      return;
    }

    setIsSubmittingBid(true);
    try {
      const { data, error } = await supabase.rpc('place_bid' as any, {
        p_lot_id: currentLot.id,
        p_amount: amount,
      });

      if (error) {
        toast({ title: "Bid Failed", description: error.message || "Failed to place bid", variant: "destructive" });
        return;
      }

      const response = data as unknown as BidResponse;
      if (!response.success) {
        toast({
          title: response.action === 'pay_entry_fee' ? "Entrance Fee Required" : "Bid Rejected",
          description: response.error || "Your bid was not accepted",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Bid Placed!", description: `Your bid of ₱${amount.toLocaleString()} has been placed!` });
      setQuickBidAmount(0);
      setManualBidInput('');
      handleBidSuccess(response);
    } catch {
      toast({ title: "Network Error", description: "Failed to place bid. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmittingBid(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-green-500';
      case 'PENDING': return 'bg-yellow-500';
      case 'SOLD': return 'bg-blue-500';
      case 'SKIPPED': return 'bg-gray-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCurrentBids = (lotId: string) => {
    return bids
      .filter(bid => bid.lot_id === lotId && bid.status === 'accepted')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const setLotPaymentStatus = async (lot: AuctionLot, status: MockSettlementStatus) => {
    try {
      const updated = await updateMockSettlementStatus(lot.id, status, user?.id);
      if (!updated) return;
      await refreshSettlementMap();
      toast({
        title: 'Payment status updated',
        description: `Lot #${lot.lot_number} is now ${status}.`,
      });
    } catch (error) {
      console.error('[Auction] Failed to update lot settlement status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment status.',
        variant: 'destructive',
      });
    }
  };

  const visibleLots = lots.filter((lot) => {
    if (!hidePaidLots) return true;
    const settlement = settlementByLotId[lot.id];
    return !(lot.status === 'SOLD' && settlement?.status === 'paid');
  });

  if (isCheckingAccess) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{auctionTitle}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="flex items-center gap-1">
              <Gavel className="h-4 w-4" />
              {lots.length} lots
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Live auction
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Lot & Video */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Section */}
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center text-white relative overflow-hidden">
                {isBidder ? (
                  // Bidder View - Display Live Stream via WebRTC
                  <>
                    {/* Always render video element for WebRTC stream */}
                    <video
                      ref={bidderVideoRef}
                      autoPlay
                      playsInline
                      muted={isMuted}
                      webkit-playsinline="true"
                      className="w-full h-full object-cover"
                      onLoadedMetadata={() => {
                        console.log('[WebRTC Bidder] Video metadata loaded');
                        if (bidderVideoRef.current) {
                          // Must be muted for autoplay to work on mobile
                          bidderVideoRef.current.muted = true;
                          setIsMuted(true);
                          const playPromise = bidderVideoRef.current.play();
                          if (playPromise !== undefined) {
                            playPromise.then(() => {
                              console.log('[WebRTC Bidder] Auto-play succeeded (muted)');
                              setNeedsTapToPlay(false);
                            }).catch(err => {
                              console.warn('[WebRTC Bidder] Auto-play blocked, showing tap-to-play:', err);
                              setNeedsTapToPlay(true);
                            });
                          }
                        }
                      }}
                      onCanPlay={() => {
                        console.log('[WebRTC Bidder] Video can play');
                        setIsStreamActive(true);
                      }}
                      onPlaying={() => {
                        console.log('[WebRTC Bidder] Video is playing');
                        setNeedsTapToPlay(false);
                        setIsStreamActive(true);
                      }}
                      onError={(e) => {
                        console.error('[WebRTC Bidder] Video error:', e);
                      }}
                    />
                    
                    {/* Tap-to-play overlay for mobile browsers that block autoplay */}
                    {needsTapToPlay && isStreamActive && (
                      <div 
                        className="absolute inset-0 flex items-center justify-center text-white bg-black/70 cursor-pointer z-10"
                        onClick={() => {
                          if (bidderVideoRef.current) {
                            // Start muted to ensure play works, then immediately unmute (user gesture allows it)
                            bidderVideoRef.current.muted = true;
                            bidderVideoRef.current.play().then(() => {
                              setNeedsTapToPlay(false);
                              // Unmute after play succeeds — user gesture context allows this
                              if (bidderVideoRef.current) {
                                bidderVideoRef.current.muted = false;
                                setIsMuted(false);
                              }
                              console.log('[WebRTC Bidder] Manual play succeeded with audio');
                            }).catch(err => {
                              console.error('[WebRTC Bidder] Manual play failed:', err);
                            });
                          }
                        }}
                      >
                        <div className="text-center">
                          <Play className="h-16 w-16 mx-auto mb-3 opacity-90" />
                          <p className="text-lg font-medium">Tap to Play</p>
                          <p className="text-sm opacity-75">Stream is ready</p>
                        </div>
                      </div>
                    )}
                    
                    {isStreamActive && bidderVideoRef.current?.srcObject ? (
                      <>
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-red-600 text-white border-0 px-3 py-1 text-sm font-semibold animate-pulse">
                            ● LIVE
                          </Badge>
                        </div>
                        {/* Audio mute/unmute toggle */}
                        <button
                          className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-colors z-10"
                          onClick={() => {
                            if (bidderVideoRef.current) {
                              const newMuted = !bidderVideoRef.current.muted;
                              bidderVideoRef.current.muted = newMuted;
                              setIsMuted(newMuted);
                              console.log(`[WebRTC Bidder] Audio ${newMuted ? 'muted' : 'unmuted'}`);
                            }
                          }}
                          title={isMuted ? 'Unmute audio' : 'Mute audio'}
                        >
                          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                        </button>
                      </>
                    ) : webrtcConnected ? (
                      <div className="absolute inset-0 flex items-center justify-center text-white bg-black/50">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                          <p className="text-sm opacity-75">Connecting to stream...</p>
                          <p className="text-xs opacity-50 mt-2">Establishing connection...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white bg-black/50">
                        <div className="text-center">
                          <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm opacity-75">Waiting for Stream</p>
                          <p className="text-xs opacity-50">The auctioneer will start streaming soon</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Company Account View - Host/Auctioneer Controls with Camera
                  <>
                    {/* Always render video element so ref is available */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
                    />
                    
                    {/* Overlay messages when not streaming or error */}
                    {cameraError ? (
                      <div className="absolute inset-0 flex items-center justify-center text-center p-8 text-white bg-black/50">
                        <div>
                          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-75" />
                          <p className="text-sm opacity-90 mb-2 font-medium">Camera Error</p>
                          <p className="text-xs opacity-75 mb-4 px-4">{cameraError}</p>
                          <div className="flex flex-col gap-2 items-center">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                              onClick={startCamera}
                              disabled={isLoadingCamera}
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              {isLoadingCamera ? 'Retrying...' : 'Retry Camera'}
                            </Button>
                            <p className="text-xs opacity-60 mt-2">
                              Tip: Check browser permissions and ensure no other app is using the camera
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : isLoadingCamera ? (
                      <div className="absolute inset-0 flex items-center justify-center text-center text-white bg-black/50">
                        <div>
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                          <p className="text-sm opacity-75">Starting camera...</p>
                          <p className="text-xs opacity-50 mt-2">Please allow camera access if prompted</p>
                        </div>
                      </div>
                    ) : !isStreaming ? (
                      <div className="absolute inset-0 flex items-center justify-center text-center text-white bg-black/50">
                        <div>
                          <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm opacity-75">Camera Ready</p>
                          <p className="text-xs opacity-50 mt-2">Click "Start Stream" to begin</p>
                        </div>
                      </div>
                    ) : null}
                    
                    {/* Host Controls Overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                            <span className="text-sm font-medium">{isStreaming ? 'LIVE' : 'OFFLINE'}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!isStreaming && !isLoadingCamera && (
                            <Button 
                              size="sm" 
                              className="bg-primary hover:bg-primary/90 text-white"
                              onClick={startCamera}
                              disabled={isLoadingCamera}
                            >
                              <Camera className="h-4 w-4 mr-1" />
                              {isLoadingCamera ? 'Starting...' : 'Start Stream'}
                            </Button>
                          )}
                          {isLoadingCamera && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="bg-white/10 border-white/20 text-white"
                              disabled
                            >
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                              Starting...
                            </Button>
                          )}
                          {isStreaming && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                                onClick={stopCamera}
                              >
                                <VideoOff className="h-4 w-4 mr-1" />
                                Pause Stream
                              </Button>
                              {currentLot && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                                  onClick={() => {
                                    // Open next lot logic
                                    const currentIndex = lots.findIndex(l => l.id === currentLot.id);
                                    const nextLot = lots[currentIndex + 1] || lots[0];
                                    if (nextLot) setCurrentLot(nextLot);
                                  }}
                                >
                                  <SkipForward className="h-4 w-4 mr-1" />
                                  Next Lot
                                </Button>
                              )}
                            </>
                          )}
                          <div className="flex-1"></div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-red-600/80 border-red-500 text-white hover:bg-red-700"
                            onClick={() => {
                              if (confirm('Are you sure you want to end this auction? This will mark it as completed and stop the stream for all bidders.')) {
                                endAuction();
                              }
                            }}
                          >
                            <Square className="h-4 w-4 mr-1" />
                            End Auction
                          </Button>
                          <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Bid Panel — always shown to bidders below the video */}
          {isBidder && (
            <Card>
              <CardContent className="p-3 sm:p-4 space-y-3">
                {/* Current price display */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {currentLot ? `Lot #${currentLot.lot_number}: ${currentLot.title}` : 'Place Your Bid'}
                  </span>
                  <span className="text-lg sm:text-xl font-bold">
                    {currentLot ? `₱${currentLot.current_price.toLocaleString()}` : '—'}
                  </span>
                </div>

                {/* Increment buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[50, 100, 250, 500].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm font-semibold"
                      onClick={() => addQuickBid(amount)}
                      disabled={isSubmittingBid || !currentLot || currentLot.status !== 'OPEN'}
                    >
                      +₱{amount}
                    </Button>
                  ))}
                </div>

                {/* Running total & submit */}
                {quickBidAmount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-md px-3 py-2 text-center">
                      <span className="text-xs text-muted-foreground block">Your Bid</span>
                      <span className="text-lg font-bold">₱{quickBidAmount.toLocaleString()}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground"
                      onClick={() => setQuickBidAmount(0)}
                      disabled={isSubmittingBid}
                    >
                      Clear
                    </Button>
                    <Button
                      className="px-6"
                      onClick={() => submitQuickBid(quickBidAmount)}
                      disabled={isSubmittingBid || quickBidAmount <= 0}
                    >
                      <Gavel className="h-4 w-4 mr-1" />
                      {isSubmittingBid ? 'Bidding...' : 'Bid'}
                    </Button>
                  </div>
                )}

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-2 text-muted-foreground">or enter amount</span>
                  </div>
                </div>

                {/* Manual input */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
                    <Input
                      type="number"
                      placeholder="Enter bid amount"
                      className="pl-7"
                      value={manualBidInput}
                      onChange={(e) => setManualBidInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const amt = parseInt(manualBidInput);
                          if (amt > 0) submitQuickBid(amt);
                        }
                      }}
                      disabled={isSubmittingBid || !currentLot || currentLot.status !== 'OPEN'}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const amt = parseInt(manualBidInput);
                      if (amt > 0) submitQuickBid(amt);
                    }}
                    disabled={isSubmittingBid || !manualBidInput || parseInt(manualBidInput) <= 0 || !currentLot || currentLot.status !== 'OPEN'}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Place Bid
                  </Button>
                </div>

                {/* Status message when no lot is open */}
                {(!currentLot || currentLot.status !== 'OPEN') && (
                  <p className="text-xs text-center text-muted-foreground">
                    {!currentLot ? 'Waiting for auctioneer to open a lot...' : `Lot is ${currentLot.status.toLowerCase()}`}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Lot Details */}
          {currentLot && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Lot #{currentLot.lot_number}: {currentLot.title}
                    <Badge className={getStatusColor(currentLot.status)}>
                      {currentLot.status}
                    </Badge>
                  </CardTitle>
                  <div className="text-right">
                    <div className="text-2xl font-bold">₱{currentLot.current_price.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      Starting: ₱{currentLot.starting_price.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardHeader>
              {currentLot.description && (
                <CardContent>
                  <p className="text-muted-foreground">{currentLot.description}</p>
                </CardContent>
              )}
            </Card>
          )}

          {/* Recent Bids */}
          {currentLot && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Bids</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getCurrentBids(currentLot.id).map((bid, index) => (
                    <div
                      key={bid.id}
                      className={`flex items-center justify-between p-2 rounded ${
                        index === 0 ? 'bg-green-50 border border-green-200' : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {index === 0 && <Badge variant="default">Highest</Badge>}
                        <span className="text-sm">
                          Bidder #{bid.bidder_id.slice(-6)}
                        </span>
                      </div>
                      <span className="font-semibold">₱{bid.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {getCurrentBids(currentLot.id).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No bids yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inventory Items Section - Only for Admin */}
          {isStaffOrAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Available Inventory Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingInventory ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading inventory...</p>
                  </div>
                ) : inventoryItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No inventory items available</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {inventoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{item.name || item.id}</h4>
                              <Badge variant="outline" className="text-xs">
                                {item.category_name || 'Uncategorized'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Condition: {item.condition.replace('_', ' ')}</p>
                              <p>Starting Bid: ₱{item.starting_bid_price.toLocaleString()}</p>
                              {item.photo_url && (
                                <img 
                                  src={item.photo_url} 
                                  alt={item.name || item.id}
                                  className="w-16 h-16 object-cover rounded mt-2"
                                />
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => convertInventoryToLot(item)}
                            className="shrink-0"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add to Auction
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bidding Panel */}
        <div className="space-y-4">
          {isBidder && currentLot && (
            <BidPanel
              lotId={currentLot.id}
              currentPrice={currentLot.current_price}
              isOpen={currentLot.status === 'OPEN'}
              hasAccess={hasAccess}
              onBidSuccess={handleBidSuccess}
            />
          )}

          {/* Lot List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>All Lots</CardTitle>
                {isStaffOrAdmin && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Pending Payment: {Object.values(settlementByLotId).filter((s) => s.status === 'pending').length}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setHidePaidLots((prev) => !prev)}
                    >
                      {hidePaidLots ? 'Show Paid Lots' : 'Hide Paid Lots'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {visibleLots.map((lot) => (
                  <div
                    key={lot.id}
                    className={`p-3 rounded border cursor-pointer hover:bg-muted/50 ${
                      currentLot?.id === lot.id ? 'bg-primary/5 border-primary' : ''
                    }`}
                    onClick={() => setCurrentLot(lot)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">#{lot.lot_number}</span>
                      <div className="flex items-center gap-1">
                        <Badge className={getStatusColor(lot.status)} variant="secondary">
                          {lot.status}
                        </Badge>
                        {lot.status === 'SOLD' && settlementByLotId[lot.id] && (
                          <Badge
                            variant={settlementByLotId[lot.id].status === 'paid' ? 'default' : 'outline'}
                            className={settlementByLotId[lot.id].status === 'paid' ? '' : 'border-yellow-300 text-yellow-700'}
                          >
                            {settlementByLotId[lot.id].status === 'paid' ? 'PAID' : 'PENDING PAYMENT'}
                          </Badge>
                        )}
                        {isStaffOrAdmin && (
                          <button
                            className="ml-1 p-1 rounded-full hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                            title="Remove lot"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Remove "${lot.title}" from the auction?`)) {
                                removeLotFromAuction(lot.id, lot.title);
                              }
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">{lot.title}</div>
                    <div className="text-sm font-semibold">₱{lot.current_price.toLocaleString()}</div>
                    {isStaffOrAdmin && lot.status === 'SOLD' && settlementByLotId[lot.id] && (
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={settlementByLotId[lot.id].status === 'pending' ? 'default' : 'outline'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLotPaymentStatus(lot, 'pending');
                          }}
                        >
                          Mark Pending
                        </Button>
                        <Button
                          size="sm"
                          variant={settlementByLotId[lot.id].status === 'paid' ? 'default' : 'outline'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLotPaymentStatus(lot, 'paid');
                          }}
                        >
                          Mark Paid
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {visibleLots.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No lots available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveAuctionInterface;
