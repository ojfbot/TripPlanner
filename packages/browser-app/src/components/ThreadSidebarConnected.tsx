import { useEffect } from 'react';
import { ThreadSidebar } from '@ojfbot/frame-ui-components';
import type { ThreadItem } from '@ojfbot/frame-ui-components';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchThreads,
  createThread,
  deleteThread,
  setCurrentThreadId,
  fetchThread,
} from '../store/slices/threadsSlice';

interface ThreadSidebarConnectedProps {
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Thin Connected wrapper — maps TripPlanner Redux state to the shared
 * ThreadSidebar component's props-only interface (ADR-0029).
 */
function ThreadSidebarConnected({ isExpanded, onToggle }: ThreadSidebarConnectedProps) {
  const dispatch = useAppDispatch();
  const { threads, currentThreadId, isLoading, isCreatingThread } = useAppSelector(
    state => state.threads
  );

  // Load threads on mount
  useEffect(() => {
    const userId = localStorage.getItem('userId') || 'browser-user';
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', userId);
    }
    dispatch(fetchThreads({ userId }));
  }, [dispatch]);

  const handleCreateThread = async () => {
    const userId = localStorage.getItem('userId') || 'browser-user';
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    await dispatch(createThread({
      userId,
      title: `Trip Planning - ${timestamp}`,
    }));
  };

  const handleSelectThread = (threadId: string) => {
    if (currentThreadId !== threadId) {
      dispatch(setCurrentThreadId(threadId));
      dispatch(fetchThread(threadId));
    }
  };

  const handleDeleteThread = (threadId: string) => {
    dispatch(deleteThread(threadId));
  };

  const handleRefresh = () => {
    const userId = localStorage.getItem('userId') || 'browser-user';
    dispatch(fetchThreads({ userId }));
  };

  // Map Redux Thread[] to shared ThreadItem[]
  const threadItems: ThreadItem[] = threads.map(t => ({
    threadId: t.threadId,
    title: t.title,
    updatedAt: t.updatedAt,
  }));

  return (
    <ThreadSidebar
      isExpanded={isExpanded}
      onToggle={onToggle}
      threads={threadItems}
      currentThreadId={currentThreadId}
      isLoading={isLoading}
      isCreatingThread={isCreatingThread}
      onCreateThread={handleCreateThread}
      onSelectThread={handleSelectThread}
      onDeleteThread={handleDeleteThread}
      onRefresh={handleRefresh}
    />
  );
}

export default ThreadSidebarConnected;
