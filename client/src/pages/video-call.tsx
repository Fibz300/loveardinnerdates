import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useToast } from "@/hooks/use-toast";
import VideoChat from "@/components/video-chat";
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  MessageCircle,
  ArrowLeft,
  Crown
} from "lucide-react";
import { User } from "@shared/schema";

interface VideoCallProps {
  user: User;
}

export default function VideoCall({ user }: VideoCallProps) {
  const { matchId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callState, setCallState] = useState<"idle" | "calling" | "connected" | "ended">("idle");
  const [callDuration, setCallDuration] = useState(0);
  
  const callStartTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get match details
  const { data: match } = useQuery({
    queryKey: ["/api/matches", user.id],
    select: (matches: any[]) => matches.find(m => m.id === parseInt(matchId || "0")),
    enabled: !!matchId,
  });

  // WebRTC hook
  const {
    localStream,
    remoteStream,
    isConnected,
    isCallActive,
    error: webrtcError,
    startCall,
    endCall,
    toggleVideo,
    toggleAudio,
    acceptCall,
    rejectCall,
  } = useWebRTC({
    userId: user.id,
    matchId: matchId ? parseInt(matchId) : undefined,
    onCallStateChange: (state) => {
      setCallState(state);
      if (state === "connected") {
        callStartTimeRef.current = Date.now();
        startTimer();
      } else if (state === "ended") {
        stopTimer();
        setCallDuration(0);
      }
    },
  });

  // Check premium access
  const hasVideoAccess = user.isPremium;

  useEffect(() => {
    if (!hasVideoAccess) {
      toast({
        title: "Premium Feature",
        description: "Video calling is available for premium users only.",
        variant: "destructive",
      });
      setLocation("/matches");
    }
  }, [hasVideoAccess, setLocation, toast]);

  useEffect(() => {
    if (webrtcError) {
      toast({
        title: "Call Error",
        description: webrtcError,
        variant: "destructive",
      });
    }
  }, [webrtcError, toast]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartCall = async () => {
    try {
      setCallState("calling");
      await startCall();
    } catch (error) {
      toast({
        title: "Failed to start call",
        description: "Please check your camera and microphone permissions.",
        variant: "destructive",
      });
      setCallState("idle");
    }
  };

  const handleEndCall = () => {
    endCall();
    setCallState("ended");
    stopTimer();
    
    toast({
      title: "Call ended",
      description: `Call duration: ${formatCallDuration(callDuration)}`,
    });
  };

  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoEnabled(!isVideoEnabled);
  };

  const handleToggleAudio = () => {
    toggleAudio();
    setIsAudioEnabled(!isAudioEnabled);
  };

  if (!hasVideoAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
            <p className="text-muted-foreground mb-4">
              Video calling is available for premium users only. Upgrade to unlock this feature.
            </p>
            <Button
              onClick={() => setLocation("/wallet")}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Match Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The match you're trying to call doesn't exist or has been removed.
            </p>
            <Button onClick={() => setLocation("/matches")}>
              Back to Matches
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const otherUser = match.otherUser;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/matches")}
              className="text-white hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src="" />
                <AvatarFallback>
                  {otherUser.firstName[0]}{otherUser.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-white font-semibold">{otherUser.firstName}</h2>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={callState === "connected" ? "default" : "secondary"}
                    className={callState === "connected" ? "bg-green-500" : ""}
                  >
                    {callState === "idle" && "Ready to call"}
                    {callState === "calling" && "Calling..."}
                    {callState === "connected" && formatCallDuration(callDuration)}
                    {callState === "ended" && "Call ended"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/messages/${matchId}`)}
            className="text-white hover:bg-gray-700"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {callState === "connected" && (localStream || remoteStream) ? (
          <VideoChat
            localStream={localStream}
            remoteStream={remoteStream}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Avatar className="w-32 h-32 mx-auto mb-6">
                <AvatarImage src="" />
                <AvatarFallback className="text-4xl">
                  {otherUser.firstName[0]}{otherUser.lastName[0]}
                </AvatarFallback>
              </Avatar>
              
              <h3 className="text-2xl font-semibold text-white mb-2">
                {otherUser.firstName}
              </h3>
              
              <p className="text-gray-400 mb-8">
                {callState === "idle" && "Ready to start video call"}
                {callState === "calling" && "Calling..."}
                {callState === "ended" && "Call ended"}
              </p>

              {callState === "idle" && (
                <Button
                  onClick={handleStartCall}
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 rounded-full w-16 h-16"
                >
                  <Video className="w-6 h-6" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      {(callState === "calling" || callState === "connected") && (
        <div className="bg-gray-800 border-t border-gray-700 p-6">
          <div className="flex items-center justify-center gap-6">
            <Button
              variant="outline"
              size="lg"
              onClick={handleToggleAudio}
              className={`rounded-full w-14 h-14 ${
                isAudioEnabled 
                  ? "bg-gray-700 hover:bg-gray-600 border-gray-600" 
                  : "bg-red-500 hover:bg-red-600 border-red-500"
              }`}
            >
              {isAudioEnabled ? (
                <Mic className="w-6 h-6 text-white" />
              ) : (
                <MicOff className="w-6 h-6 text-white" />
              )}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              onClick={handleEndCall}
              className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleToggleVideo}
              className={`rounded-full w-14 h-14 ${
                isVideoEnabled 
                  ? "bg-gray-700 hover:bg-gray-600 border-gray-600" 
                  : "bg-red-500 hover:bg-red-600 border-red-500"
              }`}
            >
              {isVideoEnabled ? (
                <Video className="w-6 h-6 text-white" />
              ) : (
                <VideoOff className="w-6 h-6 text-white" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {webrtcError && (
        <div className="absolute top-20 left-4 right-4 z-50">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-sm text-red-700">
                Call Error: {webrtcError}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
