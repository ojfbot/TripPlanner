import { useEffect } from 'react';
import { Tile, Button, SkeletonText, Tag } from '@carbon/react';
import { Checkmark, Error, Warning, Renew } from '@carbon/icons-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { checkOpenAIStatus } from '../store/slices/documentsSlice';

function OpenAIStatusCard() {
  const dispatch = useAppDispatch();
  const { openaiStatus, isCheckingStatus } = useAppSelector((state) => state.documents);

  useEffect(() => {
    // Check status on mount
    dispatch(checkOpenAIStatus());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(checkOpenAIStatus());
  };

  const getStatusTag = () => {
    if (!openaiStatus) return null;

    if (!openaiStatus.configured) {
      return (
        <Tag type="red" renderIcon={Error}>
          Not Configured
        </Tag>
      );
    }

    if (openaiStatus.connected) {
      return (
        <Tag type="green" renderIcon={Checkmark}>
          Connected
        </Tag>
      );
    }

    return (
      <Tag type="magenta" renderIcon={Warning}>
        Connection Failed
      </Tag>
    );
  };

  return (
    <Tile style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h4 style={{ marginBottom: '0.5rem' }}>OpenAI Integration Status</h4>
          {isCheckingStatus ? (
            <SkeletonText />
          ) : (
            <>
              <div style={{ marginBottom: '0.5rem' }}>
                {getStatusTag()}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '0.5rem' }}>
                {openaiStatus?.message || 'Checking connection...'}
              </p>
              {openaiStatus?.model && (
                <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                  Model: <code>{openaiStatus.model}</code>
                </p>
              )}
              {openaiStatus?.error && (
                <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-error)', marginTop: '0.5rem' }}>
                  Error: {openaiStatus.error}
                </p>
              )}
            </>
          )}
        </div>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Renew}
          iconDescription="Refresh status"
          hasIconOnly
          onClick={handleRefresh}
          disabled={isCheckingStatus}
        />
      </div>

      {!openaiStatus?.configured && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--cds-layer-02)',
          borderRadius: '4px',
          fontSize: '0.875rem'
        }}>
          <strong>Setup Required:</strong>
          <ol style={{ marginTop: '0.5rem', marginLeft: '1.25rem', marginBottom: 0 }}>
            <li>Get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a></li>
            <li>Add <code>OPENAI_API_KEY=your-key-here</code> to your <code>.env.local</code> file</li>
            <li>Restart the API server</li>
            <li>Click the refresh button above</li>
          </ol>
        </div>
      )}

      {openaiStatus?.configured && !openaiStatus.connected && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--cds-layer-02)',
          borderRadius: '4px',
          fontSize: '0.875rem'
        }}>
          <strong>Connection Issue:</strong>
          <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
            The OpenAI API key is configured but connection failed. Please check:
          </p>
          <ul style={{ marginTop: '0.5rem', marginLeft: '1.25rem', marginBottom: 0 }}>
            <li>Your API key is valid and not expired</li>
            <li>You have available credits in your OpenAI account</li>
            <li>Your network allows connections to OpenAI's API</li>
          </ul>
        </div>
      )}
    </Tile>
  );
}

export default OpenAIStatusCard;
