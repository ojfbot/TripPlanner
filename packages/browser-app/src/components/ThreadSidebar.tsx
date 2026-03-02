import { useEffect, useState } from 'react';
import {
  Button,
  SkeletonText,
} from '@carbon/react';
import {
  Add,
  Renew,
  Chat,
  TrashCan,
} from '@carbon/icons-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchThreads,
  createThread,
  deleteThread,
  setCurrentThreadId,
  fetchThread,
} from '../store/slices/threadsSlice';
import './ThreadSidebar.css';

interface ThreadSidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

function ThreadSidebar({ isExpanded, onToggle }: ThreadSidebarProps) {
  const dispatch = useAppDispatch();
  const { threads, currentThreadId, isLoading, isCreatingThread } = useAppSelector(
    state => state.threads
  );
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);

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

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation? This action cannot be undone.')) {
      await dispatch(deleteThread(threadId));
    }
  };

  const handleRefresh = () => {
    const userId = localStorage.getItem('userId') || 'browser-user';
    dispatch(fetchThreads({ userId }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`thread-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}
        {...(!isExpanded ? { inert: '' } : {})}
      >
        <div className="thread-sidebar-header">
          <h3 className="thread-sidebar-title">Conversations</h3>
          <div className="thread-sidebar-actions">
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              iconDescription="Refresh conversations"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <Renew />
            </Button>
            <Button
              kind="primary"
              size="sm"
              hasIconOnly
              iconDescription="New conversation"
              onClick={handleCreateThread}
              disabled={isCreatingThread}
            >
              <Add />
            </Button>
          </div>
        </div>

        <div className="thread-sidebar-content">
          {isLoading && threads.length === 0 ? (
            <div className="thread-sidebar-loading">
              <SkeletonText />
              <SkeletonText />
              <SkeletonText />
            </div>
          ) : threads.length === 0 ? (
            <div className="thread-sidebar-empty">
              <Chat size={48} className="empty-icon" />
              <p className="empty-message">No conversations yet</p>
              <Button
                kind="tertiary"
                size="sm"
                onClick={handleCreateThread}
                disabled={isCreatingThread}
              >
                Start planning your first trip
              </Button>
            </div>
          ) : (
            <div className="thread-list">
              {threads.map(thread => (
                <div
                  key={thread.threadId}
                  className={`thread-item ${
                    currentThreadId === thread.threadId ? 'active' : ''
                  }`}
                  onClick={() => handleSelectThread(thread.threadId)}
                  onMouseEnter={() => setHoveredThreadId(thread.threadId)}
                  onMouseLeave={() => setHoveredThreadId(null)}
                >
                  <div className="thread-item-content">
                    <div className="thread-item-title">
                      {thread.title || 'Untitled conversation'}
                    </div>
                    <div className="thread-item-date">
                      {formatDate(thread.updatedAt)}
                    </div>
                  </div>
                  {hoveredThreadId === thread.threadId && (
                    <Button
                      kind="ghost"
                      size="sm"
                      hasIconOnly
                      iconDescription="Delete conversation"
                      onClick={(e: React.MouseEvent) => handleDeleteThread(thread.threadId, e)}
                      className="thread-item-delete"
                    >
                      <TrashCan />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {isExpanded && (
        <div className="thread-sidebar-overlay" onClick={(e: React.MouseEvent) => { e.preventDefault(); onToggle(); }} />
      )}
    </>
  );
}

export default ThreadSidebar;
