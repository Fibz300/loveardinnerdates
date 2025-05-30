import { useState, useEffect, useCallback, useRef } from 'react';
import { arUtils, type ArMarker } from '@/lib/ar-utils';
import { useGeolocation } from './use-geolocation';

interface UseAROptions {
  enableDeviceOrientation?: boolean;
  maxDistance?: number; // Maximum distance for AR objects in meters
  onMarkerClick?: (marker: ArMarker) => void;
  onError?: (error: string) => void;
}

interface UseARReturn {
  // State
  isSupported: boolean;
  isActive: boolean;
  error: string | null;
  markers: ArMarker[];
  deviceOrientation: { alpha: number; beta: number; gamma: number };
  
  // Actions
  startAR: () => Promise<void>;
  stopAR: () => void;
  addMarker: (marker: ArMarker) => void;
  removeMarker: (markerId: string) => void;
  clearMarkers: () => void;
  
  // Camera
  stream: MediaStream | null;
  
  // Utilities
  getVisibleMarkers: () => ArMarker[];
  worldToScreen: (worldPos: { x: number; y: number; z: number }) => { x: number; y: number; depth: number } | null;
}

export const useAR = (options: UseAROptions = {}): UseARReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<ArMarker[]>([]);
  const [deviceOrientation, setDeviceOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const { position } = useGeolocation({ watch: true });
  const orientationListenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);
  const frameRequestRef = useRef<number | null>(null);

  // Check AR support on mount
  useEffect(() => {
    const checkSupport = () => {
      const hasCamera = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      const hasOrientation = 'DeviceOrientationEvent' in window;
      const hasWebGL = (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
        } catch {
          return false;
        }
      })();
      
      const supported = hasCamera && hasOrientation && hasWebGL;
      setIsSupported(supported);
      
      if (!supported) {
        setError('AR features require camera, device orientation, and WebGL support');
      }
    };

    checkSupport();
  }, []);

  // Update AR utils with current position
  useEffect(() => {
    if (position) {
      arUtils.updateCameraPosition({
        x: 0, // User is always at origin in AR coordinate system
        y: 0,
        z: 0
      });
    }
  }, [position]);

  // Start AR session
  const startAR = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      throw new Error('AR is not supported on this device');
    }

    if (isActive) {
      return;
    }

    try {
      setError(null);
      
      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);

      // Set up device orientation listener
      if (options.enableDeviceOrientation !== false) {
        const handleOrientationChange = (event: DeviceOrientationEvent) => {
          const alpha = event.alpha || 0;
          const beta = event.beta || 0;
          const gamma = event.gamma || 0;
          
          setDeviceOrientation({ alpha, beta, gamma });
          arUtils.updateDeviceOrientation(alpha, beta, gamma);
        };

        orientationListenerRef.current = handleOrientationChange;
        window.addEventListener('deviceorientation', handleOrientationChange);
      }

      setIsActive(true);
      
      // Start animation loop for AR updates
      const updateARFrame = () => {
        if (isActive) {
          // Update visible markers based on current view
          const visibleMarkers = arUtils.getVisibleMarkers();
          setMarkers(visibleMarkers);
          
          frameRequestRef.current = requestAnimationFrame(updateARFrame);
        }
      };
      
      frameRequestRef.current = requestAnimationFrame(updateARFrame);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start AR';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw new Error(errorMessage);
    }
  }, [isSupported, isActive, options]);

  // Stop AR session
  const stopAR = useCallback(() => {
    if (!isActive) return;

    // Stop camera stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    // Remove orientation listener
    if (orientationListenerRef.current) {
      window.removeEventListener('deviceorientation', orientationListenerRef.current);
      orientationListenerRef.current = null;
    }

    // Cancel animation frame
    if (frameRequestRef.current) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }

    setIsActive(false);
    setDeviceOrientation({ alpha: 0, beta: 0, gamma: 0 });
  }, [isActive, stream]);

  // Add marker to AR scene
  const addMarker = useCallback((marker: ArMarker) => {
    arUtils.addMarker(marker);
    // Trigger re-render by updating state
    setMarkers(prev => {
      const filtered = prev.filter(m => m.id !== marker.id);
      return [...filtered, marker];
    });
  }, []);

  // Remove marker from AR scene
  const removeMarker = useCallback((markerId: string) => {
    arUtils.removeMarker(markerId);
    setMarkers(prev => prev.filter(m => m.id !== markerId));
  }, []);

  // Clear all markers
  const clearMarkers = useCallback(() => {
    arUtils.clearMarkers();
    setMarkers([]);
  }, []);

  // Get visible markers
  const getVisibleMarkers = useCallback(() => {
    return arUtils.getVisibleMarkers();
  }, []);

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback((
    worldPos: { x: number; y: number; z: number }
  ) => {
    if (typeof window === 'undefined') return null;
    
    return arUtils.worldToScreen(
      worldPos,
      window.innerWidth,
      window.innerHeight
    );
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAR();
    };
  }, [stopAR]);

  return {
    // State
    isSupported,
    isActive,
    error,
    markers,
    deviceOrientation,
    
    // Actions
    startAR,
    stopAR,
    addMarker,
    removeMarker,
    clearMarkers,
    
    // Camera
    stream,
    
    // Utilities
    getVisibleMarkers,
    worldToScreen,
  };
};

