import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Search } from "lucide-react";

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number }) => void;
  selectedLocation: { lat: number; lng: number } | null;
  radius: number;
  onRadiusChange: (radius: number) => void;
  defaultCenter?: { lat: number; lng: number };
}

export default function LocationPicker({
  onLocationSelect,
  selectedLocation,
  radius,
  onRadiusChange,
  defaultCenter = { lat: 51.5074, lng: -0.1278 }, // London default
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const map = new google.maps.Map(mapRef.current, {
      center: selectedLocation || currentPosition || defaultCenter,
      zoom: 13,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    mapInstanceRef.current = map;

    // Add click listener
    map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        onLocationSelect({ lat, lng });
      }
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
    };
  }, []);

  // Update marker and circle when location or radius changes
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLocation) return;

    // Remove existing marker and circle
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    // Add new marker
    markerRef.current = new google.maps.Marker({
      position: selectedLocation,
      map: mapInstanceRef.current,
      title: "Selected Location",
      icon: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#3b82f6" stroke="white" stroke-width="2"/>
            <circle cx="16" cy="16" r="4" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16),
      },
    });

    // Add radius circle
    circleRef.current = new google.maps.Circle({
      strokeColor: "#3b82f6",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#3b82f6",
      fillOpacity: 0.1,
      map: mapInstanceRef.current,
      center: selectedLocation,
      radius: radius * 1000, // Convert km to meters
    });

    // Center map on location
    mapInstanceRef.current.setCenter(selectedLocation);
  }, [selectedLocation, radius]);

  // Get current position
  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentPosition(location);
        onLocationSelect(location);
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(location);
        }

        toast({
          title: "Location found",
          description: "Your current location has been set.",
        });
      },
      (error) => {
        toast({
          title: "Location error",
          description: "Unable to get your current location.",
          variant: "destructive",
        });
      }
    );
  };

  // Search for location
  const searchLocation = () => {
    if (!searchQuery.trim() || !window.google) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        
        onLocationSelect({ lat, lng });
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
        }

        toast({
          title: "Location found",
          description: `Found: ${results[0].formatted_address}`,
        });
      } else {
        toast({
          title: "Location not found",
          description: "Please try a different search term.",
          variant: "destructive",
        });
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchLocation();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Select Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search for a location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
          <Button onClick={searchLocation} size="sm">
            <Search className="w-4 h-4" />
          </Button>
          <Button onClick={getCurrentPosition} size="sm" variant="outline">
            <Navigation className="w-4 h-4" />
          </Button>
        </div>

        {/* Radius Control */}
        <div className="space-y-2">
          <Label>Search Radius: {radius}km</Label>
          <Slider
            value={[radius]}
            onValueChange={(value) => onRadiusChange(value[0])}
            max={50}
            min={1}
            step={1}
            className="w-full"
          />
        </div>

        {/* Map */}
        <div className="relative">
          <div ref={mapRef} className="w-full h-64 rounded-lg border" />
          
          {/* Map overlay info */}
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span>Click to select location</span>
            </div>
          </div>

          {selectedLocation && (
            <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg p-2">
              <div className="text-sm">
                <div className="font-medium">Selected Location</div>
                <div className="text-muted-foreground">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </div>
                <Badge variant="secondary" className="mt-1">
                  {radius}km radius
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground">
          <p>• Click on the map to select a location</p>
          <p>• Use the search bar to find specific places</p>
          <p>• Adjust the radius to set your preferred area</p>
        </div>
      </CardContent>
    </Card>
  );
}
