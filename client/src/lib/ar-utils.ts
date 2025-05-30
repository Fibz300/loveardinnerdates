export interface ArMarker {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  type: "user" | "story" | "interaction";
  data: any;
}

export interface ArScene {
  markers: ArMarker[];
  camera: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  };
}

export class ArUtils {
  private scene: ArScene;
  private deviceOrientation: { alpha: number; beta: number; gamma: number };

  constructor() {
    this.scene = {
      markers: [],
      camera: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      },
    };
    this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
  }

  // Convert GPS coordinates to AR world coordinates
  gpsToWorldCoordinates(
    userLat: number,
    userLng: number,
    targetLat: number,
    targetLng: number,
    userHeading: number = 0
  ): { x: number; y: number; z: number } {
    // Earth radius in meters
    const earthRadius = 6371000;

    // Convert degrees to radians
    const userLatRad = (userLat * Math.PI) / 180;
    const userLngRad = (userLng * Math.PI) / 180;
    const targetLatRad = (targetLat * Math.PI) / 180;
    const targetLngRad = (targetLng * Math.PI) / 180;

    // Calculate distance using Haversine formula
    const deltaLat = targetLatRad - userLatRad;
    const deltaLng = targetLngRad - userLngRad;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(userLatRad) *
        Math.cos(targetLatRad) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;

    // Calculate bearing
    const bearing = Math.atan2(
      Math.sin(deltaLng) * Math.cos(targetLatRad),
      Math.cos(userLatRad) * Math.sin(targetLatRad) -
        Math.sin(userLatRad) * Math.cos(targetLatRad) * Math.cos(deltaLng)
    );

    // Convert bearing to degrees and adjust for user heading
    const bearingDegrees = (bearing * 180) / Math.PI;
    const adjustedBearing = bearingDegrees - userHeading;

    // Convert to world coordinates (WebGL coordinate system)
    const x = distance * Math.sin((adjustedBearing * Math.PI) / 180);
    const z = -distance * Math.cos((adjustedBearing * Math.PI) / 180);
    const y = 0; // Assume same altitude for now

    return { x, y, z };
  }

  // Update device orientation
  updateDeviceOrientation(alpha: number, beta: number, gamma: number) {
    this.deviceOrientation = { alpha, beta, gamma };
    this.updateCameraRotation();
  }

  // Update camera rotation based on device orientation
  private updateCameraRotation() {
    const { alpha, beta, gamma } = this.deviceOrientation;

    // Convert device orientation to camera rotation
    // Alpha: rotation around z-axis (compass)
    // Beta: rotation around x-axis (tilt forward/backward)
    // Gamma: rotation around y-axis (tilt left/right)

    this.scene.camera.rotation = {
      x: (beta * Math.PI) / 180,
      y: (alpha * Math.PI) / 180,
      z: (gamma * Math.PI) / 180,
    };
  }

  // Add AR marker to scene
  addMarker(marker: ArMarker) {
    const existingIndex = this.scene.markers.findIndex(m => m.id === marker.id);
    if (existingIndex >= 0) {
      this.scene.markers[existingIndex] = marker;
    } else {
      this.scene.markers.push(marker);
    }
  }

  // Remove AR marker from scene
  removeMarker(markerId: string) {
    this.scene.markers = this.scene.markers.filter(m => m.id !== markerId);
  }

  // Get visible markers based on camera frustum
  getVisibleMarkers(fov: number = 60, near: number = 0.1, far: number = 1000): ArMarker[] {
    const { camera } = this.scene;
    const fovRad = (fov * Math.PI) / 180;

    return this.scene.markers.filter(marker => {
      // Calculate distance from camera
      const dx = marker.position.x - camera.position.x;
      const dy = marker.position.y - camera.position.y;
      const dz = marker.position.z - camera.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Check if within distance range
      if (distance < near || distance > far) {
        return false;
      }

      // Simple frustum culling (basic implementation)
      const angle = Math.atan2(Math.sqrt(dx * dx + dz * dz), dy);
      return Math.abs(angle) < fovRad / 2;
    });
  }

  // Convert 3D world position to 2D screen position
  worldToScreen(
    worldPos: { x: number; y: number; z: number },
    screenWidth: number,
    screenHeight: number,
    fov: number = 60
  ): { x: number; y: number; depth: number } | null {
    const { camera } = this.scene;

    // Transform world position relative to camera
    const relativePos = {
      x: worldPos.x - camera.position.x,
      y: worldPos.y - camera.position.y,
      z: worldPos.z - camera.position.z,
    };

    // Apply camera rotation (simplified)
    const rotatedPos = this.rotatePoint(relativePos, camera.rotation);

    // Check if point is behind camera
    if (rotatedPos.z > 0) {
      return null;
    }

    // Project to screen coordinates
    const fovRad = (fov * Math.PI) / 180;
    const scale = Math.tan(fovRad / 2);

    const screenX = ((rotatedPos.x / (-rotatedPos.z * scale)) + 1) / 2 * screenWidth;
    const screenY = (1 - (rotatedPos.y / (-rotatedPos.z * scale))) / 2 * screenHeight;

    return {
      x: screenX,
      y: screenY,
      depth: -rotatedPos.z,
    };
  }

  // Rotate point around origin
  private rotatePoint(
    point: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number }
  ): { x: number; y: number; z: number } {
    let { x, y, z } = point;
    const { x: rx, y: ry, z: rz } = rotation;

    // Rotate around X axis
    const cosX = Math.cos(rx);
    const sinX = Math.sin(rx);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    y = y1;
    z = z1;

    // Rotate around Y axis
    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);
    const x1 = x * cosY + z * sinY;
    const z2 = -x * sinY + z * cosY;
    x = x1;
    z = z2;

    // Rotate around Z axis
    const cosZ = Math.cos(rz);
    const sinZ = Math.sin(rz);
    const x2 = x * cosZ - y * sinZ;
    const y2 = x * sinZ + y * cosZ;
    x = x2;
    y = y2;

    return { x, y, z };
  }

  // Calculate optimal marker scale based on distance
  calculateMarkerScale(distance: number, baseScale: number = 1): number {
    // Scale inversely with distance, with minimum and maximum limits
    const minScale = 0.5;
    const maxScale = 3;
    const scaleFactor = baseScale * (100 / Math.max(distance, 10));
    
    return Math.min(Math.max(scaleFactor, minScale), maxScale);
  }

  // Check if two GPS coordinates are within a certain distance
  isWithinDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
    maxDistanceMeters: number
  ): boolean {
    const distance = this.calculateDistance(lat1, lng1, lat2, lng2);
    return distance <= maxDistanceMeters;
  }

  // Calculate distance between two GPS coordinates (Haversine formula)
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const earthRadius = 6371000; // meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  // Get current scene
  getScene(): ArScene {
    return this.scene;
  }

  // Clear all markers
  clearMarkers() {
    this.scene.markers = [];
  }

  // Update camera position
  updateCameraPosition(position: { x: number; y: number; z: number }) {
    this.scene.camera.position = position;
  }
}

export const arUtils = new ArUtils();
