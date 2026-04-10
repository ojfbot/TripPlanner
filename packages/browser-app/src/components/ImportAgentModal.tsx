import {
  Modal,
  InlineNotification,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@carbon/react';
import { useAppSelector } from '../store/hooks';
import ProcessingProgress from './ProcessingProgress';
import { useImportAgent } from './import-agent/useImportAgent';
import { ImportPasteTab } from './import-agent/ImportPasteTab';
import { ImportFileTab } from './import-agent/ImportFileTab';

interface ImportAgentModalProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

function ImportAgentModal({ open, onClose, onComplete }: ImportAgentModalProps) {
  const appSwitcherExpanded = useAppSelector((state) => state.ui.appSwitcherExpanded);
  const agent = useImportAgent(onClose, onComplete);

  return (
    <Modal
      open={open}
      onRequestClose={agent.handleClose}
      onRequestSubmit={agent.handleSubmit}
      modalHeading="Import Agent Conversation"
      primaryButtonText={agent.isProcessing ? 'Processing...' : 'Import & Extract'}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={!agent.canSubmit()}
      preventCloseOnClickOutside={true}
      size="lg"
      className={`import-agent-modal ${appSwitcherExpanded ? 'app-switcher-active' : ''}`}
    >
      {agent.isProcessing && agent.processId && (
        <ProcessingProgress
          processId={agent.processId}
          onComplete={agent.handleProcessComplete}
          onError={agent.handleProcessError}
        />
      )}

      {agent.importSuccess && (
        <InlineNotification
          kind="success"
          title="Trip details extracted!"
          subtitle="Your trip has been fully analyzed and set up. All processing phases completed successfully."
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem' }}
        />
      )}

      {agent.importError && !agent.importSuccess && (
        <InlineNotification
          kind="error"
          title="Import failed"
          subtitle={agent.importError}
          lowContrast
          onCloseButtonClick={() => agent.setImportError(null)}
          style={{ marginBottom: '1rem' }}
        />
      )}

      {!agent.isProcessing && (
        <div style={{ height: '65vh', maxHeight: '750px', minHeight: '600px' }}>
          <Tabs selectedIndex={agent.activeTab} onChange={(e) => agent.setActiveTab(e.selectedIndex)}>
            <TabList aria-label="Import options" contained style={{ marginBottom: '1rem' }}>
              <Tab>Paste Conversation</Tab>
              <Tab>Upload File</Tab>
            </TabList>
            <div style={{ height: 'calc(100% - 60px)', overflow: 'auto' }}>
              <TabPanels>
                <TabPanel style={{ height: '100%' }}>
                  <ImportPasteTab
                    pastedContent={agent.pastedContent}
                    onPastedContentChange={agent.setPastedContent}
                    showFullPrompt={agent.showFullPrompt}
                    onToggleFullPrompt={() => agent.setShowFullPrompt(!agent.showFullPrompt)}
                    showAIEditor={agent.showAIEditor}
                    onToggleAIEditor={() => agent.setShowAIEditor(!agent.showAIEditor)}
                    extractionPromptTemplate={agent.extractionPromptTemplate}
                    proposedChanges={agent.proposedChanges}
                    onAcceptChange={agent.handleAcceptChange}
                    onRejectChange={agent.handleRejectChange}
                    onApplyChanges={agent.handleApplyChanges}
                    promptModifications={agent.promptModifications}
                    onPromptModificationsChange={agent.setPromptModifications}
                    onGenerateModifications={agent.handleGenerateModifications}
                  />
                </TabPanel>
                <TabPanel style={{ height: '100%' }}>
                  <ImportFileTab
                    selectedFile={agent.selectedFile}
                    isProcessing={agent.isProcessing}
                    onFileChange={agent.handleFileChange}
                    onFileDelete={agent.handleFileDelete}
                  />
                </TabPanel>
              </TabPanels>
            </div>
          </Tabs>
        </div>
      )}
    </Modal>
  );
}

export default ImportAgentModal;
