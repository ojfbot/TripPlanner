import { Button, TextArea, IconButton, Loading } from '@carbon/react';
import { Copy, SendAlt, Bot } from '@carbon/icons-react';
import { useAppDispatch } from '../../store/hooks';
import { setExtractionPromptTemplate } from '../../store/slices/uiSlice';
import { PromptDiffViewer } from './PromptDiffViewer';
import type { ProposedChange } from './useImportAgent';

interface ImportPasteTabProps {
  pastedContent: string;
  onPastedContentChange: (value: string) => void;
  showFullPrompt: boolean;
  onToggleFullPrompt: () => void;
  showAIEditor: boolean;
  onToggleAIEditor: () => void;
  extractionPromptTemplate: string;
  proposedChanges: ProposedChange[];
  onAcceptChange: (id: string) => void;
  onRejectChange: (id: string) => void;
  onApplyChanges: () => void;
  promptModifications: string;
  onPromptModificationsChange: (value: string) => void;
  isGeneratingModifications: boolean;
  onGenerateModifications: () => void;
}

export function ImportPasteTab({
  pastedContent,
  onPastedContentChange,
  showFullPrompt,
  onToggleFullPrompt,
  showAIEditor,
  onToggleAIEditor,
  extractionPromptTemplate,
  proposedChanges,
  onAcceptChange,
  onRejectChange,
  onApplyChanges,
  promptModifications,
  onPromptModificationsChange,
  isGeneratingModifications,
  onGenerateModifications,
}: ImportPasteTabProps) {
  const dispatch = useAppDispatch();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem' }}>
      <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
          Paste your trip planning conversation or use the editable template to request a structured export from ChatGPT.
        </p>
      </div>

      <div style={{ flex: 3, display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: '1rem', overflow: 'hidden' }}>
        {!showFullPrompt ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <label htmlFor="paste-content" style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--cds-text-primary)' }}>
              Conversation or Structured Trip Data
            </label>
            <textarea
              id="paste-content"
              placeholder={`Paste AI conversation or structured JSON here:\n\nFrom ChatGPT export (JSON):\n{ "conversationMetadata": {...}, "tripOverview": {...}, "detailedItinerary": [...] }\n\nOr plain conversation:\nUser: Planning a trip to London for Christmas\nAssistant: Great! What dates?...`}
              value={pastedContent}
              onChange={(e) => onPastedContentChange(e.target.value)}
              style={{
                flex: 1, minHeight: 0, width: '100%', padding: '0.75rem',
                border: '1px solid var(--cds-border-subtle)', borderRadius: '4px',
                backgroundColor: 'var(--cds-field)', color: 'var(--cds-text-primary)',
                fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: '1.5',
                resize: 'none', overflow: 'auto',
              }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexShrink: 0 }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                Request Template {proposedChanges.length > 0 && '(Review Changes)'}
              </h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {proposedChanges.length > 0 && (
                  <Button kind="primary" size="sm" onClick={onApplyChanges}
                    disabled={!proposedChanges.some(c => c.accepted === true)}>
                    Apply Changes ({proposedChanges.filter(c => c.accepted === true).length})
                  </Button>
                )}
                <Button kind="ghost" size="sm" renderIcon={Copy} iconDescription="Copy template" hasIconOnly
                  onClick={() => navigator.clipboard.writeText(extractionPromptTemplate)} />
              </div>
            </div>

            {proposedChanges.length > 0 ? (
              <PromptDiffViewer
                changes={proposedChanges}
                onAccept={onAcceptChange}
                onReject={onRejectChange}
              />
            ) : (
              <textarea
                value={extractionPromptTemplate}
                onChange={(e) => dispatch(setExtractionPromptTemplate(e.target.value))}
                style={{
                  width: '100%', flex: 1, minHeight: 0, overflow: 'auto',
                  backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '1rem',
                  borderRadius: '4px', border: '1px solid #333',
                  fontFamily: '"IBM Plex Mono", "Menlo", "Monaco", "Courier New", monospace',
                  fontSize: '0.8125rem', lineHeight: '1.6', whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word', resize: 'none',
                }}
              />
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '0.75rem', flexShrink: 0 }}>
        <strong>Workflow:</strong> Copy template → Paste in ChatGPT → Get structured JSON → Paste above → Import
      </div>

      <div style={{ padding: '0.75rem', backgroundColor: 'var(--cds-layer-01)', borderRadius: '4px', flexShrink: 0, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="cds--btn cds--btn--primary cds--btn--sm" type="button"
            onClick={() => navigator.clipboard.writeText(extractionPromptTemplate)}>
            Copy Request Template
          </button>
          <Button kind="secondary" size="sm" renderIcon={Bot} onClick={onToggleAIEditor}>
            {showAIEditor ? 'Hide Editor' : 'Edit Template'}
          </Button>
          <button className="cds--btn cds--btn--secondary cds--btn--sm" type="button" onClick={onToggleFullPrompt}>
            {showFullPrompt ? 'Hide Template' : 'View Template'}
          </button>
        </div>
      </div>

      {showAIEditor && (
        <div style={{ flexShrink: 0 }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Modify Request Template with AI
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
              Describe changes you want to the extraction prompt
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <TextArea id="prompt-modifications" labelText=""
                placeholder="e.g., 'Add extra validation for hotel confirmation numbers'"
                value={promptModifications}
                onChange={(e) => onPromptModificationsChange(e.target.value)}
                rows={2} disabled={isGeneratingModifications} />
            </div>
            <IconButton label="Generate modifications" onClick={onGenerateModifications}
              disabled={!promptModifications.trim() || isGeneratingModifications} kind="primary" size="lg">
              {isGeneratingModifications ? <Loading small withOverlay={false} /> : <SendAlt size={20} />}
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}