// Hook for AR object tracking
export const useARObjectTracking = (
  objects: Array<{
    id: string;
    latitude: number;
    longitude: number;
    type: 'user' | 'story' | 'poi';
    data: any;
  }>,
  userPosition: { latitude: number; longitude: number } | null
) => {
  const [arMarkers, setArMarkers] = useState<ArMarker[]>([]);
  const { addMarker, removeMarker } = useAR();

  useEffect(() => {
    if (!userPosition || !objects.length) {
      setArMarkers([]);
      return;
    }

    const newMarkers: ArMarker[] = objects.map(obj => {
      // Convert GPS coordinates to AR world coordinates
      const worldPos = arUtils.gpsToWorldCoordinates(
        userPosition.latitude,
        userPosition.longitude,
        obj.latitude,
        obj.longitude
      );

      // Calculate distance for scaling
      const distance = arUtils.calculateDistance(
        userPosition.latitude,
        userPosition.longitude,
        obj.latitude,
        obj.longitude
      );

      const scale = arUtils.calculateMarkerScale(distance);

      return {
        id: obj.id,
        position: worldPos,
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: scale, y: scale, z: scale },
        type: obj.type,
        data: {
          ...obj.data,
          distance,
          originalObject: obj
        }
      };
    });

    setArMarkers(newMarkers);

    // Update AR utils with new markers
    newMarkers.forEach(marker => addMarker(marker));

    // Cleanup removed markers
    return () => {
      newMarkers.forEach(marker => removeMarker(marker.id));
    };
  }, [objects, userPosition, addMarker, removeMarker]);

  return arMarkers;
};

// Hook for AR camera controls
export const useARCamera = () => {
  const [cameraConfig, setCameraConfig] = useState({
    facingMode: 'environment' as 'user' | 'environment',
    resolution: { width: 1280, height: 720 },
    frameRate: 30,
  });

  const switchCamera = useCallback(() => {
    setCameraConfig(prev => ({
      ...prev,
      facingMode: prev.facingMode === 'user' ? 'environment' : 'user'
    }));
  }, []);

  const setResolution = useCallback((width: number, height: number) => {
    setCameraConfig(prev => ({
      ...prev,
      resolution: { width, height }
    }));
  }, []);

  const setFrameRate = useCallback((frameRate: number) => {
    setCameraConfig(prev => ({
      ...prev,
      frameRate
    }));
  }, []);

  return {
    cameraConfig,
    switchCamera,
    setResolution,
    setFrameRate,
  };
};

// Hook for AR performance monitoring
export const useARPerformance = () => {
  const [performance, setPerformance] = useState({
    fps: 0,
    frameTime: 0,
    visibleMarkers: 0,
    lastUpdate: Date.now(),
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(0);

  const updatePerformance = useCallback((visibleMarkerCount: number) => {
    const now = performance.now();
    const frameTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    frameTimesRef.current.push(frameTime);
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
    const fps = 1000 / avgFrameTime;

    setPerformance({
      fps: Math.round(fps),
      frameTime: Math.round(avgFrameTime),
      visibleMarkers: visibleMarkerCount,
      lastUpdate: Date.now(),
    });
  }, []);

  return {
    performance,
    updatePerformance,
  };
};

// Hook for AR gesture recognition
export const useARGestures = (
  onTap?: (position: { x: number; y: number }) => void,
  onPinch?: (scale: number) => void,
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void
) => {
  const [isGestureActive, setIsGestureActive] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (touch && event.touches.length === 1) {
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
      setIsGestureActive(true);
    } else if (event.touches.length === 2) {
      // Pinch gesture start
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      pinchDistanceRef.current = distance;
    }
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (event.touches.length === 2 && pinchDistanceRef.current) {
      // Pinch gesture
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const scale = distance / pinchDistanceRef.current;
      onPinch?.(scale);
    }
  }, [onPinch]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = event.changedTouches[0];
    const touchStart = touchStartRef.current;
    
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;
    
    // Determine if it's a tap or swipe
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 300) {
      // Tap
      onTap?.({ x: touch.clientX, y: touch.clientY });
    } else if (deltaTime < 500) {
      // Swipe
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      if (absX > absY) {
        onSwipe?.(deltaX > 0 ? 'right' : 'left');
      } else {
        onSwipe?.(deltaY > 0 ? 'down' : 'up');
      }
    }

    touchStartRef.current = null;
    pinchDistanceRef.current = null;
    setIsGestureActive(false);
  }, [onTap, onSwipe]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isGestureActive,
  };
};
