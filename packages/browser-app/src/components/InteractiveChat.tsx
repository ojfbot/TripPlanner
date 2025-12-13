import { useRef, useEffect, useCallback } from 'react';
import {
  TextArea,
  Button,
  IconButton,
  Tile,
  Tag,
} from '@carbon/react';
import { SendAlt, Microphone } from '@carbon/icons-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addMessage,
  setDraftInput,
  setIsLoading,
  markMessagesAsRead,
} from '../store/slices/chatSlice';
import { INTERACTIVE_QUICK_ACTIONS } from '../config/quickActions';
import MarkdownMessage from './MarkdownMessage';
import '../styles/variables.css';
import '../styles/animations.css';
import './InteractiveChat.css';

function InteractiveChat() {
  const dispatch = useAppDispatch();
  const draftInput = useAppSelector(state => state.chat.draftInput);
  const messages = useAppSelector(state => state.chat.messages);
  const isLoading = useAppSelector(state => state.chat.isLoading);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(markMessagesAsRead());
  }, [dispatch]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!draftInput.trim() || isLoading) return;

    const userMessage = draftInput;
    dispatch(addMessage({ role: 'user', content: userMessage }));
    dispatch(setDraftInput(''));
    dispatch(setIsLoading(true));

    // TODO: Connect to API
    setTimeout(() => {
      dispatch(addMessage({
        role: 'assistant',
        content: 'This is a placeholder response. API integration coming in Phase 2!'
      }));
      dispatch(setIsLoading(false));
    }, 1000);
  }, [draftInput, isLoading, dispatch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = useCallback((prompt: string) => {
    // Send message directly without setting draft input
    dispatch(addMessage({ role: 'user', content: prompt }));
    dispatch(setIsLoading(true));

    // TODO: Connect to API
    setTimeout(() => {
      dispatch(addMessage({
        role: 'assistant',
        content: 'This is a placeholder response. API integration coming in Phase 2!'
      }));
      dispatch(setIsLoading(false));
    }, 1000);
  }, [dispatch]);

  return (
    <div className="interactive-chat">
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length === 0 && (
          <div className="welcome-message">
            <h2>Welcome to TripPlanner</h2>
            <p>
              Your AI-powered travel companion. Plan amazing trips, create detailed itineraries,
              and discover the best experiences for your next adventure.
            </p>
            <div className="quick-actions">
              <div className="quick-actions-label">Quick Actions</div>
              <div className="quick-actions-grid">
                {INTERACTIVE_QUICK_ACTIONS.map((action, idx) => (
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
          <Tile key={msg.id} className={`message-tile ${msg.role}`}>
            <div className="message-header">
              <strong>{msg.role === 'user' ? '👤 You' : '🤖 Assistant'}</strong>
            </div>
            <div className="message-content">
              {msg.role === 'user' ? (
                <div className="user-message">{msg.content}</div>
              ) : (
                <MarkdownMessage
                  content={msg.content}
                  suggestions={msg.suggestions}
                />
              )}
            </div>
          </Tile>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content loading">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-container">
        <div className="input-wrapper">
          <div className="textarea-container">
            <TextArea
              id="chat-input"
              labelText="Message"
              placeholder="Ask about trip planning, itineraries, activities..."
              value={draftInput}
              onChange={(e) => dispatch(setDraftInput(e.target.value))}
              onKeyDown={handleKeyDown}
              rows={3}
              disabled={isLoading}
              data-element="chat-input"
            />
            <div className="input-actions">
              <IconButton
                label="Voice input"
                onClick={() => {
                  // TODO: Implement voice input functionality
                }}
                disabled={isLoading}
                className="microphone-button-input"
                kind="ghost"
                size="sm"
              >
                <Microphone size={20} />
              </IconButton>
              <Button
                renderIcon={SendAlt}
                onClick={handleSend}
                disabled={!draftInput.trim() || isLoading}
                className="send-button-inline"
                kind="primary"
                size="sm"
                hasIconOnly
                iconDescription="Send message"
                data-element="chat-send-button"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InteractiveChat;
