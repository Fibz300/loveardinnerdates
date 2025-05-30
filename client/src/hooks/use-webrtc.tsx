import { useState, useEffect, useRef, useCallback } from 'react';
import { WebRTCManager, CallState, checkWebRTCSupport } from '@/lib/webrtc';

interface UseWebRTCOptions {
  userId: number;
  matchId?: number;
  onCallStateChange?: (state: CallState) => void;
  onError?: (error: string) => void;
}

interface UseWebRTCReturn {
  // State
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callState: CallState;
  isConnected: boolean;
  isCallActive: boolean;
  isSupported: boolean;
  error: string | null;
  
  // Actions
  startCall: () => Promise<void>;
  endCall: () => void;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  toggleVideo: () => boolean;
  toggleAudio: () => boolean;
  
  // Status
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export const useWebRTC = ({
  userId,
  matchId,
  onCallStateChange,
  onError
}: UseWebRTCOptions): UseWebRTCReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callState, setCallState] = useState<CallState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const isSupported = checkWebRTCSupport();

  // Initialize WebRTC manager
  useEffect(() => {
    if (!isSupported) {
      setError('WebRTC is not supported on this device');
      return;
    }

    webrtcManagerRef.current = new WebRTCManager(userId);
    
    // Set up event handlers
    webrtcManagerRef.current.onStateChange = (state: CallState) => {
      setCallState(state);
      onCallStateChange?.(state);
    };

    webrtcManagerRef.current.onLocalStream = (stream: MediaStream) => {
      setLocalStream(stream);
    };

    webrtcManagerRef.current.onRemoteStream = (stream: MediaStream) => {
      setRemoteStream(stream);
    };

    webrtcManagerRef.current.onError = (errorMessage: string) => {
      setError(errorMessage);
      onError?.(errorMessage);
    };

    // Initialize signaling
    webrtcManagerRef.current.initializeSignaling();

    return () => {
      webrtcManagerRef.current?.destroy();
    };
  }, [userId, isSupported, onCallStateChange, onError]);

  // Clear error when call state changes
  useEffect(() => {
    if (callState !== 'idle') {
      setError(null);
    }
  }, [callState]);

  // Start a call
  const startCall = useCallback(async () => {
    if (!webrtcManagerRef.current || !matchId) {
      setError('Cannot start call: missing match ID or WebRTC not initialized');
      return;
    }

    try {
      await webrtcManagerRef.current.startCall(matchId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start call';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [matchId, onError]);

  // End the call
  const endCall = useCallback(() => {
    if (!webrtcManagerRef.current) return;
    
    webrtcManagerRef.current.endCall();
    setLocalStream(null);
    setRemoteStream(null);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
  }, []);

  // Accept an incoming call
  const acceptCall = useCallback(async () => {
    if (!webrtcManagerRef.current) {
      setError('Cannot accept call: WebRTC not initialized');
      return;
    }

    try {
      // This would typically be called with call data from signaling
      // For now, we'll assume the call data is handled internally
      // In a real implementation, you'd pass the offer data here
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept call';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onError]);

  // Reject an incoming call
  const rejectCall = useCallback(() => {
    if (!webrtcManagerRef.current) return;
    
    webrtcManagerRef.current.rejectCall();
  }, []);

  // Toggle video
  const toggleVideo = useCallback((): boolean => {
    if (!webrtcManagerRef.current) return false;
    
    const enabled = webrtcManagerRef.current.toggleVideo();
    setIsVideoEnabled(enabled);
    return enabled;
  }, []);

  // Toggle audio
  const toggleAudio = useCallback((): boolean => {
    if (!webrtcManagerRef.current) return false;
    
    const enabled = webrtcManagerRef.current.toggleAudio();
    setIsAudioEnabled(enabled);
    return enabled;
  }, []);

  // Derived state
  const isConnected = webrtcManagerRef.current?.isConnected() ?? false;
  const isCallActive = webrtcManagerRef.current?.isCallActive() ?? false;

  return {
    // State
    localStream,
    remoteStream,
    callState,
    isConnected,
    isCallActive,
    isSupported,
    error,
    
    // Actions
    startCall,
    endCall,
    acceptCall,
    rejectCall,
    toggleVideo,
    toggleAudio,
    
    // Status
    isVideoEnabled,
    isAudioEnabled,
  };
};

// Hook for checking WebRTC capabilities
export const useWebRTCCapabilities = () => {
  const [capabilities, setCapabilities] = useState({
    isSupported: false,
    hasCamera: false,
    hasMicrophone: false,
    audioDevices: [] as MediaDeviceInfo[],
    videoDevices: [] as MediaDeviceInfo[],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkCapabilities = async () => {
      try {
        setLoading(true);
        
        // Check WebRTC support
        const isSupported = checkWebRTCSupport();
        
        if (!isSupported) {
          setCapabilities(prev => ({ ...prev, isSupported: false }));
          setLoading(false);
          return;
        }

        // Check device availability
        let hasCamera = false;
        let hasMicrophone = false;
        let audioDevices: MediaDeviceInfo[] = [];
        let videoDevices: MediaDeviceInfo[] = [];

        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          audioDevices = devices.filter(device => device.kind === 'audioinput');
          videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          hasCamera = videoDevices.length > 0;
          hasMicrophone = audioDevices.length > 0;
        } catch (err) {
          console.warn('Could not enumerate devices:', err);
        }

        setCapabilities({
          isSupported,
          hasCamera,
          hasMicrophone,
          audioDevices,
          videoDevices,
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to check capabilities';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    checkCapabilities();
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      // Stop the stream immediately, we just wanted to request permissions
      stream.getTracks().forEach(track => track.stop());
      
      // Re-check capabilities
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setCapabilities(prev => ({
        ...prev,
        hasCamera: videoDevices.length > 0,
        hasMicrophone: audioDevices.length > 0,
        audioDevices,
        videoDevices,
      }));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Permission denied';
      setError(errorMessage);
      return false;
    }
  }, []);

  return {
    capabilities,
    loading,
    error,
    requestPermissions,
  };
};

// Hook for monitoring call quality
export const useCallQuality = (peerConnection: RTCPeerConnection | null) => {
  const [stats, setStats] = useState({
    bitrate: 0,
    packetsLost: 0,
    latency: 0,
    quality: 'unknown' as 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
  });

  useEffect(() => {
    if (!peerConnection) return;

    const interval = setInterval(async () => {
      try {
        const reports = await peerConnection.getStats();
        let bitrate = 0;
        let packetsLost = 0;
        let latency = 0;

        reports.forEach(report => {
          if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
            bitrate = report.bytesReceived * 8 / 1000; // kbps
            packetsLost = report.packetsLost || 0;
          }
          
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            latency = report.currentRoundTripTime * 1000 || 0; // ms
          }
        });

        // Determine quality based on metrics
        let quality: typeof stats.quality = 'unknown';
        if (bitrate > 1000 && packetsLost < 1 && latency < 100) {
          quality = 'excellent';
        } else if (bitrate > 500 && packetsLost < 5 && latency < 200) {
          quality = 'good';
        } else if (bitrate > 200 && packetsLost < 10 && latency < 300) {
          quality = 'fair';
        } else if (bitrate > 0) {
          quality = 'poor';
        }

        setStats({ bitrate, packetsLost, latency, quality });
      } catch (error) {
        console.error('Error getting call stats:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [peerConnection]);

  return stats;
};
