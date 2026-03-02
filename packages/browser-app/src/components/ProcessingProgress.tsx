/**
 * Processing Progress Component
 * Displays real-time progress updates during document processing via SSE
 */

import { useEffect, useState, useRef } from 'react';
import { Loading } from '@carbon/react';
import { ProcessingPhase, PHASE_MESSAGES } from '../types/processing-phase';
import './ProcessingProgress.scss';

interface ProcessingProgressProps {
  processId: string;
  onComplete: (data: any) => void;
  onError: (error: string, phase: string) => void;
}

interface ProgressMessage {
  id: string;
  text: string;
  timestamp: Date;
  phase: ProcessingPhase | '';
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  processId,
  onComplete,
  onError,
}) => {
  const [phase, setPhase] = useState<ProcessingPhase | ''>('');
  const [messages, setMessages] = useState<ProgressMessage[]>([
    { id: '0', text: 'Initializing your import...', timestamp: new Date(), phase: '' }
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Connect to SSE endpoint
    console.log(`[ProcessingProgress] Connecting to SSE for process: ${processId}`);
    const eventSource = new EventSource(
      `/api/v1/integrations/process/${processId}/stream`
    );

    let messageCounter = 1;

    eventSource.addEventListener('progress', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        // Use custom message if provided, otherwise fall back to phase default
        const newMessage = data.message || PHASE_MESSAGES[data.phase as ProcessingPhase] || 'Processing your conversation...';
        console.log(`[ProcessingProgress] Phase: ${data.phase}, Progress: ${data.progress}%, Message: ${newMessage}`);
        setPhase(data.phase);
        setMessages(prev => [
          ...prev,
          {
            id: String(messageCounter++),
            text: newMessage,
            timestamp: new Date(),
            phase: data.phase
          }
        ]);
      } catch (error) {
        console.error('Error parsing progress event:', error);
      }
    });

    eventSource.addEventListener('error', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onError(data.error, data.phase);
        eventSource.close();
      } catch (error) {
        console.error('Error parsing error event:', error);
        onError('Unknown error occurred', '');
        eventSource.close();
      }
    });

    eventSource.addEventListener('complete', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[ProcessingProgress] Import complete!', data);
        setMessages(prev => [
          ...prev,
          {
            id: String(messageCounter++),
            text: '✓ All done! Your trip has been set up.',
            timestamp: new Date(),
            phase: ''
          }
        ]);
        onComplete(data.data);
        eventSource.close();
      } catch (error) {
        console.error('Error parsing complete event:', error);
        eventSource.close();
      }
    });

    // Handle connection errors
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      if (eventSource.readyState === EventSource.CLOSED) {
        onError('Connection lost', phase);
      }
      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [processId, onComplete, onError, phase]);

  return (
    <div className="processing-progress">
      <div className="processing-progress__overlay">
        <div className="processing-progress__content">
          <Loading description="" withOverlay={false} />
          <div className="processing-progress__log" ref={logRef}>
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`processing-progress__message ${index === messages.length - 1 ? 'latest' : ''}`}
                style={{
                  animation: 'fadeIn 0.3s ease-in',
                  opacity: index === messages.length - 1 ? 1 : 0.7
                }}
              >
                <span className="processing-progress__time">
                  {msg.timestamp.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
                <span className="processing-progress__text">{msg.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingProgress;
