import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useGeolocation } from "@/hooks/use-geolocation";
import UserCard from "@/components/user-card";
import { Heart, X, Star, MapPin, Zap } from "lucide-react";
import { User } from "@shared/schema";

interface DiscoverProps {
  user: User;
}

export default function Discover({ user }: DiscoverProps) {
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { position, getCurrentPosition } = useGeolocation();

  // Get current location
  useEffect(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  // Fetch nearby users
  const { data: nearbyUsers = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/discover", user.id, position?.latitude, position?.longitude, user.maxDistance],
    enabled: !!position,
  });

  // Swipe mutation
  const swipeMutation = useMutation({
    mutationFn: async ({ action }: { action: "like" | "pass" | "super_like" }) => {
      const currentUserProfile = nearbyUsers[currentUserIndex];
      if (!currentUserProfile) throw new Error("No user to swipe");

      const response = await apiRequest("POST", "/api/swipe", {
        swiperId: user.id,
        swipedId: currentUserProfile.id,
        action,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      const action = variables.action;
      
      if (data.match) {
        toast({
          title: "It's a Match! 🎉",
          description: "You both liked each other! Start chatting now.",
        });
      } else {
        toast({
          title: action === "like" ? "Liked!" : action === "super_like" ? "Super Liked!" : "Passed",
          description: action === "pass" ? "Moving to the next person" : "Hopefully they like you back!",
        });
      }

      // Move to next user
      setCurrentUserIndex(prev => prev + 1);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/discover"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to swipe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSwipe = (action: "like" | "pass" | "super_like") => {
    swipeMutation.mutate({ action });
  };

  if (!position) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Location Access Required</h3>
            <p className="text-muted-foreground mb-4">
              We need your location to show you people nearby
            </p>
            <Button onClick={getCurrentPosition}>
              Enable Location
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Finding people nearby...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!nearbyUsers.length || currentUserIndex >= nearbyUsers.length) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No More People</h3>
            <p className="text-muted-foreground mb-4">
              You've seen everyone in your area. Try expanding your distance or come back later!
            </p>
            <Button onClick={() => refetch()}>
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentUserProfile = nearbyUsers[currentUserIndex];
  const remainingUsers = nearbyUsers.length - currentUserIndex;

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      {/* Progress indicator */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {remainingUsers} people nearby
          </span>
          <Badge variant="outline">
            {currentUserIndex + 1} / {nearbyUsers.length}
          </Badge>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentUserIndex + 1) / nearbyUsers.length) * 100}%` }}
          />
        </div>
      </div>

      {/* User Card */}
      <div className="mb-6">
        <UserCard user={currentUserProfile} />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        <Button
          size="lg"
          variant="outline"
          className="w-16 h-16 rounded-full border-red-200 hover:border-red-400 hover:bg-red-50"
          onClick={() => handleSwipe("pass")}
          disabled={swipeMutation.isPending}
        >
          <X className="w-6 h-6 text-red-500" />
        </Button>

        {user.isPremium && (
          <Button
            size="lg"
            className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600"
            onClick={() => handleSwipe("super_like")}
            disabled={swipeMutation.isPending}
          >
            <Star className="w-5 h-5" />
          </Button>
        )}

        <Button
          size="lg"
          className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
          onClick={() => handleSwipe("like")}
          disabled={swipeMutation.isPending}
        >
          <Heart className="w-6 h-6" />
        </Button>

        {!user.isPremium && (
          <Button
            size="sm"
            variant="outline"
            className="ml-4"
            disabled
          >
            <Zap className="w-4 h-4 mr-1" />
            Super Like
            <Badge className="ml-2">Premium</Badge>
          </Button>
        )}
      </div>

      {/* Swipe hints */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Swipe or tap the buttons to like or pass
        </p>
      </div>

      {/* Premium upgrade hint */}
      {!user.isPremium && (
        <Card className="mt-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 text-center">
            <Zap className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <h4 className="font-semibold text-yellow-800 mb-1">Upgrade to Premium</h4>
            <p className="text-sm text-yellow-700 mb-3">
              Get unlimited likes, super likes, and see who liked you!
            </p>
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
