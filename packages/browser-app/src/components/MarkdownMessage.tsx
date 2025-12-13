import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Tag } from '@carbon/react';
import type { QuickAction } from '../types/chat';
import './MarkdownMessage.css';

interface MarkdownMessageProps {
  content: string;
  compact?: boolean;
  suggestions?: QuickAction[];
  onSuggestionClick?: (prompt: string) => void;
}

function MarkdownMessage({
  content,
  compact = false,
  suggestions,
  onSuggestionClick
}: MarkdownMessageProps) {
  return (
    <div className={`markdown-message ${compact ? 'compact' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
      {suggestions && suggestions.length > 0 && (
        <div className="message-suggestions">
          {suggestions.map((suggestion, idx) => (
            <Tag
              key={idx}
              type={suggestion.type}
              onClick={() => onSuggestionClick?.(suggestion.prompt)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSuggestionClick?.(suggestion.prompt);
                }
              }}
              className="suggestion-tag"
              size="sm"
              role="button"
              tabIndex={0}
            >
              {suggestion.icon && <span className="suggestion-icon">{suggestion.icon}</span>}
              {suggestion.label}
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(MarkdownMessage);
