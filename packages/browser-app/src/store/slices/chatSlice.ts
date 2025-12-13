import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { QuickAction } from '../../types/chat';

export interface Message {
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
    addMessage: (state, action: PayloadAction<Message>) => {
      const message = {
        ...action.payload,
        timestamp: action.payload.timestamp || new Date().toISOString(),
        read: action.payload.read !== undefined ? action.payload.read : false,
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
