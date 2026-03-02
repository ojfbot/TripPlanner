import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ItineraryLens, SpecialistMode, Granularity, TripItinerary } from '../../types/itinerary';

export interface ItineraryState {
  // Current itinerary data
  currentItinerary: TripItinerary | null;
  
  // UI state
  activeLens: ItineraryLens;
  selectedDayIndex: number | null; // null = no day selected
  activeSpecialistMode: SpecialistMode | null;
  granularity: Granularity;
  
  // Loading state
  isLoading: boolean;
  error: string | null;
}

const initialState: ItineraryState = {
  currentItinerary: null,
  activeLens: 'overview',
  selectedDayIndex: null,
  activeSpecialistMode: null,
  granularity: 'auto',
  isLoading: false,
  error: null,
};

const itinerarySlice = createSlice({
  name: 'itinerary',
  initialState,
  reducers: {
    setCurrentItinerary: (state, action: PayloadAction<TripItinerary | null>) => {
      state.currentItinerary = action.payload;
    },
    setActiveLens: (state, action: PayloadAction<ItineraryLens>) => {
      state.activeLens = action.payload;
      // Reset dependent state when changing lens
      if (action.payload === 'overview') {
        state.selectedDayIndex = null;
        state.activeSpecialistMode = null;
      }
    },
    setSelectedDayIndex: (state, action: PayloadAction<number | null>) => {
      state.selectedDayIndex = action.payload;
      // When selecting a day, switch to dayWeek lens
      if (action.payload !== null && state.activeLens === 'overview') {
        state.activeLens = 'dayWeek';
      }
    },
    setActiveSpecialistMode: (state, action: PayloadAction<SpecialistMode | null>) => {
      state.activeSpecialistMode = action.payload;
      // When selecting a specialist mode, switch to specialist lens
      if (action.payload !== null) {
        state.activeLens = 'specialist';
      }
    },
    setGranularity: (state, action: PayloadAction<Granularity>) => {
      state.granularity = action.payload;
    },
    backToOverview: (state) => {
      state.activeLens = 'overview';
      state.selectedDayIndex = null;
      state.activeSpecialistMode = null;
    },
  },
});

export const {
  setCurrentItinerary,
  setActiveLens,
  setSelectedDayIndex,
  setActiveSpecialistMode,
  setGranularity,
  backToOverview,
} = itinerarySlice.actions;

export default itinerarySlice.reducer;
