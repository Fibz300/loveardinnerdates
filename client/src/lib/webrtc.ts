export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  mediaConstraints: MediaStreamConstraints;
}

export interface CallData {
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  type: 'offer' | 'answer' | 'candidate' | 'hangup';
  from: number;
  to: number;
  matchId: number;
}

export type CallState = 'idle' | 'calling' | 'receiving' | 'connected' | 'ended';

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private websocket: WebSocket | null = null;
  private config: WebRTCConfig;
  private isInitiator: boolean = false;
  private callState: CallState = 'idle';
  private userId: number;
  private matchId: number | null = null;

  // Event handlers
  public onStateChange: (state: CallState) => void = () => {};
  public onLocalStream: (stream: MediaStream) => void = () => {};
  public onRemoteStream: (stream: MediaStream) => void = () => {};
  public onError: (error: string) => void = () => {};

  constructor(userId: number) {
    this.userId = userId;
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
      mediaConstraints: {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      }
    };
  }

  // Initialize WebSocket connection for signaling
  public initializeSignaling(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.websocket = new WebSocket(wsUrl);
    
    this.websocket.onopen = () => {
      console.log('WebSocket connected for WebRTC signaling');
    };

    this.websocket.onmessage = (event) => {
      try {
        const data: CallData = JSON.parse(event.data);
        this.handleSignalingMessage(data);
      } catch (error) {
        console.error('Error parsing signaling message:', error);
      }
    };

    this.websocket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    this.websocket.onerror = (error) => {
      this.onError('WebSocket connection failed');
      console.error('WebSocket error:', error);
    };
  }

  // Start a call
  public async startCall(matchId: number): Promise<void> {
    try {
      this.matchId = matchId;
      this.isInitiator = true;
      this.setState('calling');

      // Get user media
      await this.getUserMedia();
      
      // Create peer connection
      this.createPeerConnection();
      
      // Add local stream to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection?.addTrack(track, this.localStream!);
        });
      }

      // Create and send offer
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);
      
      this.sendSignalingMessage({
        type: 'offer',
        offer,
        from: this.userId,
        to: 0, // Will be determined by match
        matchId
      });

    } catch (error) {
      this.onError('Failed to start call: ' + (error as Error).message);
      this.setState('ended');
    }
  }

  // Answer an incoming call
  public async answerCall(callData: CallData): Promise<void> {
    try {
      this.matchId = callData.matchId;
      this.isInitiator = false;
      this.setState('connected');

      // Get user media
      await this.getUserMedia();
      
      // Create peer connection
      this.createPeerConnection();
      
      // Add local stream to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection?.addTrack(track, this.localStream!);
        });
      }

      // Set remote description and create answer
      if (callData.offer) {
        await this.peerConnection!.setRemoteDescription(callData.offer);
        const answer = await this.peerConnection!.createAnswer();
        await this.peerConnection!.setLocalDescription(answer);
        
        this.sendSignalingMessage({
          type: 'answer',
          answer,
          from: this.userId,
          to: callData.from,
          matchId: callData.matchId
        });
      }

    } catch (error) {
      this.onError('Failed to answer call: ' + (error as Error).message);
      this.setState('ended');
    }
  }

  // Reject an incoming call
  public rejectCall(): void {
    this.setState('ended');
  }

  // End the current call
  public endCall(): void {
    if (this.matchId) {
      this.sendSignalingMessage({
        type: 'hangup',
        from: this.userId,
        to: 0,
        matchId: this.matchId
      });
    }

    this.cleanup();
    this.setState('ended');
  }

  // Toggle video
  public toggleVideo(): boolean {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  // Toggle audio
  public toggleAudio(): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  // Get user media
  private async getUserMedia(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(this.config.mediaConstraints);
      this.onLocalStream(this.localStream);
    } catch (error) {
      throw new Error('Failed to access camera/microphone: ' + (error as Error).message);
    }
  }

  // Create peer connection
  private createPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers
    });

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.onRemoteStream(this.remoteStream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.matchId) {
        this.sendSignalingMessage({
          type: 'candidate',
          candidate: event.candidate.toJSON(),
          from: this.userId,
          to: 0,
          matchId: this.matchId
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;

      switch (this.peerConnection.connectionState) {
        case 'connected':
          this.setState('connected');
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          this.setState('ended');
          break;
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      if (!this.peerConnection) return;

      console.log('ICE connection state:', this.peerConnection.iceConnectionState);
      
      if (this.peerConnection.iceConnectionState === 'failed') {
        this.onError('Connection failed');
        this.setState('ended');
      }
    };
  }

  // Handle signaling messages
  private async handleSignalingMessage(data: CallData): Promise<void> {
    if (!this.peerConnection && data.type !== 'offer') return;

    try {
      switch (data.type) {
        case 'offer':
          // Incoming call
          this.setState('receiving');
          // Auto-answer for now, in real app you'd show UI to accept/reject
          await this.answerCall(data);
          break;

        case 'answer':
          if (data.answer) {
            await this.peerConnection!.setRemoteDescription(data.answer);
            this.setState('connected');
          }
          break;

        case 'candidate':
          if (data.candidate) {
            await this.peerConnection!.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
          break;

        case 'hangup':
          this.cleanup();
          this.setState('ended');
          break;
      }
    } catch (error) {
      this.onError('Signaling error: ' + (error as Error).message);
    }
  }

  // Send signaling message
  private sendSignalingMessage(data: CallData): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(data));
    }
  }

  // Set call state
  private setState(state: CallState): void {
    this.callState = state;
    this.onStateChange(state);
  }

  // Cleanup resources
  private cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.matchId = null;
  }

  // Getters
  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public getCallState(): CallState {
    return this.callState;
  }

  public isConnected(): boolean {
    return this.callState === 'connected';
  }

  public isCallActive(): boolean {
    return ['calling', 'receiving', 'connected'].includes(this.callState);
  }

  // Cleanup on destruction
  public destroy(): void {
    this.cleanup();
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}

// Export utility functions
export const checkWebRTCSupport = (): boolean => {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.RTCPeerConnection
  );
};

export const getMediaDevices = async (): Promise<{
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
}> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    return {
      audioDevices: devices.filter(device => device.kind === 'audioinput'),
      videoDevices: devices.filter(device => device.kind === 'videoinput'),
    };
  } catch (error) {
    console.error('Error enumerating devices:', error);
    return { audioDevices: [], videoDevices: [] };
  }
};

export const checkMediaPermissions = async (): Promise<{
  camera: boolean;
  microphone: boolean;
}> => {
  try {
    const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
    const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    
    return {
      camera: cameraPermission.state === 'granted',
      microphone: microphonePermission.state === 'granted',
    };
  } catch (error) {
    // Fallback: try to access media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop());
      return { camera: true, microphone: true };
    } catch {
      return { camera: false, microphone: false };
    }
  }
};
