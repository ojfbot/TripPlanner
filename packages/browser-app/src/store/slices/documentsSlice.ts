import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

export interface Document {
  documentId: string;
  userId: string;
  type: 'chatgpt_transcript' | 'text' | 'other';
  title: string;
  extractionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  embeddingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extractedData?: string; // JSON string of ExtractedData
  createdAt: string;
  updatedAt: string;
  metadata: {
    format?: 'json' | 'text';
    messageCount?: number;
    conversationId?: string;
    model?: string;
    chunks?: number;
    embeddings?: number;
    stats?: {
      messageCount: number;
      userMessageCount: number;
      assistantMessageCount: number;
      totalCharacters: number;
      averageMessageLength: number;
    };
    error?: string;
  };
}

export interface OpenAIStatus {
  configured: boolean;
  connected: boolean;
  model: string | null;
  error: string | null;
  message: string;
}

export interface DocumentsState {
  documents: Document[];
  openaiStatus: OpenAIStatus | null;
  isLoading: boolean;
  isImporting: boolean;
  isCheckingStatus: boolean;
  error: string | null;
}

const initialState: DocumentsState = {
  documents: [],
  openaiStatus: null,
  isLoading: false,
  isImporting: false,
  isCheckingStatus: false,
  error: null,
};

// Async thunks
export const fetchDocuments = createAsyncThunk(
  'documents/fetchDocuments',
  async ({ userId }: { userId: string }) => {
    const response = await axios.get(`/api/v1/integrations/documents?userId=${userId}`);
    return response.data;
  }
);

export const importChatGPTTranscript = createAsyncThunk(
  'documents/importChatGPTTranscript',
  async ({ userId, content, threadId }: { userId: string; content: string; threadId?: string }) => {
    const response = await axios.post('/api/v1/integrations/chatgpt/import', {
      userId,
      content,
      threadId,
    });
    return response.data;
  }
);

export const importChatGPTFile = createAsyncThunk(
  'documents/importChatGPTFile',
  async ({ userId, file, threadId }: { userId: string; file: File; threadId?: string }) => {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('transcript', file);
    if (threadId) {
      formData.append('threadId', threadId);
    }

    const response = await axios.post('/api/v1/integrations/chatgpt/import/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
);

export const deleteDocument = createAsyncThunk(
  'documents/deleteDocument',
  async (documentId: string) => {
    await axios.delete(`/api/v1/integrations/documents/${documentId}`);
    return documentId;
  }
);

export const checkOpenAIStatus = createAsyncThunk(
  'documents/checkOpenAIStatus',
  async () => {
    const response = await axios.get('/api/v1/integrations/openai/status');
    return response.data;
  }
);

// Slice
const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch documents
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action: PayloadAction<Document[]>) => {
        state.isLoading = false;
        state.documents = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch documents';
      });

    // Import ChatGPT transcript
    builder
      .addCase(importChatGPTTranscript.pending, (state) => {
        state.isImporting = true;
        state.error = null;
      })
      .addCase(importChatGPTTranscript.fulfilled, (state) => {
        state.isImporting = false;
        // Document will be fetched via fetchDocuments
      })
      .addCase(importChatGPTTranscript.rejected, (state, action) => {
        state.isImporting = false;
        state.error = action.error.message || 'Failed to import transcript';
      });

    // Import ChatGPT file
    builder
      .addCase(importChatGPTFile.pending, (state) => {
        state.isImporting = true;
        state.error = null;
      })
      .addCase(importChatGPTFile.fulfilled, (state) => {
        state.isImporting = false;
        // Document will be fetched via fetchDocuments
      })
      .addCase(importChatGPTFile.rejected, (state, action) => {
        state.isImporting = false;
        state.error = action.error.message || 'Failed to import file';
      });

    // Delete document
    builder
      .addCase(deleteDocument.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteDocument.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false;
        state.documents = state.documents.filter(doc => doc.documentId !== action.payload);
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete document';
      });

    // Check OpenAI status
    builder
      .addCase(checkOpenAIStatus.pending, (state) => {
        state.isCheckingStatus = true;
        state.error = null;
      })
      .addCase(checkOpenAIStatus.fulfilled, (state, action: PayloadAction<OpenAIStatus>) => {
        state.isCheckingStatus = false;
        state.openaiStatus = action.payload;
      })
      .addCase(checkOpenAIStatus.rejected, (state, action) => {
        state.isCheckingStatus = false;
        state.error = action.error.message || 'Failed to check OpenAI status';
      });
  },
});

export const { clearError } = documentsSlice.actions;
export default documentsSlice.reducer;
