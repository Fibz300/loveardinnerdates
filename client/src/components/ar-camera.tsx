import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Eye, Heart, MessageCircle } from "lucide-react";
import { User, ArStory } from "@shared/schema";

interface ArCameraProps {
  nearbyUsers: User[];
  arStories: ArStory[];
  currentUser: User;
  onUserSelect: (user: User) => void;
  onStoryView: (storyId: number) => void;
}

interface ArObject {
  id: string;
  type: "user" | "story";
  x: number;
  y: number;
  distance: number;
  data: User | ArStory;
}

export default function ArCamera({ 
  nearbyUsers, 
  arStories, 
  currentUser, 
  onUserSelect, 
  onStoryView 
}: ArCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [arObjects, setArObjects] = useState<ArObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<ArObject | null>(null);
  const [deviceOrientation, setDeviceOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });

  useEffect(() => {
    startCamera();
    setupOrientationListener();
    return () => {
      stopCamera();
      cleanupOrientationListener();
    };
  }, []);

  useEffect(() => {
    // Update AR objects based on nearby users and stories
    const objects: ArObject[] = [];

    // Add nearby users as AR objects
    nearbyUsers.forEach((user, index) => {
      if (user.id !== currentUser.id) {
        objects.push({
          id: `user-${user.id}`,
          type: "user",
          x: Math.random() * 80 + 10, // Random position for demo
          y: Math.random() * 60 + 20,
          distance: Math.random() * 1000 + 50, // meters
          data: user,
        });
      }
    });

    // Add AR stories
    arStories.forEach((story, index) => {
      objects.push({
        id: `story-${story.id}`,
        type: "story",
        x: Math.random() * 80 + 10,
        y: Math.random() * 60 + 20,
        distance: Math.random() * 500 + 25,
        data: story,
      });
    });

    setArObjects(objects);
  }, [nearbyUsers, arStories, currentUser.id]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const setupOrientationListener = () => {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientationChange);
    }
  };

  const cleanupOrientationListener = () => {
    if (window.DeviceOrientationEvent) {
      window.removeEventListener('deviceorientation', handleOrientationChange);
    }
  };

  const handleOrientationChange = (event: DeviceOrientationEvent) => {
    setDeviceOrientation({
      alpha: event.alpha || 0,
      beta: event.beta || 0,
      gamma: event.gamma || 0,
    });
  };

  const handleObjectClick = (arObject: ArObject) => {
    setSelectedObject(arObject);
    
    if (arObject.type === "user") {
      onUserSelect(arObject.data as User);
    } else if (arObject.type === "story") {
      onStoryView((arObject.data as ArStory).id);
    }
  };

  const renderUserTag = (user: User, distance: number) => (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border">
      <div className="flex items-center gap-2 mb-1">
        <Avatar className="w-6 h-6">
          <AvatarImage src="" />
          <AvatarFallback className="text-xs">
            {user.firstName[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-semibold">{user.firstName}</div>
          <div className="text-xs text-muted-foreground">{Math.round(distance)}m away</div>
        </div>
      </div>
      
      {user.arTags && user.arTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {user.arTags.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
      
      <div className="flex gap-1 mt-2">
        <Button size="sm" className="text-xs px-2 py-1">
          <Heart className="w-3 h-3 mr-1" />
          Like
        </Button>
        <Button size="sm" variant="outline" className="text-xs px-2 py-1">
          <MessageCircle className="w-3 h-3 mr-1" />
          Wave
        </Button>
      </div>
    </div>
  );

  const renderStoryTag = (story: ArStory, distance: number) => (
    <div className="bg-purple-500/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-purple-400 text-white">
      <div className="flex items-center gap-2 mb-1">
        <Play className="w-4 h-4" />
        <div>
          <div className="text-sm font-semibold">AR Story</div>
          <div className="text-xs opacity-80">{Math.round(distance)}m away</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-xs">
        <Eye className="w-3 h-3" />
        <span>{story.views} views</span>
      </div>
      
      <Button size="sm" className="text-xs px-2 py-1 mt-2 bg-white text-purple-600 hover:bg-gray-100">
        <Play className="w-3 h-3 mr-1" />
        Watch
      </Button>
    </div>
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Camera Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* AR Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* AR Objects Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {arObjects.map((arObject) => (
          <div
            key={arObject.id}
            className="absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 hover:scale-105"
            style={{
              left: `${arObject.x}%`,
              top: `${arObject.y}%`,
              zIndex: Math.max(1, Math.round(1000 - arObject.distance)),
            }}
            onClick={() => handleObjectClick(arObject)}
          >
            {arObject.type === "user" 
              ? renderUserTag(arObject.data as User, arObject.distance)
              : renderStoryTag(arObject.data as ArStory, arObject.distance)
            }
          </div>
        ))}
      </div>

      {/* AR Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-8 h-8 border-2 border-white/50 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white/80 rounded-full"></div>
        </div>
      </div>

      {/* AR Stats Overlay */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
        <div>Users: {nearbyUsers.length - 1}</div>
        <div>Stories: {arStories.length}</div>
        <div className="text-xs opacity-80 mt-1">
          α:{Math.round(deviceOrientation.alpha)}° 
          β:{Math.round(deviceOrientation.beta)}° 
          γ:{Math.round(deviceOrientation.gamma)}°
        </div>
      </div>

      {/* AR Instructions */}
      <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm text-center">
        <p>Point your camera around to discover people and stories nearby</p>
        <p className="text-xs opacity-80 mt-1">
          Tap on floating tags to interact with users or view AR stories
        </p>
      </div>

      {/* Connection Quality Indicator */}
      <div className="absolute top-4 left-4">
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-green-400 rounded"></div>
            <div className="w-1 h-3 bg-green-400 rounded"></div>
            <div className="w-1 h-3 bg-green-400 rounded"></div>
            <div className="w-1 h-3 bg-gray-400 rounded"></div>
          </div>
          <span>AR Active</span>
        </div>
      </div>

      {/* Loading Overlay */}
      {!stream && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Starting AR Camera...</p>
          </div>
        </div>
      )}
    </div>
  );
}
