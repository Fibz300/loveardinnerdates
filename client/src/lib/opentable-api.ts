// OpenTable API integration for restaurant reservations
export interface OpenTableVenue {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  cuisineType: string;
  priceRange: string;
  rating: number;
  imageUrl: string;
  phone: string;
  website: string;
  hours: {
    [key: string]: string;
  };
}

export interface OpenTableAvailability {
  venueId: string;
  date: string;
  time: string;
  partySize: number;
  available: boolean;
  reservationToken?: string;
}

export interface OpenTableReservation {
  id: string;
  venueId: string;
  venueName: string;
  date: string;
  time: string;
  partySize: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialRequests?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  confirmationNumber: string;
}

class OpenTableAPI {
  private apiKey: string;
  private baseUrl = 'https://api.opentable.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Search for restaurants near a location
  async searchVenues(
    latitude: number,
    longitude: number,
    radius: number = 5,
    cuisineType?: string,
    priceRange?: string
  ): Promise<OpenTableVenue[]> {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
      radius: radius.toString(),
      ...(cuisineType && { cuisine: cuisineType }),
      ...(priceRange && { price: priceRange }),
    });

    const response = await fetch(`${this.baseUrl}/restaurants?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenTable API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.restaurants.map((restaurant: any) => ({
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      cuisineType: restaurant.cuisine_type,
      priceRange: restaurant.price_range,
      rating: restaurant.rating,
      imageUrl: restaurant.image_url,
      phone: restaurant.phone,
      website: restaurant.website,
      hours: restaurant.hours,
    }));
  }

  // Get available time slots for a restaurant
  async getAvailability(
    venueId: string,
    date: string,
    partySize: number = 2
  ): Promise<OpenTableAvailability[]> {
    const params = new URLSearchParams({
      date,
      party_size: partySize.toString(),
    });

    const response = await fetch(
      `${this.baseUrl}/restaurants/${venueId}/availability?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenTable API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.availability.map((slot: any) => ({
      venueId,
      date,
      time: slot.time,
      partySize,
      available: slot.available,
      reservationToken: slot.reservation_token,
    }));
  }

  // Make a reservation
  async makeReservation(
    venueId: string,
    reservationToken: string,
    customerDetails: {
      name: string;
      email: string;
      phone: string;
      specialRequests?: string;
    }
  ): Promise<OpenTableReservation> {
    const response = await fetch(`${this.baseUrl}/reservations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurant_id: venueId,
        reservation_token: reservationToken,
        customer: customerDetails,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenTable API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      venueId: data.restaurant_id,
      venueName: data.restaurant_name,
      date: data.date,
      time: data.time,
      partySize: data.party_size,
      customerName: data.customer.name,
      customerEmail: data.customer.email,
      customerPhone: data.customer.phone,
      specialRequests: data.customer.special_requests,
      status: data.status,
      confirmationNumber: data.confirmation_number,
    };
  }

  // Cancel a reservation
  async cancelReservation(reservationId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/reservations/${reservationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  }

  // Get reservation details
  async getReservation(reservationId: string): Promise<OpenTableReservation> {
    const response = await fetch(`${this.baseUrl}/reservations/${reservationId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenTable API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      venueId: data.restaurant_id,
      venueName: data.restaurant_name,
      date: data.date,
      time: data.time,
      partySize: data.party_size,
      customerName: data.customer.name,
      customerEmail: data.customer.email,
      customerPhone: data.customer.phone,
      specialRequests: data.customer.special_requests,
      status: data.status,
      confirmationNumber: data.confirmation_number,
    };
  }
}

// Singleton instance
let openTableAPI: OpenTableAPI | null = null;

export const getOpenTableAPI = (): OpenTableAPI => {
  const apiKey = import.meta.env.VITE_OPENTABLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenTable API key is required. Please set VITE_OPENTABLE_API_KEY environment variable.');
  }

  if (!openTableAPI) {
    openTableAPI = new OpenTableAPI(apiKey);
  }

  return openTableAPI;
};

// Utility functions for venue filtering and sorting
export const filterVenuesByExperience = (
  venues: OpenTableVenue[], 
  experienceType: 'dinner' | 'drinks' | 'coffee'
): OpenTableVenue[] => {
  const cuisineFilters = {
    dinner: ['american', 'italian', 'french', 'japanese', 'mexican', 'indian', 'chinese'],
    drinks: ['bar', 'lounge', 'pub', 'cocktail'],
    coffee: ['cafe', 'coffee', 'bakery', 'breakfast']
  };

  const relevantCuisines = cuisineFilters[experienceType] || [];
  
  return venues.filter(venue => 
    relevantCuisines.some(cuisine => 
      venue.cuisineType.toLowerCase().includes(cuisine)
    )
  );
};

export const sortVenuesByDistance = (
  venues: OpenTableVenue[],
  userLat: number,
  userLng: number
): OpenTableVenue[] => {
  return venues.sort((a, b) => {
    const distanceA = getDistanceFromLatLonInKm(userLat, userLng, a.latitude, a.longitude);
    const distanceB = getDistanceFromLatLonInKm(userLat, userLng, b.latitude, b.longitude);
    return distanceA - distanceB;
  });
};

// Helper function to calculate distance between two coordinates
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}