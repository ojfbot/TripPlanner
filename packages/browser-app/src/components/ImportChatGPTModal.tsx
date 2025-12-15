import { useState } from 'react';
import {
  Modal,
  TextArea,
  FileUploader,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  InlineNotification,
  Loading,
} from '@carbon/react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { importChatGPTTranscript, importChatGPTFile, fetchDocuments } from '../store/slices/documentsSlice';

interface ImportChatGPTModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  threadId?: string;
}

function ImportChatGPTModal({ open, onClose, userId, threadId }: ImportChatGPTModalProps) {
  const dispatch = useAppDispatch();
  const { isImporting, error } = useAppSelector((state) => state.documents);

  const [pastedContent, setPastedContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleSubmit = async () => {
    try {
      setImportSuccess(false);

      if (activeTab === 0) {
        // Paste tab
        if (!pastedContent.trim()) {
          return;
        }

        await dispatch(
          importChatGPTTranscript({
            userId,
            content: pastedContent,
            threadId,
          })
        ).unwrap();
      } else {
        // Upload tab
        if (!selectedFile) {
          return;
        }

        await dispatch(
          importChatGPTFile({
            userId,
            file: selectedFile,
            threadId,
          })
        ).unwrap();
      }

      // Refresh documents list
      await dispatch(fetchDocuments({ userId }));

      // Show success and reset form
      setImportSuccess(true);
      setPastedContent('');
      setSelectedFile(null);

      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      // Error is handled by Redux state
      console.error('Import failed:', err);
    }
  };

  const handleClose = () => {
    setPastedContent('');
    setSelectedFile(null);
    setImportSuccess(false);
    onClose();
  };

  const handleFileChange = (event: any) => {
    const addedFiles = event.target.files;
    if (addedFiles && addedFiles.length > 0) {
      setSelectedFile(addedFiles[0]);
    }
  };

  const canSubmit = () => {
    if (isImporting) return false;
    if (activeTab === 0) return pastedContent.trim().length > 0;
    return selectedFile !== null;
  };

  return (
    <Modal
      open={open}
      onRequestClose={handleClose}
      onRequestSubmit={handleSubmit}
      modalHeading="Import ChatGPT Conversation"
      primaryButtonText={isImporting ? 'Importing...' : 'Import'}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={!canSubmit()}
      size="lg"
    >
      {isImporting && (
        <Loading description="Importing conversation..." withOverlay />
      )}

      {importSuccess && (
        <InlineNotification
          kind="success"
          title="Import successful"
          subtitle="Your conversation has been imported and is being processed for RAG."
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem' }}
        />
      )}

      {error && !importSuccess && (
        <InlineNotification
          kind="error"
          title="Import failed"
          subtitle={error}
          lowContrast
          onCloseButtonClick={() => {}}
          style={{ marginBottom: '1rem' }}
        />
      )}

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
          Import a ChatGPT conversation to make it searchable through RAG (Retrieval-Augmented Generation).
          You can paste the conversation text or upload an exported JSON file.
        </p>
      </div>

      <Tabs selectedIndex={activeTab} onChange={(evt: any) => setActiveTab(evt.selectedIndex)}>
        <TabList aria-label="Import method tabs">
          <Tab>Paste Text</Tab>
          <Tab>Upload File</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <TextArea
              id="paste-content"
              labelText="Conversation Content"
              placeholder={`Paste your ChatGPT conversation here in either format:

JSON Format (from ChatGPT export):
{ "title": "...", "mapping": { ... } }

Or Text Format:
User: Hello, can you help me?
Assistant: Of course! What can I help you with?`}
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              rows={12}
              disabled={isImporting}
            />
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
              Supports both JSON exports from ChatGPT and plain text format with "User:" and "Assistant:" labels.
            </div>
          </TabPanel>
          <TabPanel>
            <FileUploader
              labelTitle="Upload transcript file"
              labelDescription="Select a .json or .txt file exported from ChatGPT (max 10 MB)"
              buttonLabel="Select file"
              filenameStatus="edit"
              accept={['.json', '.txt']}
              multiple={false}
              disabled={isImporting}
              onChange={handleFileChange}
            />
            {selectedFile && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--cds-layer-01)', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.875rem' }}>
                  <strong>Selected file:</strong> {selectedFile.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>
                  Size: {(selectedFile.size / 1024).toFixed(2)} KB
                </div>
              </div>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      <div style={{
        marginTop: '1.5rem',
        padding: '0.75rem',
        backgroundColor: 'var(--cds-layer-02)',
        borderRadius: '4px',
        fontSize: '0.75rem'
      }}>
        <strong>How to export from ChatGPT:</strong>
        <ol style={{ marginTop: '0.5rem', marginLeft: '1.25rem', marginBottom: 0 }}>
          <li>Open ChatGPT and go to Settings → Data controls</li>
          <li>Click "Export data" to download your conversations</li>
          <li>Extract the ZIP file and locate the conversation JSON file</li>
          <li>Upload it here or copy-paste its contents</li>
        </ol>
      </div>
    </Modal>
  );
}

export default ImportChatGPTModal;
