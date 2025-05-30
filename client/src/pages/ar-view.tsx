import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useAR } from "@/hooks/use-ar";
import ArCamera from "@/components/ar-camera";
import { Camera, MapPin, Users, Video, Settings, Zap } from "lucide-react";
import { User } from "@shared/schema";

interface ArViewProps {
  user: User;
}

export default function ArView({ user }: ArViewProps) {
  const [isArActive, setIsArActive] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const { position, getCurrentPosition } = useGeolocation();
  const { 
    isSupported, 
    startAR, 
    stopAR, 
    isActive,
    error: arError 
  } = useAR();

  // Get nearby users for AR view
  const { data: nearbyUsers = [] } = useQuery({
    queryKey: ["/api/discover", user.id, position?.latitude, position?.longitude, 1], // 1km for AR
    enabled: !!position && isArActive,
  });

  // Get AR stories nearby
  const { data: arStories = [] } = useQuery({
    queryKey: ["/api/ar-stories", position?.latitude, position?.longitude, 500], // 500m for stories
    enabled: !!position && isArActive,
  });

  useEffect(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  const handleStartAR = async () => {
    if (!isSupported) {
      toast({
        title: "AR Not Supported",
        description: "Your device doesn't support AR features.",
        variant: "destructive",
      });
      return;
    }

    if (!position) {
      toast({
        title: "Location Required",
        description: "Please enable location access for AR features.",
        variant: "destructive",
      });
      getCurrentPosition();
      return;
    }

    try {
      await startAR();
      setIsArActive(true);
      toast({
        title: "AR Activated",
        description: "Point your camera to see other users and stories!",
      });
    } catch (error) {
      toast({
        title: "AR Error",
        description: "Failed to start AR. Please check camera permissions.",
        variant: "destructive",
      });
    }
  };

  const handleStopAR = () => {
    stopAR();
    setIsArActive(false);
    setSelectedUser(null);
  };

  const handleUserSelect = (selectedUser: User) => {
    setSelectedUser(selectedUser);
  };

  if (!isSupported) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">AR Not Supported</h3>
            <p className="text-muted-foreground mb-4">
              Your device doesn't support augmented reality features. Please try on a compatible device.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Location Required</h3>
            <p className="text-muted-foreground mb-4">
              AR features require location access to show nearby users
            </p>
            <Button onClick={getCurrentPosition}>
              Enable Location
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* AR Camera View */}
      {isArActive ? (
        <ArCamera
          nearbyUsers={nearbyUsers}
          arStories={arStories}
          currentUser={user}
          onUserSelect={handleUserSelect}
          onStoryView={(storyId) => {
            // Handle story view
          }}
        />
      ) : (
        <div className="container mx-auto px-4 py-6">
          {/* AR Introduction */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-6 h-6 text-blue-500" />
                Augmented Reality View
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Experience dating in a whole new way! See other users and their AR tags 
                overlaid in the real world, watch geo-fenced video stories, and interact 
                with people around you.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <h4 className="font-medium">See Nearby Users</h4>
                    <p className="text-sm text-muted-foreground">
                      View profiles and AR tags floating above real people
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Video className="w-5 h-5 text-purple-500 mt-1" />
                  <div>
                    <h4 className="font-medium">AR Stories</h4>
                    <p className="text-sm text-muted-foreground">
                      Watch location-based video stories in AR
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-500 mt-1" />
                  <div>
                    <h4 className="font-medium">Real-time Positioning</h4>
                    <p className="text-sm text-muted-foreground">
                      Precise GPS tracking for accurate AR placement
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Settings className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <h4 className="font-medium">Custom AR Tags</h4>
                    <p className="text-sm text-muted-foreground">
                      Display your personality with floating text bubbles
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStartAR}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                size="lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Start AR Experience
              </Button>
            </CardContent>
          </Card>

          {/* Current AR Settings */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your AR Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Your AR Tags</h4>
                  {user.arTags && user.arTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.arTags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No AR tags set. Add some in your profile to appear above your head in AR!
                    </p>
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium">Visibility Range</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll be visible to users within 1km in AR mode
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{nearbyUsers.length}</div>
                <div className="text-sm text-muted-foreground">Users Nearby</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Video className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{arStories.length}</div>
                <div className="text-sm text-muted-foreground">AR Stories</div>
              </CardContent>
            </Card>
          </div>

          {/* Premium Features */}
          {!user.isPremium && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-yellow-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">Premium AR Features</h4>
                    <p className="text-sm text-yellow-700 mb-3">
                      Unlock advanced AR filters, custom animations, and priority visibility!
                    </p>
                    <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                      Upgrade to Premium
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* AR Controls Overlay */}
      {isArActive && (
        <div className="absolute top-4 left-4 right-4 z-50">
          <div className="flex items-center justify-between">
            <Badge className="bg-green-500">
              AR Active
            </Badge>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStopAR}
            >
              Stop AR
            </Button>
          </div>
        </div>
      )}

      {/* Selected User Overlay */}
      {selectedUser && (
        <div className="absolute bottom-4 left-4 right-4 z-50">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedUser.firstName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.occupation || "No occupation listed"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm">
                    View Profile
                  </Button>
                  <Button size="sm" variant="outline">
                    Wave 👋
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AR Error */}
      {arError && (
        <div className="absolute top-16 left-4 right-4 z-50">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-sm text-red-700">
                AR Error: {arError}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
