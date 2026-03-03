import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../api/client';

export interface Thread {
  threadId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface ThreadsState {
  threads: Thread[];
  currentThreadId: string | null;
  isLoading: boolean;
  isCreatingThread: boolean;
  error: string | null;
}

const initialState: ThreadsState = {
  threads: [],
  currentThreadId: null,
  isLoading: false,
  isCreatingThread: false,
  error: null,
};

export const fetchThreads = createAsyncThunk(
  'threads/fetchThreads',
  async ({ userId }: { userId: string }) => {
    const response = await apiClient.get(`/api/v1/threads?userId=${userId}`);
    return response.data;
  }
);

export const createThread = createAsyncThunk(
  'threads/createThread',
  async ({ userId, title }: { userId: string; title: string }) => {
    const response = await apiClient.post('/api/v1/threads', { userId, title });
    return response.data;
  }
);

export const deleteThread = createAsyncThunk(
  'threads/deleteThread',
  async (threadId: string) => {
    await apiClient.delete(`/api/v1/threads/${threadId}`);
    return threadId;
  }
);

export const fetchThread = createAsyncThunk(
  'threads/fetchThread',
  async (threadId: string) => {
    const response = await apiClient.get(`/api/v1/threads/${threadId}`);
    return response.data;
  }
);

const threadsSlice = createSlice({
  name: 'threads',
  initialState,
  reducers: {
    setCurrentThreadId: (state, action: PayloadAction<string | null>) => {
      state.currentThreadId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchThreads.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchThreads.fulfilled, (state, action) => {
        state.isLoading = false;
        if (!Array.isArray(action.payload)) {
          // API returned a non-array (e.g. error object with 200 status) — surface it
          // rather than silently showing an empty list with no error message.
          // Guard also covers MF remote: relative /api calls hit the shell's Vite
          // catch-all and return HTML (200 OK) before the API is reachable.
          state.error = 'Unexpected response from server';
          return;
        }
        state.threads = action.payload;
        if (!state.currentThreadId && action.payload.length > 0) {
          state.currentThreadId = action.payload[0].threadId;
        }
      })
      .addCase(fetchThreads.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch threads';
      })
      .addCase(createThread.pending, (state) => {
        state.isCreatingThread = true;
        state.error = null;
      })
      .addCase(createThread.fulfilled, (state, action) => {
        state.isCreatingThread = false;
        state.threads.unshift(action.payload);
        state.currentThreadId = action.payload.threadId;
      })
      .addCase(createThread.rejected, (state, action) => {
        state.isCreatingThread = false;
        state.error = action.error.message || 'Failed to create thread';
      })
      .addCase(deleteThread.fulfilled, (state, action) => {
        state.threads = state.threads.filter((t) => t.threadId !== action.payload);
        if (state.currentThreadId === action.payload) {
          state.currentThreadId = state.threads.length > 0 ? state.threads[0].threadId : null;
        }
      });
  },
});

export const { setCurrentThreadId } = threadsSlice.actions;
export default threadsSlice.reducer;
