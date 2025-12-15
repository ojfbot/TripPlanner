import { useState } from 'react';
import {
  Modal,
  TextArea,
  InlineNotification,
  FileUploader,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Button,
  IconButton,
  Loading,
} from '@carbon/react';
import { Copy, SendAlt, Checkmark, Close } from '@carbon/icons-react';
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTripData } from '../store/slices/tripSlice';
import { addMessage } from '../store/slices/chatSlice';
import { setExtractionPromptTemplate } from '../store/slices/uiSlice';
import ProcessingProgress from './ProcessingProgress';

const USER_ID = 'default-user'; // TODO: Replace with actual user authentication

// Note: EXTRACTION_PROMPT_TEMPLATE is now managed in Redux store (uiSlice)
// and can be accessed via useAppSelector((state) => state.ui.extractionPromptTemplate)

interface ImportAgentModalProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

function ImportAgentModal({ open, onClose, onComplete }: ImportAgentModalProps) {
  const dispatch = useAppDispatch();
  const extractionPromptTemplate = useAppSelector((state) => state.ui.extractionPromptTemplate);

  const [pastedContent, setPastedContent] = useState('');
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [processId, setProcessId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [promptModifications, setPromptModifications] = useState('');
  const [isGeneratingModifications, setIsGeneratingModifications] = useState(false);
  const [proposedChanges, setProposedChanges] = useState<Array<{
    id: string;
    type: 'add' | 'remove' | 'modify';
    original?: string;
    proposed: string;
    lineNumber?: number;
    accepted?: boolean;
  }>>([]);

  const handleSubmit = async () => {
    try {
      setImportSuccess(false);
      setImportError(null);
      setIsProcessing(true);

      let content = '';

      // Get content from either pasted text or uploaded file
      if (pastedContent.trim()) {
        content = pastedContent;
      } else if (selectedFile) {
        content = await selectedFile.text();
      } else {
        return; // No content to process
      }

      // Call the intelligent import endpoint
      const response = await axios.post('/api/v1/integrations/chatgpt/import/intelligent', {
        userId: USER_ID,
        content,
      });

      // Set the process ID to start SSE streaming
      setProcessId(response.data.processId);
    } catch (err) {
      console.error('Import failed:', err);
      setImportError(err instanceof Error ? err.message : 'Failed to start import');
      setIsProcessing(false);
    }
  };

  const handleProcessComplete = (data: any) => {
    // Update Redux state with extracted data
    if (data.extractedData) {
      dispatch(setTripData(data.extractedData));
    }

    // Add confirmation message to chat
    const destinationCount = data.extractedData?.destinations?.length || 0;

    dispatch(addMessage({
      role: 'assistant',
      content: `I've analyzed your conversation and set up your trip! I found ${destinationCount} destination(s) and extracted key trip information. The system went through all processing phases including text extraction, semantic analysis, and AI-powered data extraction. You can start planning using the chat below.`,
    }));

    // Show success and auto-close after 2 seconds
    setImportSuccess(true);
    setTimeout(() => {
      handleClose();
      onComplete?.();
    }, 2000);
  };

  const handleProcessError = (error: string, phase: string) => {
    console.error(`Error at phase ${phase}:`, error);
    setImportError(`Failed at phase: ${phase}. ${error}`);
    setIsProcessing(false);
    setProcessId(null);
  };

  const handleGenerateModifications = async () => {
    if (!promptModifications.trim()) return;

    try {
      setIsGeneratingModifications(true);
      setShowFullPrompt(true); // Switch to template view

      // Call API to generate modifications
      const response = await axios.post('/api/v1/integrations/chatgpt/modify-prompt', {
        currentPrompt: extractionPromptTemplate,
        userRequest: promptModifications,
      });

      // Parse proposed changes from response
      const changes = response.data.changes || [];
      setProposedChanges(changes.map((change: any, idx: number) => ({
        ...change,
        id: `change-${idx}`,
        accepted: undefined,
      })));

    } catch (err) {
      console.error('Failed to generate modifications:', err);
      // For now, create mock changes for demonstration
      setProposedChanges([
        {
          id: 'change-1',
          type: 'modify',
          original: '### 2. TIME & SCHEDULING ACCURACY',
          proposed: '### 2. TIME & SCHEDULING ACCURACY\n' + promptModifications,
          lineNumber: 17,
          accepted: undefined,
        }
      ]);
    } finally {
      setIsGeneratingModifications(false);
    }
  };

  const handleAcceptChange = (changeId: string) => {
    setProposedChanges(prev => prev.map(change =>
      change.id === changeId ? { ...change, accepted: true } : change
    ));
  };

  const handleRejectChange = (changeId: string) => {
    setProposedChanges(prev => prev.map(change =>
      change.id === changeId ? { ...change, accepted: false } : change
    ));
  };

  const handleApplyChanges = () => {
    // Apply accepted changes to the template
    const acceptedChanges = proposedChanges.filter(c => c.accepted === true);
    let modifiedTemplate = extractionPromptTemplate;

    acceptedChanges.forEach(change => {
      if (change.type === 'modify' && change.original) {
        modifiedTemplate = modifiedTemplate.replace(change.original, change.proposed);
      } else if (change.type === 'add') {
        modifiedTemplate += '\n' + change.proposed;
      }
    });

    dispatch(setExtractionPromptTemplate(modifiedTemplate));
    setProposedChanges([]);
    setPromptModifications('');
  };

  const handleClose = () => {
    if (isProcessing) {
      // Don't allow closing while processing
      return;
    }
    setPastedContent('');
    setSelectedFile(null);
    setShowFullPrompt(false);
    setActiveTab(0);
    setImportSuccess(false);
    setImportError(null);
    setProcessId(null);
    setPromptModifications('');
    setProposedChanges([]);
    setIsGeneratingModifications(false);
    onClose();
  };

  const handleFileChange = (event: any) => {
    const addedFiles = event.target.files;
    if (addedFiles && addedFiles.length > 0) {
      setSelectedFile(addedFiles[0]);
    }
  };

  const handleFileDelete = () => {
    setSelectedFile(null);
  };

  const canSubmit = () => {
    if (isProcessing) return false;
    if (activeTab === 0) return pastedContent.trim().length > 0;
    if (activeTab === 1) return selectedFile !== null;
    return false;
  };

  return (
    <Modal
      open={open}
      onRequestClose={handleClose}
      onRequestSubmit={handleSubmit}
      modalHeading="Import Agent Conversation"
      primaryButtonText={isProcessing ? 'Processing...' : 'Import & Extract'}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={!canSubmit()}
      preventCloseOnClickOutside={isProcessing}
      size="lg"
    >
      {isProcessing && processId && (
        <ProcessingProgress
          processId={processId}
          onComplete={handleProcessComplete}
          onError={handleProcessError}
        />
      )}

      {importSuccess && (
        <InlineNotification
          kind="success"
          title="Trip details extracted!"
          subtitle="Your trip has been fully analyzed and set up. All processing phases completed successfully."
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem' }}
        />
      )}

      {importError && !importSuccess && (
        <InlineNotification
          kind="error"
          title="Import failed"
          subtitle={importError}
          lowContrast
          onCloseButtonClick={() => setImportError(null)}
          style={{ marginBottom: '1rem' }}
        />
      )}

      {!isProcessing && (
        <div style={{ height: '520px', display: 'flex', flexDirection: 'column' }}>
          <Tabs selectedIndex={activeTab} onChange={(e) => setActiveTab(e.selectedIndex)} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <TabList aria-label="Import options" contained style={{ flexShrink: 0 }}>
              <Tab>Paste Conversation</Tab>
              <Tab>Upload File</Tab>
            </TabList>
            <TabPanels style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {/* Tab 1: Paste Conversation */}
              <TabPanel style={{ height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem' }}>
                {/* Section 1: Descriptive label */}
                <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
                    Paste your trip planning conversation or use the editable template to request a structured export from ChatGPT.
                  </p>
                </div>

                {/* Section 2: Content area (textarea or template editor) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: '1rem', overflow: 'hidden' }}>
                {!showFullPrompt ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <label htmlFor="paste-content" style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--cds-text-primary)' }}>
                      Conversation or Structured Trip Data
                    </label>
                    <textarea
                      id="paste-content"
                      placeholder={`Paste AI conversation or structured JSON here:

From ChatGPT export (JSON):
{ "conversationMetadata": {...}, "tripOverview": {...}, "detailedItinerary": [...] }

Or plain conversation:
User: Planning a trip to London for Christmas
Assistant: Great! What dates?...`}
                      value={pastedContent}
                      onChange={(e) => setPastedContent(e.target.value)}
                      style={{
                        flex: 1,
                        minHeight: 0,
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--cds-border-subtle)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--cds-field)',
                        color: 'var(--cds-text-primary)',
                        fontFamily: 'inherit',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        resize: 'none',
                        overflow: 'auto',
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
                          <Button
                            kind="primary"
                            size="sm"
                            onClick={handleApplyChanges}
                            disabled={!proposedChanges.some(c => c.accepted === true)}
                          >
                            Apply Changes ({proposedChanges.filter(c => c.accepted === true).length})
                          </Button>
                        )}
                        <Button
                          kind="ghost"
                          size="sm"
                          renderIcon={Copy}
                          iconDescription="Copy template"
                          hasIconOnly
                          onClick={() => {
                            navigator.clipboard.writeText(extractionPromptTemplate);
                          }}
                        />
                      </div>
                    </div>

                    {/* Show diff view if there are proposed changes */}
                    {proposedChanges.length > 0 ? (
                      <div style={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'auto',
                        backgroundColor: '#1e1e1e',
                        padding: '1rem',
                        borderRadius: '4px',
                        border: '1px solid #333',
                      }}>
                        {proposedChanges.map((change) => (
                          <div
                            key={change.id}
                            style={{
                              marginBottom: '1rem',
                              padding: '0.75rem',
                              backgroundColor: change.accepted === true ? 'rgba(46, 160, 67, 0.1)' :
                                             change.accepted === false ? 'rgba(218, 30, 40, 0.1)' :
                                             'rgba(255, 255, 255, 0.05)',
                              borderRadius: '4px',
                              border: change.accepted === true ? '1px solid rgba(46, 160, 67, 0.3)' :
                                     change.accepted === false ? '1px solid rgba(218, 30, 40, 0.3)' :
                                     '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#d4d4d4', fontWeight: 600 }}>
                                {change.type === 'modify' ? 'Modify' : change.type === 'add' ? 'Add' : 'Remove'}
                                {change.lineNumber && ` (Line ${change.lineNumber})`}
                              </span>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <IconButton
                                  label="Accept change"
                                  onClick={() => handleAcceptChange(change.id)}
                                  kind={change.accepted === true ? 'primary' : 'ghost'}
                                  size="sm"
                                >
                                  <Checkmark size={16} />
                                </IconButton>
                                <IconButton
                                  label="Reject change"
                                  onClick={() => handleRejectChange(change.id)}
                                  kind={change.accepted === false ? 'danger' : 'ghost'}
                                  size="sm"
                                >
                                  <Close size={16} />
                                </IconButton>
                              </div>
                            </div>
                            {change.original && (
                              <div style={{
                                padding: '0.5rem',
                                backgroundColor: 'rgba(218, 30, 40, 0.15)',
                                borderLeft: '3px solid #da1e28',
                                marginBottom: '0.5rem',
                                fontFamily: '"IBM Plex Mono", "Menlo", "Monaco", "Courier New", monospace',
                                fontSize: '0.75rem',
                                color: '#ff6b6b',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}>
                                - {change.original}
                              </div>
                            )}
                            <div style={{
                              padding: '0.5rem',
                              backgroundColor: 'rgba(46, 160, 67, 0.15)',
                              borderLeft: '3px solid #2ea043',
                              fontFamily: '"IBM Plex Mono", "Menlo", "Monaco", "Courier New", monospace',
                              fontSize: '0.75rem',
                              color: '#6fdc8c',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}>
                              + {change.proposed}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        value={extractionPromptTemplate}
                        onChange={(e) => dispatch(setExtractionPromptTemplate(e.target.value))}
                        style={{
                          width: '100%',
                          flex: 1,
                          minHeight: 0,
                          overflow: 'auto',
                          backgroundColor: '#1e1e1e',
                          color: '#d4d4d4',
                          padding: '1rem',
                          borderRadius: '4px',
                          border: '1px solid #333',
                          fontFamily: '"IBM Plex Mono", "Menlo", "Monaco", "Courier New", monospace',
                          fontSize: '0.8125rem',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          resize: 'none',
                        }}
                      />
                    )}
                  </div>
                )}
                </div>

                {/* Workflow helper text */}
                <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '0.75rem', flexShrink: 0 }}>
                  <strong>Workflow:</strong> Copy template → Paste in ChatGPT → Get structured JSON → Paste above → Import
                </div>

                {/* Section 3: Button container */}
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--cds-layer-01)',
                  borderRadius: '4px',
                  flexShrink: 0,
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      className="cds--btn cds--btn--primary cds--btn--sm"
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(extractionPromptTemplate);
                      }}
                    >
                      Copy Request Template
                    </button>
                    <button
                      className="cds--btn cds--btn--secondary cds--btn--sm"
                      type="button"
                      onClick={() => setShowFullPrompt(!showFullPrompt)}
                    >
                      {showFullPrompt ? 'Hide Template' : 'View Template'}
                    </button>
                  </div>
                </div>

                {/* Section 4: Chat input for modifying request template */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Modify Request Template with AI
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                      Describe changes you want to the extraction prompt (e.g., focus on specific details, add validation rules, check for ambiguities)
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <TextArea
                        id="prompt-modifications"
                        labelText=""
                        placeholder="e.g., 'Add extra validation for hotel confirmation numbers' or 'Focus on extracting restaurant dietary restrictions'"
                        value={promptModifications}
                        onChange={(e) => setPromptModifications(e.target.value)}
                        rows={2}
                        disabled={isGeneratingModifications}
                      />
                    </div>
                    <IconButton
                      label="Generate modifications"
                      onClick={handleGenerateModifications}
                      disabled={!promptModifications.trim() || isGeneratingModifications}
                      kind="primary"
                      size="lg"
                    >
                      {isGeneratingModifications ? <Loading small withOverlay={false} /> : <SendAlt size={20} />}
                    </IconButton>
                  </div>
                </div>
              </div>
            </TabPanel>

            {/* Tab 2: Upload File */}
            <TabPanel style={{ height: '100%' }}>
              <div style={{ height: '100%', overflow: 'auto', padding: '1rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
                    Upload a trip document file in JSON, Markdown, or plain text format.
                  </p>
                </div>

                <FileUploader
                  labelTitle="Upload Trip Document"
                  labelDescription="Supported formats: JSON, Markdown, Text (.json, .md, .txt)"
                  buttonLabel="Choose file"
                  filenameStatus="edit"
                  accept={['.json', '.md', '.txt']}
                  multiple={false}
                  disabled={isProcessing}
                  iconDescription="Delete file"
                  name="trip-document"
                  onChange={handleFileChange}
                  onDelete={handleFileDelete}
                  size="md"
                />
                {selectedFile && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--cds-layer-01)', borderRadius: '4px' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Selected File
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
        </div>
      )}
    </Modal>
  );
}

export default ImportAgentModal;
