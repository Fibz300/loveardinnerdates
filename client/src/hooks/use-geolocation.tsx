import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GeolocationManager, 
  GeolocationPosition, 
  GeolocationError, 
  GeolocationOptions,
  checkLocationPermission 
} from '@/lib/geolocation';

interface UseGeolocationOptions extends GeolocationOptions {
  watch?: boolean;
  onLocationUpdate?: (position: GeolocationPosition) => void;
  onError?: (error: GeolocationError) => void;
}

interface UseGeolocationReturn {
  // State
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  loading: boolean;
  watching: boolean;
  permission: PermissionState | null;
  
  // Actions
  getCurrentPosition: () => Promise<GeolocationPosition>;
  startWatching: () => void;
  stopWatching: () => void;
  clearError: () => void;
  
  // Utilities
  isSupported: boolean;
  accuracy: number | null;
  lastUpdate: Date | null;
}

export const useGeolocation = (options: UseGeolocationOptions = {}): UseGeolocationReturn => {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [loading, setLoading] = useState(false);
  const [watching, setWatching] = useState(false);
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const managerRef = useRef<GeolocationManager | null>(null);
  const isSupported = GeolocationManager.isSupported();

  // Initialize manager
  useEffect(() => {
    if (!isSupported) {
      setError({ code: 0, message: 'Geolocation is not supported' });
      return;
    }

    managerRef.current = new GeolocationManager(options);
    
    // Set up event handlers
    managerRef.current.onLocationUpdate = (pos: GeolocationPosition) => {
      setPosition(pos);
      setError(null);
      setLoading(false);
      setLastUpdate(new Date());
      options.onLocationUpdate?.(pos);
    };

    managerRef.current.onLocationError = (err: GeolocationError) => {
      setError(err);
      setLoading(false);
      options.onError?.(err);
    };

    return () => {
      managerRef.current?.destroy();
    };
  }, [isSupported]);

  // Check permission status
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const permissionState = await checkLocationPermission();
        setPermission(permissionState);
      } catch (error) {
        console.warn('Could not check location permission:', error);
      }
    };

    checkPermission();
  }, []);

  // Auto-start watching if requested
  useEffect(() => {
    if (options.watch && managerRef.current && !watching) {
      startWatching();
    }
  }, [options.watch]);

  // Get current position
  const getCurrentPosition = useCallback(async (): Promise<GeolocationPosition> => {
    if (!managerRef.current) {
      throw new Error('Geolocation manager not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const pos = await managerRef.current.getCurrentPosition();
      setPosition(pos);
      setLastUpdate(new Date());
      setLoading(false);
      return pos;
    } catch (err) {
      const error = err as GeolocationError;
      setError(error);
      setLoading(false);
      throw error;
    }
  }, []);

  // Start watching position
  const startWatching = useCallback(() => {
    if (!managerRef.current || watching) return;

    setWatching(true);
    setError(null);
    managerRef.current.startWatching();
  }, [watching]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (!managerRef.current || !watching) return;

    setWatching(false);
    managerRef.current.stopWatching();
  }, [watching]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get accuracy from current position
  const accuracy = position?.accuracy ?? null;

  return {
    // State
    position,
    error,
    loading,
    watching,
    permission,
    
    // Actions
    getCurrentPosition,
    startWatching,
    stopWatching,
    clearError,
    
    // Utilities
    isSupported,
    accuracy,
    lastUpdate,
  };
};

// Hook for distance calculation between two points
export const useDistanceCalculation = () => {
  const calculateDistance = useCallback((
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const formatDistance = useCallback((distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  }, []);

  return { calculateDistance, formatDistance };
};

// Hook for finding nearby points
export const useNearbyPoints = <T extends { latitude: number; longitude: number }>(
  points: T[],
  radiusMeters: number = 1000
) => {
  const { position } = useGeolocation();
  const { calculateDistance } = useDistanceCalculation();
  
  const nearbyPoints = useMemo(() => {
    if (!position || !points.length) return [];

    return points
      .map(point => ({
        ...point,
        distance: calculateDistance(
          position.latitude,
          position.longitude,
          point.latitude,
          point.longitude
        )
      }))
      .filter(point => point.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance);
  }, [position, points, radiusMeters, calculateDistance]);

  return nearbyPoints;
};

// Hook for location-based notifications
export const useLocationNotifications = (
  targetLocations: Array<{ 
    id: string;
    latitude: number; 
    longitude: number; 
    radius: number; 
    name: string;
  }>,
  onEnterLocation?: (location: any) => void,
  onExitLocation?: (location: any) => void
) => {
  const { position, watching, startWatching } = useGeolocation({ watch: true });
  const [enteredLocations, setEnteredLocations] = useState<Set<string>>(new Set());
  const previousPositionRef = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    if (!position || !targetLocations.length) return;

    const currentlyInside = new Set<string>();
    
    targetLocations.forEach(location => {
      const distance = calculateDistance(
        position.latitude,
        position.longitude,
        location.latitude,
        location.longitude
      );
      
      if (distance <= location.radius) {
        currentlyInside.add(location.id);
        
        // Check if this is a new entry
        if (!enteredLocations.has(location.id)) {
          onEnterLocation?.(location);
        }
      }
    });

    // Check for exits
    enteredLocations.forEach(locationId => {
      if (!currentlyInside.has(locationId)) {
        const location = targetLocations.find(l => l.id === locationId);
        if (location) {
          onExitLocation?.(location);
        }
      }
    });

    setEnteredLocations(currentlyInside);
    previousPositionRef.current = position;
  }, [position, targetLocations, enteredLocations, onEnterLocation, onExitLocation]);

  // Auto-start watching if not already
  useEffect(() => {
    if (!watching && targetLocations.length > 0) {
      startWatching();
    }
  }, [watching, targetLocations.length, startWatching]);

  return {
    enteredLocations: Array.from(enteredLocations),
    currentPosition: position,
    isWatching: watching,
  };
};

// Hook for geocoding (converting addresses to coordinates)
export const useGeocoding = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodeAddress = useCallback(async (address: string): Promise<{
    latitude: number;
    longitude: number;
    formattedAddress: string;
  } | null> => {
    if (!window.google?.maps) {
      setError('Google Maps not loaded');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const geocoder = new google.maps.Geocoder();
      
      return new Promise((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          setLoading(false);
          
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            resolve({
              latitude: location.lat(),
              longitude: location.lng(),
              formattedAddress: results[0].formatted_address,
            });
          } else {
            const errorMessage = `Geocoding failed: ${status}`;
            setError(errorMessage);
            reject(new Error(errorMessage));
          }
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Geocoding error';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  const reverseGeocode = useCallback(async (
    latitude: number, 
    longitude: number
  ): Promise<string | null> => {
    if (!window.google?.maps) {
      setError('Google Maps not loaded');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const geocoder = new google.maps.Geocoder();
      const latlng = new google.maps.LatLng(latitude, longitude);
      
      return new Promise((resolve, reject) => {
        geocoder.geocode({ location: latlng }, (results, status) => {
          setLoading(false);
          
          if (status === 'OK' && results && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            const errorMessage = `Reverse geocoding failed: ${status}`;
            setError(errorMessage);
            reject(new Error(errorMessage));
          }
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Reverse geocoding error';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    geocodeAddress,
    reverseGeocode,
    loading,
    error,
  };
};

// Utility function (needed for imports)
import { useMemo } from 'react';

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
