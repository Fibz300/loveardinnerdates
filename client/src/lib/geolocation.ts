export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface LocationUpdateCallback {
  (position: GeolocationPosition): void;
}

export interface LocationErrorCallback {
  (error: GeolocationError): void;
}

export class GeolocationManager {
  private watchId: number | null = null;
  private lastKnownPosition: GeolocationPosition | null = null;
  private isWatching: boolean = false;
  private options: GeolocationOptions;

  // Event callbacks
  public onLocationUpdate: LocationUpdateCallback | null = null;
  public onLocationError: LocationErrorCallback | null = null;

  constructor(options: GeolocationOptions = {}) {
    this.options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options
    };
  }

  // Check if geolocation is supported
  public static isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  // Get current position once
  public async getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!GeolocationManager.isSupported()) {
        reject(this.createError(0, 'Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geoPosition = this.convertPosition(position);
          this.lastKnownPosition = geoPosition;
          resolve(geoPosition);
        },
        (error) => {
          const geoError = this.convertError(error);
          reject(geoError);
        },
        this.options
      );
    });
  }

  // Start watching position changes
  public startWatching(): void {
    if (!GeolocationManager.isSupported()) {
      this.onLocationError?.(this.createError(0, 'Geolocation is not supported'));
      return;
    }

    if (this.isWatching) {
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const geoPosition = this.convertPosition(position);
        this.lastKnownPosition = geoPosition;
        this.onLocationUpdate?.(geoPosition);
      },
      (error) => {
        const geoError = this.convertError(error);
        this.onLocationError?.(geoError);
      },
      this.options
    );

    this.isWatching = true;
  }

  // Stop watching position changes
  public stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
    }
  }

  // Get last known position
  public getLastKnownPosition(): GeolocationPosition | null {
    return this.lastKnownPosition;
  }

  // Check if currently watching
  public isCurrentlyWatching(): boolean {
    return this.isWatching;
  }

  // Convert native position to our format
  private convertPosition(position: Position): GeolocationPosition {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude || undefined,
      altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed || undefined,
      timestamp: position.timestamp
    };
  }

  // Convert native error to our format
  private convertError(error: GeolocationPositionError): GeolocationError {
    let message: string;
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location access denied by user';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out';
        break;
      default:
        message = 'Unknown geolocation error';
    }

    return {
      code: error.code,
      message: message
    };
  }

  // Create custom error
  private createError(code: number, message: string): GeolocationError {
    return { code, message };
  }

  // Update options
  public updateOptions(newOptions: GeolocationOptions): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart watching if currently active
    if (this.isWatching) {
      this.stopWatching();
      this.startWatching();
    }
  }

  // Cleanup
  public destroy(): void {
    this.stopWatching();
    this.onLocationUpdate = null;
    this.onLocationError = null;
  }
}

// Utility functions for geolocation calculations

// Calculate distance between two points using Haversine formula
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

// Calculate bearing between two points
export const calculateBearing = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const dLng = toRadians(lng2 - lng1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
           Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  const bearing = Math.atan2(y, x);
  return (toDegrees(bearing) + 360) % 360;
};

// Check if a point is within a circular area
export const isWithinRadius = (
  centerLat: number,
  centerLng: number,
  pointLat: number,
  pointLng: number,
  radiusMeters: number
): boolean => {
  const distance = calculateDistance(centerLat, centerLng, pointLat, pointLng);
  return distance <= radiusMeters;
};

// Find points within a radius
export const findPointsWithinRadius = <T extends { latitude: number; longitude: number }>(
  centerLat: number,
  centerLng: number,
  points: T[],
  radiusMeters: number
): T[] => {
  return points.filter(point =>
    isWithinRadius(centerLat, centerLng, point.latitude, point.longitude, radiusMeters)
  );
};

// Calculate destination point given starting point, bearing, and distance
export const calculateDestination = (
  lat: number,
  lng: number,
  bearingDegrees: number,
  distanceMeters: number
): { latitude: number; longitude: number } => {
  const R = 6371000; // Earth's radius in meters
  const bearing = toRadians(bearingDegrees);
  const latRad = toRadians(lat);
  const lngRad = toRadians(lng);
  
  const destLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distanceMeters / R) +
    Math.cos(latRad) * Math.sin(distanceMeters / R) * Math.cos(bearing)
  );
  
  const destLngRad = lngRad + Math.atan2(
    Math.sin(bearing) * Math.sin(distanceMeters / R) * Math.cos(latRad),
    Math.cos(distanceMeters / R) - Math.sin(latRad) * Math.sin(destLatRad)
  );
  
  return {
    latitude: toDegrees(destLatRad),
    longitude: toDegrees(destLngRad)
  };
};

// Get bounds for a given center point and radius
export const getBounds = (
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): {
  north: number;
  south: number;
  east: number;
  west: number;
} => {
  const north = calculateDestination(centerLat, centerLng, 0, radiusMeters);
  const south = calculateDestination(centerLat, centerLng, 180, radiusMeters);
  const east = calculateDestination(centerLat, centerLng, 90, radiusMeters);
  const west = calculateDestination(centerLat, centerLng, 270, radiusMeters);
  
  return {
    north: north.latitude,
    south: south.latitude,
    east: east.longitude,
    west: west.longitude
  };
};

// Format coordinates for display
export const formatCoordinates = (
  lat: number,
  lng: number,
  precision: number = 6
): string => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  
  return `${Math.abs(lat).toFixed(precision)}°${latDir}, ${Math.abs(lng).toFixed(precision)}°${lngDir}`;
};

// Check location permission status
export const checkLocationPermission = async (): Promise<PermissionState> => {
  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state;
  } catch (error) {
    // Fallback for browsers that don't support permissions API
    return 'prompt';
  }
};

// Request location permission
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const position = await navigator.geolocation.getCurrentPosition(
      () => {},
      () => {},
      { timeout: 1000 }
    );
    return true;
  } catch (error) {
    return false;
  }
};

// Utility helper functions
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

const toDegrees = (radians: number): number => {
  return radians * (180 / Math.PI);
};

// Validate coordinates
export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  );
};

// Convert coordinates to different formats
export const coordinateFormats = {
  // Decimal degrees (default)
  toDecimal: (lat: number, lng: number) => ({ lat, lng }),
  
  // Degrees, minutes, seconds
  toDMS: (lat: number, lng: number) => {
    const formatDMS = (coord: number, isLatitude: boolean) => {
      const absolute = Math.abs(coord);
      const degrees = Math.floor(absolute);
      const minutes = Math.floor((absolute - degrees) * 60);
      const seconds = ((absolute - degrees - minutes / 60) * 3600).toFixed(2);
      const direction = coord >= 0 
        ? (isLatitude ? 'N' : 'E') 
        : (isLatitude ? 'S' : 'W');
      
      return `${degrees}°${minutes}'${seconds}"${direction}`;
    };
    
    return {
      latitude: formatDMS(lat, true),
      longitude: formatDMS(lng, false)
    };
  }
};
