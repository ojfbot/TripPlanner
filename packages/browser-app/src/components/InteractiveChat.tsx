import { useRef, useEffect } from 'react';
import {
  TextArea,
  Button,
  Tile,
} from '@carbon/react';
import { SendAlt } from '@carbon/icons-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addMessage,
  setDraftInput,
  setIsLoading,
  markMessagesAsRead,
} from '../store/slices/chatSlice';
import MarkdownMessage from './MarkdownMessage';
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
        content: 'This is a placeholder response. API integration coming soon!\n\nI can help you plan amazing trips once the AI backend is connected.'
      }));
      dispatch(setIsLoading(false));
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="interactive-chat">
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length === 0 && (
          <div className="empty-state">
            <h3>Welcome to TripPlanner!</h3>
            <p>Start a conversation to plan your next adventure.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <Tile key={idx} className={`message-tile ${msg.role}`}>
            <div className="message-header">
              <strong>{msg.role === 'user' ? '👤 You' : '🤖 TripPlanner'}</strong>
            </div>
            <div className="message-content">
              {msg.role === 'user' ? (
                <div className="user-message">{msg.content}</div>
              ) : (
                <MarkdownMessage content={msg.content} />
              )}
            </div>
          </Tile>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content loading">
              Planning your trip...
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-container">
        <TextArea
          id="chat-input"
          labelText=""
          placeholder="Ask TripPlanner to help plan your next trip..."
          value={draftInput}
          onChange={(e) => dispatch(setDraftInput(e.target.value))}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={isLoading}
        />
        <Button
          kind="primary"
          renderIcon={SendAlt}
          onClick={handleSend}
          disabled={!draftInput.trim() || isLoading}
        >
          Send
        </Button>
      </div>
    </div>
  );
}

export default InteractiveChat;
