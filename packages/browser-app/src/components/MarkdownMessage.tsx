import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { QuickAction } from '../types/chat';
import './MarkdownMessage.css';

interface MarkdownMessageProps {
  content: string;
  compact?: boolean;
  suggestions?: QuickAction[];
}

function MarkdownMessage({ content, compact: _compact, suggestions: _suggestions }: MarkdownMessageProps) {
  // TODO: Implement compact mode and suggestions rendering
  return (
    <div className="markdown-message">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownMessage;
