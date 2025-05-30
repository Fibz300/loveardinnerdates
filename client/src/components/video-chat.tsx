import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Volume2, VolumeX, Maximize, Minimize, RotateCcw } from "lucide-react";

interface VideoChatProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export default function VideoChat({ 
  localStream, 
  remoteStream, 
  isVideoEnabled, 
  isAudioEnabled 
}: VideoChatProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localVideoSize, setLocalVideoSize] = useState<"small" | "large">("small");

  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set up remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Switch video positions
  const switchVideoPositions = () => {
    setLocalVideoSize(prev => prev === "small" ? "large" : "small");
  };

  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* Main video (remote user) */}
      <div className="relative w-full h-full">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            muted={isRemoteMuted}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👤</span>
              </div>
              <p className="text-lg">Waiting for connection...</p>
            </div>
          </div>
        )}

        {/* Remote user controls overlay */}
        <div className="absolute bottom-4 left-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsRemoteMuted(!isRemoteMuted)}
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            {isRemoteMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Picture-in-Picture local video */}
      {localStream && (
        <div 
          className={`absolute transition-all duration-300 cursor-pointer ${
            localVideoSize === "small" 
              ? "top-4 right-4 w-32 h-24" 
              : "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-60"
          }`}
          onClick={switchVideoPositions}
        >
          <Card className="overflow-hidden h-full">
            {isVideoEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-lg">📷</span>
                  </div>
                  <p className="text-xs">Camera off</p>
                </div>
              </div>
            )}
          </Card>
          
          {/* Local video indicators */}
          <div className="absolute top-2 left-2 flex gap-1">
            {!isVideoEnabled && (
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            )}
            {!isAudioEnabled && (
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            )}
          </div>
        </div>
      )}

      {/* Video controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={switchVideoPositions}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleFullscreen}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </Button>
      </div>

      {/* Connection status */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            remoteStream ? "bg-green-400" : "bg-yellow-400"
          }`}></div>
          <span>
            {remoteStream ? "Connected" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Audio visualization (optional) */}
      {isAudioEnabled && (
        <div className="absolute bottom-20 left-4 flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-green-400 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 20 + 10}px`,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
