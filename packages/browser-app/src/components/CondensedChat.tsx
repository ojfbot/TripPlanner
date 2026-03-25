import { useRef, useEffect, useCallback } from 'react';
import {
  Tag,
  IconButton,
} from '@carbon/react';
import { Microphone } from '@carbon/icons-react';
import {
  ChatShell,
  ChatMessage,
  MarkdownMessage,
} from '@ojfbot/frame-ui-components';
import type { ChatDisplayState } from '@ojfbot/frame-ui-components';
import '@ojfbot/frame-ui-components/styles/chat-shell';
import '@ojfbot/frame-ui-components/styles/markdown-message';
import '@ojfbot/frame-ui-components/styles/badge-button';
import rehypeHighlight from 'rehype-highlight';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addMessage,
  setDraftInput,
  setIsLoading,
  setViewState,
  markMessagesAsRead,
} from '../store/slices/chatSlice';
import { TabKey } from '../models/navigation';
import { CONDENSED_QUICK_ACTIONS } from '../config/quickActions';
import '../styles/variables.css';
import '../styles/animations.css';

const rehypePlugins = [rehypeHighlight];

interface CondensedChatProps {
  sidebarExpanded?: boolean;
}

function CondensedChat({ sidebarExpanded = false }: CondensedChatProps) {
  const dispatch = useAppDispatch();
  const { messages, draftInput, isLoading, viewState, unreadCount } = useAppSelector(
    state => state.chat
  );
  const currentTab = useAppSelector(state => state.navigation.currentTab);

  // Auto-collapse chat when switching away from Interactive tab
  const prevTabRef = useRef(currentTab);
  useEffect(() => {
    const prevTab = prevTabRef.current;
    prevTabRef.current = currentTab;

    if (prevTab === TabKey.INTERACTIVE && currentTab !== TabKey.INTERACTIVE && viewState === 'expanded') {
      dispatch(setViewState('collapsed'));
    }
  }, [currentTab, viewState, dispatch]);

  const handleSend = useCallback((messageText: string) => {
    if (!messageText || isLoading) return;

    dispatch(addMessage({ role: 'user', content: messageText }));
    dispatch(setIsLoading(true));

    // TODO: Connect to API
    setTimeout(() => {
      dispatch(addMessage({
        role: 'assistant',
        content: 'This is a placeholder response. API integration coming in Phase 2!'
      }));
      dispatch(setIsLoading(false));
    }, 1000);
  }, [isLoading, dispatch]);

  const handleQuickAction = useCallback((prompt: string) => {
    handleSend(prompt);
  }, [handleSend]);

  const handleDisplayStateChange = useCallback((state: ChatDisplayState) => {
    dispatch(setViewState(state));
    if (state === 'expanded') {
      dispatch(markMessagesAsRead());
    }
  }, [dispatch]);

  const handleDraftChange = useCallback((value: string) => {
    dispatch(setDraftInput(value));
  }, [dispatch]);

  const microphoneButton = (
    <IconButton
      label="Voice input"
      onClick={() => {
        // TODO: Implement voice input functionality
      }}
      disabled={isLoading}
      kind="ghost"
      size="sm"
    >
      <Microphone size={20} />
    </IconButton>
  );

  return (
    <ChatShell
      displayState={viewState as ChatDisplayState}
      onDisplayStateChange={handleDisplayStateChange}
      sidebarExpanded={sidebarExpanded}
      title="AI Assistant"
      isLoading={isLoading}
      unreadCount={unreadCount}
      draftInput={draftInput}
      onDraftChange={handleDraftChange}
      onSend={handleSend}
      placeholder="Ask me anything..."
      inputDisabled={isLoading}
      inputExtra={microphoneButton}
    >
      {messages.length === 0 && (
        <div className="welcome-message-condensed">
          <h3>Welcome to TripPlanner</h3>
          <p>Your AI travel assistant. Start planning your next adventure!</p>
          <div className="quick-actions-condensed">
            <div className="quick-actions-label">Quick Actions</div>
            <div className="quick-actions-grid-condensed">
              {CONDENSED_QUICK_ACTIONS.map((action, idx) => (
                <Tag
                  key={idx}
                  type={action.type}
                  onClick={() => handleQuickAction(action.prompt)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleQuickAction(action.prompt);
                    }
                  }}
                  className="quick-action-tag"
                  size="sm"
                  role="button"
                  tabIndex={0}
                >
                  <span className="action-icon">{action.icon}</span>
                  {action.label}
                </Tag>
              ))}
            </div>
          </div>
        </div>
      )}
      {messages.map((msg) => (
        <ChatMessage key={msg.id} role={msg.role}>
          {msg.role === 'user' ? (
            <div className="user-message">{msg.content}</div>
          ) : (
            <MarkdownMessage
              content={msg.content}
              compact={true}
              rehypePlugins={rehypePlugins}
            />
          )}
        </ChatMessage>
      ))}
      {isLoading && (
        <ChatMessage role="assistant" isStreaming>
          <span>Thinking...</span>
        </ChatMessage>
      )}
    </ChatShell>
  );
}

export default CondensedChat;
