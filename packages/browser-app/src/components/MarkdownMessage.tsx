import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import './MarkdownMessage.css';

interface MarkdownMessageProps {
  content: string;
  compact?: boolean;
}

function MarkdownMessage({
  content,
  compact = false,
}: MarkdownMessageProps) {
  return (
    <div className={`markdown-message ${compact ? 'compact' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownMessage);
