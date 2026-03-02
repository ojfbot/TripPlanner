import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

export interface ExtractedTripData {
  destinations: string[];
  dates?: {
    start?: string;
    end?: string;
    flexible: boolean;
  };
  travelers: {
    adults: number;
    children: number;
    infants: number;
  };
  budget?: {
    amount?: number;
    currency?: string;
    flexibility?: 'strict' | 'flexible' | 'very_flexible';
  };
  preferences: {
    accommodation?: string[];
    activities?: string[];
    transportation?: string[];
    dining?: string[];
  };
  constraints?: string[];
  keyTopics: string[];
  summary: string;
}

export interface TripState {
  title: string; // e.g., "Christmas in England"
  shortTitle: string; // Condensed version for smaller areas
  extractedData: ExtractedTripData | null;
  isExtracting: boolean;
  extractionError: string | null;
  documentId: string | null; // Link to imported document
}

const initialState: TripState = {
  title: 'TripPlanner',
  shortTitle: 'TripPlanner',
  extractedData: null,
  isExtracting: false,
  extractionError: null,
  documentId: null,
};

// Async thunk to extract trip data from conversation
export const extractTripFromConversation = createAsyncThunk(
  'trip/extractFromConversation',
  async ({ userId, content, documentId }: { userId: string; content: string; documentId?: string }) => {
    // First, import the conversation if documentId not provided
    let docId = documentId;
    if (!docId) {
      const importResponse = await axios.post('/api/v1/integrations/chatgpt/import', {
        userId,
        content,
      });
      docId = importResponse.data.documentId;
    }

    // Extract trip data (TODO: implement extraction endpoint)
    // For now, we'll parse basic info from the conversation
    const response = await axios.post('/api/v1/integrations/chatgpt/extract-trip', {
      content,
    });

    return {
      extractedData: response.data,
      documentId: docId,
    };
  }
);

export const extractTripFromFile = createAsyncThunk(
  'trip/extractFromFile',
  async ({ userId, file }: { userId: string; file: File }) => {
    // Import the file
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('transcript', file);

    const importResponse = await axios.post('/api/v1/integrations/chatgpt/import/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const docId = importResponse.data.documentId;

    // Read file content for extraction
    const content = await file.text();

    // Extract trip data
    const response = await axios.post('/api/v1/integrations/chatgpt/extract-trip', {
      content,
    });

    return {
      extractedData: response.data,
      documentId: docId,
    };
  }
);

const tripSlice = createSlice({
  name: 'trip',
  initialState,
  reducers: {
    setTripTitle: (state, action: PayloadAction<string>) => {
      state.title = action.payload;
      // Generate short title (first 20 chars + ellipsis if longer)
      state.shortTitle = action.payload.length > 20
        ? action.payload.substring(0, 20) + '...'
        : action.payload;
    },
    setTripData: (state, action: PayloadAction<ExtractedTripData>) => {
      state.extractedData = action.payload;

      // Generate title from extracted data
      const data = action.payload;
      const destination = data.destinations?.[0] || 'Trip';
      const season = data.keyTopics?.find((t: string) =>
        ['christmas', 'summer', 'winter', 'spring', 'fall', 'holiday'].some((s: string) =>
          t.toLowerCase().includes(s)
        )
      );

      const titleParts = season ? [season, 'in', destination] : [destination];
      const fullTitle = titleParts.join(' ');

      state.title = `TripPlanner - ${fullTitle}`;
      state.shortTitle = fullTitle.length > 20
        ? fullTitle.substring(0, 20) + '...'
        : fullTitle;
    },
    clearTripData: (state) => {
      state.title = 'TripPlanner';
      state.shortTitle = 'TripPlanner';
      state.extractedData = null;
      state.documentId = null;
      state.extractionError = null;
    },
  },
  extraReducers: (builder) => {
    // Extract from conversation
    builder
      .addCase(extractTripFromConversation.pending, (state) => {
        state.isExtracting = true;
        state.extractionError = null;
      })
      .addCase(extractTripFromConversation.fulfilled, (state, action) => {
        state.isExtracting = false;
        state.extractedData = action.payload.extractedData;
        state.documentId = action.payload.documentId || null;

        // Generate title from extracted data
        if (action.payload.extractedData) {
          const data = action.payload.extractedData;
          const destination = data.destinations?.[0] || 'Trip';
          const season = data.keyTopics?.find((t: string) =>
            ['christmas', 'summer', 'winter', 'spring', 'fall', 'holiday'].some((s: string) =>
              t.toLowerCase().includes(s)
            )
          );

          const titleParts = season ? [season, 'in', destination] : [destination];
          const fullTitle = titleParts.join(' ');

          state.title = `TripPlanner - ${fullTitle}`;
          state.shortTitle = fullTitle.length > 20
            ? fullTitle.substring(0, 20) + '...'
            : fullTitle;
        }
      })
      .addCase(extractTripFromConversation.rejected, (state, action) => {
        state.isExtracting = false;
        state.extractionError = action.error.message || 'Failed to extract trip data';
      });

    // Extract from file
    builder
      .addCase(extractTripFromFile.pending, (state) => {
        state.isExtracting = true;
        state.extractionError = null;
      })
      .addCase(extractTripFromFile.fulfilled, (state, action) => {
        state.isExtracting = false;
        state.extractedData = action.payload.extractedData;
        state.documentId = action.payload.documentId || null;

        // Generate title from extracted data
        if (action.payload.extractedData) {
          const data = action.payload.extractedData;
          const destination = data.destinations?.[0] || 'Trip';
          const season = data.keyTopics?.find((t: string) =>
            ['christmas', 'summer', 'winter', 'spring', 'fall', 'holiday'].some((s: string) =>
              t.toLowerCase().includes(s)
            )
          );

          const titleParts = season ? [season, 'in', destination] : [destination];
          const fullTitle = titleParts.join(' ');

          state.title = `TripPlanner - ${fullTitle}`;
          state.shortTitle = fullTitle.length > 20
            ? fullTitle.substring(0, 20) + '...'
            : fullTitle;
        }
      })
      .addCase(extractTripFromFile.rejected, (state, action) => {
        state.isExtracting = false;
        state.extractionError = action.error.message || 'Failed to extract trip data';
      });
  },
});

export const { setTripTitle, setTripData, clearTripData } = tripSlice.actions;
export default tripSlice.reducer;
