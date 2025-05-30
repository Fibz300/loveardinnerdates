import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { apiRequest } from "@/lib/queryClient";
import LocationPicker from "@/components/location-picker";
import { getOpenTableAPI, filterVenuesByExperience, type OpenTableVenue } from "@/lib/opentable-api";
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  Users, 
  Zap, 
  Heart,
  Clock,
  CheckCircle,
  UtensilsCrossed,
  Wine,
  Coffee,
  Star
} from "lucide-react";
import { User, DinnerDate } from "@shared/schema";

interface BlindDateProps {
  user: User;
}

export default function BlindDate({ user }: BlindDateProps) {
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedRadius, setSelectedRadius] = useState(10);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { position, getCurrentPosition } = useGeolocation();

  // Get user's active blind dates
  const { data: activeBlindDates = [], isLoading: activeLoading } = useQuery<BlindDateType[]>({
    queryKey: ["/api/blind-dates/active", user.id],
  });

  // Get available blind dates nearby
  const { data: availableBlindDates = [], isLoading: availableLoading } = useQuery<BlindDateType[]>({
    queryKey: ["/api/blind-dates/available", user.id, position?.latitude, position?.longitude, 25],
    enabled: !!position,
  });

  // Create blind date mutation
  const createBlindDateMutation = useMutation({
    mutationFn: async (data: {
      centerLat: number;
      centerLng: number;
      radius: number;
      amount: string;
    }) => {
      const response = await apiRequest("POST", "/api/blind-dates", {
        user1Id: user.id,
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Blind Date Created!",
        description: "Your blind date request is now live. We'll notify you when someone joins!",
      });
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/blind-dates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create blind date. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Join blind date mutation
  const joinBlindDateMutation = useMutation({
    mutationFn: async (blindDateId: number) => {
      const response = await apiRequest("POST", `/api/blind-dates/${blindDateId}/join`, {
        userId: user.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Blind Date Matched!",
        description: "You've been matched for a blind date! Check your messages for details.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/blind-dates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join blind date. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateBlindDate = () => {
    if (!selectedLocation) {
      toast({
        title: "Location Required",
        description: "Please select a location for your blind date.",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(user.walletBalance || "0") < 100) {
      toast({
        title: "Insufficient Balance",
        description: "You need $100 in your wallet to create a blind date.",
        variant: "destructive",
      });
      return;
    }

    createBlindDateMutation.mutate({
      centerLat: selectedLocation.lat,
      centerLng: selectedLocation.lng,
      radius: selectedRadius,
      amount: "100.00",
    });
  };

  const handleJoinBlindDate = (blindDateId: number) => {
    if (parseFloat(user.walletBalance || "0") < 100) {
      toast({
        title: "Insufficient Balance",
        description: "You need $100 in your wallet to join a blind date.",
        variant: "destructive",
      });
      return;
    }

    joinBlindDateMutation.mutate(blindDateId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "matched": return "bg-green-100 text-green-800";
      case "completed": return "bg-blue-100 text-blue-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Zap className="w-6 h-6" />
            Blind Date Premium
          </CardTitle>
          <p className="text-purple-100">
            Experience real-world dating with guaranteed matches in your city!
          </p>
        </CardHeader>
      </Card>

      {/* Wallet Balance */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <span className="font-medium">Wallet Balance</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold">${user.walletBalance || "0.00"}</span>
              {parseFloat(user.walletBalance || "0") < 100 && (
                <Badge variant="secondary">Need $100 minimum</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Blind Date Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">1. Pay to Play</h3>
              <p className="text-sm text-muted-foreground">
                Both users deposit $100 to ensure serious commitment to the date
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">2. Set Location</h3>
              <p className="text-sm text-muted-foreground">
                Choose your preferred area and radius for the blind date
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">3. Get Matched</h3>
              <p className="text-sm text-muted-foreground">
                We match you with someone compatible in your area for a real date
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Blind Date */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create Blind Date</CardTitle>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              disabled={parseFloat(user.walletBalance || "0") < 100}
            >
              {showCreateForm ? "Cancel" : "Create New"}
            </Button>
          </div>
        </CardHeader>
        
        {showCreateForm && (
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Select Location & Radius</h4>
              <LocationPicker
                onLocationSelect={setSelectedLocation}
                selectedLocation={selectedLocation}
                radius={selectedRadius}
                onRadiusChange={setSelectedRadius}
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Blind Date Details</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Cost: $100 (refunded if no match within 48 hours)</li>
                <li>• Location: {selectedLocation ? "Selected" : "Please select on map"}</li>
                <li>• Radius: {selectedRadius}km from selected point</li>
                <li>• Gender preference: {user.lookingFor}</li>
              </ul>
            </div>
            
            <Button
              onClick={handleCreateBlindDate}
              disabled={!selectedLocation || createBlindDateMutation.isPending}
              className="w-full"
            >
              {createBlindDateMutation.isPending ? "Creating..." : "Create Blind Date ($100)"}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Active Blind Dates */}
      {activeBlindDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Active Blind Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeBlindDates.map((blindDate) => (
              <div key={blindDate.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={getStatusColor(blindDate.status || "pending")}>
                    {blindDate.status || "pending"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {blindDate.createdAt ? new Date(blindDate.createdAt).toLocaleDateString() : "Unknown date"}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>Radius: {blindDate.radius}km</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span>${blindDate.amount}</span>
                  </div>
                </div>
                
                {blindDate.status === "matched" && blindDate.scheduledFor && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Date Scheduled!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {blindDate.scheduledFor ? new Date(blindDate.scheduledFor).toLocaleString() : "Date pending"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Available Blind Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Available Blind Dates Near You
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Join someone else's blind date request in your area
          </p>
        </CardHeader>
        <CardContent>
          {availableLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/4 mb-3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : availableBlindDates.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Available Blind Dates</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to create a blind date in your area!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableBlindDates.map((blindDate) => (
                <div key={blindDate.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">
                      Available
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Created {blindDate.createdAt ? new Date(blindDate.createdAt).toLocaleDateString() : "Unknown date"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{blindDate.radius}km radius</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span>${blindDate.amount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>Waiting for match</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleJoinBlindDate(blindDate.id)}
                    disabled={
                      parseFloat(user.walletBalance || "0") < parseFloat(blindDate.amount || "0") ||
                      joinBlindDateMutation.isPending
                    }
                    className="w-full"
                  >
                    {joinBlindDateMutation.isPending ? "Joining..." : `Join Blind Date ($${blindDate.amount || "100"})`}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safety Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div className="text-sm text-blue-700">
              <strong>Safety First:</strong> All blind dates are verified matches. 
              Meet in public places and follow safety guidelines. 
              Report any issues to our support team immediately.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
