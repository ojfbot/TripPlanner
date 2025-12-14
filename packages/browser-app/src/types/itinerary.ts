/**
 * Itinerary types for TripPlanner
 */

export type ItineraryItemCategory = 'activity' | 'transit' | 'meal' | 'reservation' | 'lodging';

export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled' | 'needs_attention';

export interface ItineraryItem {
  id: string;
  dayIndex: number; // 0-indexed day of trip
  startTime?: string; // ISO timestamp or time string
  endTime?: string;
  category: ItineraryItemCategory;
  title: string;
  description?: string;
  location?: string;
  
  // Transit-specific
  transitMode?: 'flight' | 'train' | 'bus' | 'car' | 'ferry' | 'other';
  fromLocation?: string;
  toLocation?: string;
  
  // Meal-specific
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  cuisine?: string;
  
  // Reservation-specific
  vendor?: string;
  confirmationNumber?: string;
  status?: ReservationStatus;
  cost?: number;
  currency?: string;
  
  // Lodging-specific
  checkIn?: string;
  checkOut?: string;
  address?: string;
  phone?: string;
  
  // General metadata
  notes?: string;
  url?: string;
}

export interface TripItinerary {
  id: string;
  userId: string;
  title: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  destinations: string[];
  items: ItineraryItem[];
  createdAt: string;
  updatedAt: string;
}

// UI state types
export type ItineraryLens = 'overview' | 'wholeTrip' | 'dayWeek' | 'specialist';
export type SpecialistMode = 'transit' | 'meals' | 'reservations' | 'lodging';
export type Granularity = 'auto' | 'hourly' | 'daily' | 'weekly';
