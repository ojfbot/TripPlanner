import { configureStore } from '@reduxjs/toolkit';
import navigationReducer from './slices/navigationSlice';
import chatReducer from './slices/chatSlice';
import threadsReducer from './slices/threadsSlice';

export const store = configureStore({
  reducer: {
    navigation: navigationReducer,
    chat: chatReducer,
    threads: threadsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
