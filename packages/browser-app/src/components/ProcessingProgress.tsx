/**
 * Processing Progress Component
 * Displays real-time progress updates during document processing via SSE
 */

import { useEffect, useState } from 'react';
import { Loading } from '@carbon/react';
import { ProcessingPhase, PHASE_MESSAGES } from '../types/processing-phase';
import './ProcessingProgress.scss';

interface ProcessingProgressProps {
  processId: string;
  onComplete: (data: any) => void;
  onError: (error: string, phase: string) => void;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  processId,
  onComplete,
  onError,
}) => {
  const [phase, setPhase] = useState<ProcessingPhase | ''>('');
  const [message, setMessage] = useState<string>('Initializing your import...');

  useEffect(() => {
    // Connect to SSE endpoint
    console.log(`[ProcessingProgress] Connecting to SSE for process: ${processId}`);
    const eventSource = new EventSource(
      `/api/v1/integrations/process/${processId}/stream`
    );

    eventSource.addEventListener('progress', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        // Use custom message if provided, otherwise fall back to phase default
        const newMessage = data.message || PHASE_MESSAGES[data.phase as ProcessingPhase] || 'Processing your conversation...';
        console.log(`[ProcessingProgress] Phase: ${data.phase}, Progress: ${data.progress}%, Message: ${newMessage}`);
        setPhase(data.phase);
        setMessage(newMessage);
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
        setMessage('All done! Your trip has been set up.');
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
          <p key={message} className="processing-progress__message">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default ProcessingProgress;
