import { configureStore } from '@reduxjs/toolkit';
import navigationReducer from './slices/navigationSlice';
import chatReducer from './slices/chatSlice';
import threadsReducer from './slices/threadsSlice';
import documentsReducer from './slices/documentsSlice';
import tripReducer from './slices/tripSlice';
import itineraryReducer from './slices/itinerarySlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    navigation: navigationReducer,
    chat: chatReducer,
    threads: threadsReducer,
    documents: documentsReducer,
    trip: tripReducer,
    itinerary: itineraryReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
