import { useRef, useEffect, useCallback } from 'react';
import {
  TextInput,
  TextArea,
  Button,
  IconButton,
  Tile,
  Tag,
} from '@carbon/react';
import { SendAlt, Minimize, ChatBot, Microphone } from '@carbon/icons-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addMessage,
  setDraftInput,
  setIsLoading,
  setIsExpanded,
  markMessagesAsRead,
} from '../store/slices/chatSlice';
import MarkdownMessage from './MarkdownMessage';
import './CondensedChat.css';

interface CondensedChatProps {
  sidebarExpanded?: boolean;
}

function CondensedChat({ sidebarExpanded = false }: CondensedChatProps) {
  const dispatch = useAppDispatch();
  const { messages, draftInput, isLoading, isExpanded, unreadCount } = useAppSelector(
    state => state.chat
  );
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick actions for welcome message
  const quickActions = [
    {
      label: 'Plan a Trip',
      icon: '✈️',
      prompt: 'Help me plan a trip',
      type: 'blue' as const
    },
    {
      label: 'Create Itinerary',
      icon: '📅',
      prompt: 'Create an itinerary for my trip',
      type: 'purple' as const
    },
    {
      label: 'Find Activities',
      icon: '🎯',
      prompt: 'What are the best activities in my destination?',
      type: 'cyan' as const
    },
    {
      label: 'Travel Tips',
      icon: '💡',
      prompt: 'Give me travel tips for my destination',
      type: 'magenta' as const
    },
  ];

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = false) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          const container = messagesContainerRef.current;
          if (smooth) {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            });
          } else {
            container.scrollTop = container.scrollHeight;
          }
        }
      });
    });
  }, []);

  // Auto-focus input when expanding
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);
      scrollToBottom(true);
    }
  }, [isExpanded, scrollToBottom]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (isExpanded && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isExpanded, scrollToBottom]);

  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || draftInput.trim();
    if (!textToSend || isLoading) return;

    const userMessage = textToSend;
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

  const handleQuickAction = useCallback((prompt: string) => {
    dispatch(setDraftInput(prompt));
    setTimeout(() => {
      handleSend(prompt);
    }, 300);
  }, [dispatch, handleSend]);

  const handleToggleExpand = () => {
    if (!isExpanded) {
      dispatch(markMessagesAsRead());
    }
    dispatch(setIsExpanded(!isExpanded));
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInputFocus = useCallback(() => {
    if (!isExpanded) {
      dispatch(setIsExpanded(true));
      dispatch(markMessagesAsRead());
    }
  }, [isExpanded, dispatch]);

  return (
    <div className={`condensed-chat ${isExpanded ? 'expanded' : ''} ${sidebarExpanded ? 'with-sidebar' : ''}`}>
      <div
        className="condensed-header"
        onClick={() => {
          if (!isExpanded) {
            handleToggleExpand();
          }
        }}
        style={{ cursor: isExpanded ? 'default' : 'pointer' }}
      >
        <div className="header-left">
          <ChatBot size={20} />
          <span className="header-title">AI Assistant</span>
          {!isExpanded && unreadCount > 0 && (
            <span className="unread-badge">new</span>
          )}
        </div>
        <div className="header-actions">
          {isExpanded && (
            <IconButton
              label="Minimize chat"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand();
              }}
              size="sm"
              kind="ghost"
            >
              <Minimize size={16} />
            </IconButton>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="chat-messages-container" ref={messagesContainerRef}>
          {messages.length === 0 && (
            <div className="welcome-message-condensed">
              <h3>Welcome to TripPlanner</h3>
              <p>Your AI travel assistant. Start planning your next adventure!</p>
              <div className="quick-actions-condensed">
                <div className="quick-actions-label">Quick Actions</div>
                <div className="quick-actions-grid-condensed">
                  {quickActions.map((action, idx) => (
                    <Tag
                      key={idx}
                      type={action.type}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="quick-action-tag"
                      size="sm"
                    >
                      <span className="action-icon">{action.icon}</span>
                      {action.label}
                    </Tag>
                  ))}
                </div>
              </div>
            </div>
          )}
          {messages.map((msg, idx) => (
            <Tile key={idx} className={`message-tile ${msg.role}`}>
              <div className="message-header">
                <strong>{msg.role === 'user' ? '👤 You' : '🤖 Assistant'}</strong>
              </div>
              <div className="message-content">
                {msg.role === 'user' ? (
                  <div className="user-message">{msg.content}</div>
                ) : (
                  <MarkdownMessage content={msg.content} compact={true} />
                )}
              </div>
            </Tile>
          ))}
          {isLoading && (
            <div className="message assistant">
              <div className="message-content loading">Thinking...</div>
            </div>
          )}
        </div>
      )}

      <div className="condensed-input-wrapper">
        <div className="textarea-container-condensed">
          {isExpanded ? (
            <TextArea
              ref={textAreaRef}
              labelText="Message"
              placeholder="Ask me anything..."
              value={draftInput}
              onChange={(e) => dispatch(setDraftInput(e.target.value))}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              disabled={isLoading}
              rows={3}
              className="condensed-chat-textarea"
            />
          ) : (
            <TextInput
              ref={inputRef}
              id="condensed-input"
              labelText=""
              placeholder="Ask me anything..."
              value={draftInput}
              onChange={(e) => dispatch(setDraftInput(e.target.value))}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              disabled={isLoading}
              size="md"
            />
          )}
          <div className="input-actions-condensed">
            <IconButton
              label="Voice input"
              onClick={() => {
                console.log('[CondensedChat] Microphone button clicked - functionality to be implemented');
              }}
              disabled={isLoading}
              className="microphone-button-input-condensed"
              kind="ghost"
              size="sm"
            >
              <Microphone size={20} />
            </IconButton>
            <Button
              renderIcon={SendAlt}
              onClick={() => handleSend()}
              disabled={!draftInput.trim() || isLoading}
              size="sm"
              kind="primary"
              hasIconOnly
              iconDescription="Send"
              className="send-button-inline-condensed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CondensedChat;
