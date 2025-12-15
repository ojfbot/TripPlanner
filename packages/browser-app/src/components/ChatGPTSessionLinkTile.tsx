import { useState } from 'react';
import { Tile, TextInput, Button, InlineNotification } from '@carbon/react';
import { Launch, Copy } from '@carbon/icons-react';

function ChatGPTSessionLinkTile() {
  const [sessionUrl, setSessionUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState<string | null>(
    localStorage.getItem('chatgpt_session_url')
  );
  const [showCopied, setShowCopied] = useState(false);

  const handleSave = () => {
    if (sessionUrl.trim()) {
      localStorage.setItem('chatgpt_session_url', sessionUrl.trim());
      setSavedUrl(sessionUrl.trim());
      setSessionUrl('');
    }
  };

  const handleOpen = () => {
    if (savedUrl) {
      window.open(savedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopy = async () => {
    if (savedUrl) {
      try {
        await navigator.clipboard.writeText(savedUrl);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleClear = () => {
    localStorage.removeItem('chatgpt_session_url');
    setSavedUrl(null);
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'chatgpt.com' || parsed.hostname === 'chat.openai.com';
    } catch {
      return false;
    }
  };

  return (
    <Tile style={{ marginBottom: '1rem' }}>
      <h4 style={{ marginBottom: '1rem' }}>ChatGPT Session Link</h4>

      {showCopied && (
        <InlineNotification
          kind="success"
          title="Copied to clipboard"
          subtitle="Session URL has been copied"
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem' }}
        />
      )}

      <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '1rem' }}>
        Save a link to your ChatGPT session for quick access. This helps you easily switch between
        TripPlanner and ChatGPT when working on trips.
      </p>

      {!savedUrl ? (
        <div>
          <TextInput
            id="session-url-input"
            labelText="ChatGPT Session URL"
            placeholder="https://chatgpt.com/c/..."
            value={sessionUrl}
            onChange={(e) => setSessionUrl(e.target.value)}
            invalid={sessionUrl.length > 0 && !isValidUrl(sessionUrl)}
            invalidText="Please enter a valid ChatGPT URL (chatgpt.com or chat.openai.com)"
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isValidUrl(sessionUrl)}
            style={{ marginTop: '0.75rem' }}
          >
            Save Link
          </Button>
        </div>
      ) : (
        <div>
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'var(--cds-layer-01)',
              borderRadius: '4px',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
                Saved Session
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {savedUrl}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              kind="primary"
              size="sm"
              renderIcon={Launch}
              onClick={handleOpen}
            >
              Open in ChatGPT
            </Button>
            <Button
              kind="secondary"
              size="sm"
              renderIcon={Copy}
              onClick={handleCopy}
            >
              Copy URL
            </Button>
            <Button
              kind="ghost"
              size="sm"
              onClick={handleClear}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: 'var(--cds-layer-02)',
          borderRadius: '4px',
          fontSize: '0.75rem',
        }}
      >
        <strong>Tip:</strong> When you create a new ChatGPT conversation about a trip, copy the URL
        from your browser and save it here. This makes it easy to continue the conversation later.
      </div>
    </Tile>
  );
}

export default ChatGPTSessionLinkTile;
