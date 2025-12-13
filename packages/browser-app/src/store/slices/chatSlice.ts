import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { QuickAction } from '../../types/chat';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  read?: boolean;
  suggestions?: QuickAction[];
}

export interface ChatState {
  messages: Message[];
  draftInput: string;
  isLoading: boolean;
  isExpanded: boolean;
  unreadCount: number;
}

const initialState: ChatState = {
  messages: [],
  draftInput: '',
  isLoading: false,
  isExpanded: false,
  unreadCount: 0,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Omit<Message, 'id' | 'timestamp' | 'read'>>) => {
      const timestamp = new Date().toISOString();
      const message: Message = {
        ...action.payload,
        id: `${action.payload.role}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        read: false,
      };
      state.messages.push(message);
      if (message.role === 'assistant' && !message.read) {
        state.unreadCount += 1;
      }
    },
    setDraftInput: (state, action: PayloadAction<string>) => {
      state.draftInput = action.payload;
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setIsExpanded: (state, action: PayloadAction<boolean>) => {
      state.isExpanded = action.payload;
    },
    markMessagesAsRead: (state) => {
      state.messages.forEach((msg) => {
        msg.read = true;
      });
      state.unreadCount = 0;
    },
    clearMessages: (state) => {
      state.messages = [];
      state.unreadCount = 0;
    },
  },
});

export const {
  addMessage,
  setDraftInput,
  setIsLoading,
  setIsExpanded,
  markMessagesAsRead,
  clearMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
