import { useRef, useEffect } from 'react';
import { TextInput, Button, IconButton } from '@carbon/react';
import { SendAlt, ChevronDown, ChevronUp } from '@carbon/icons-react';
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
  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    if (isExpanded && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isExpanded]);

  const handleSend = async () => {
    if (!draftInput.trim() || isLoading) return;

    const userMessage = draftInput;
    dispatch(addMessage({ role: 'user', content: userMessage }));
    dispatch(setDraftInput(''));
    dispatch(setIsLoading(true));

    // TODO: Connect to API
    setTimeout(() => {
      dispatch(addMessage({
        role: 'assistant',
        content: 'Response from condensed chat. API integration coming soon!'
      }));
      dispatch(setIsLoading(false));
    }, 1000);
  };

  const handleToggleExpand = () => {
    if (!isExpanded) {
      dispatch(markMessagesAsRead());
    }
    dispatch(setIsExpanded(!isExpanded));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`condensed-chat ${isExpanded ? 'expanded' : 'collapsed'} ${sidebarExpanded ? 'with-sidebar' : ''}`}>
      <div className="condensed-chat-header" onClick={handleToggleExpand}>
        <div className="header-content">
          <span className="header-title">TripPlanner Assistant</span>
          {unreadCount > 0 && !isExpanded && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
        <IconButton
          kind="ghost"
          label={isExpanded ? 'Collapse chat' : 'Expand chat'}
          size="sm"
        >
          {isExpanded ? <ChevronDown /> : <ChevronUp />}
        </IconButton>
      </div>

      {isExpanded && (
        <div className="condensed-chat-body">
          <div className="messages-container" ref={messagesContainerRef}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-header">
                  <strong>{msg.role === 'user' ? 'You' : 'Assistant'}</strong>
                </div>
                <div className="message-content">
                  {msg.role === 'user' ? (
                    <div className="user-message">{msg.content}</div>
                  ) : (
                    <MarkdownMessage content={msg.content} />
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant">
                <div className="message-content loading">Planning...</div>
              </div>
            )}
          </div>

          <div className="input-container">
            <TextInput
              id="condensed-chat-input"
              labelText=""
              placeholder="Ask about your trip..."
              value={draftInput}
              onChange={(e) => dispatch(setDraftInput(e.target.value))}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              size="sm"
            />
            <Button
              kind="primary"
              size="sm"
              renderIcon={SendAlt}
              hasIconOnly
              iconDescription="Send"
              onClick={handleSend}
              disabled={!draftInput.trim() || isLoading}
            />
          </div>
        </div>
      )}

      {!isExpanded && lastMessage && (
        <div className="preview-message">
          <strong>{lastMessage.role === 'user' ? 'You' : 'Assistant'}:</strong>{' '}
          {lastMessage.content.substring(0, 60)}
          {lastMessage.content.length > 60 ? '...' : ''}
        </div>
      )}
    </div>
  );
}

export default CondensedChat;
