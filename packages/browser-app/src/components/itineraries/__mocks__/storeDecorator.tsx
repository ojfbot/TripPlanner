import React from 'react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import itineraryReducer, { ItineraryState } from '../../../store/slices/itinerarySlice'
import type { TripItinerary, ItineraryLens, SpecialistMode, Granularity } from '../../../types/itinerary'

// Minimal mock reducers for slices the store expects
const noopReducer = (state = {}) => state

interface MockStoreOptions {
  currentItinerary?: TripItinerary | null
  activeLens?: ItineraryLens
  selectedDayIndex?: number | null
  activeSpecialistMode?: SpecialistMode | null
  granularity?: Granularity
}

export function createMockStore(options: MockStoreOptions = {}) {
  const {
    currentItinerary = null,
    activeLens = 'overview',
    selectedDayIndex = null,
    activeSpecialistMode = null,
    granularity = 'auto',
  } = options

  return configureStore({
    reducer: {
      navigation: noopReducer,
      chat: noopReducer,
      threads: noopReducer,
      documents: noopReducer,
      trip: noopReducer,
      itinerary: itineraryReducer,
      ui: noopReducer,
    },
    preloadedState: {
      itinerary: {
        currentItinerary,
        activeLens,
        selectedDayIndex,
        activeSpecialistMode,
        granularity,
        isLoading: false,
        error: null,
      } as ItineraryState,
    },
  })
}

export function withMockStore(options: MockStoreOptions = {}) {
  return function StoreDecorator(Story: React.ComponentType) {
    return (
      <Provider store={createMockStore(options)}>
        <Story />
      </Provider>
    )
  }
}
