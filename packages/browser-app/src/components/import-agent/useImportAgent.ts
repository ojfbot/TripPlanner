import { useState } from 'react';
import { apiClient } from '../../api/client';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setTripData } from '../../store/slices/tripSlice';
import { addMessage } from '../../store/slices/chatSlice';
import { setExtractionPromptTemplate } from '../../store/slices/uiSlice';

const USER_ID = 'default-user'; // TODO: Replace with actual user authentication

export interface ProposedChange {
  id: string;
  type: 'add' | 'remove' | 'modify';
  original?: string;
  proposed: string;
  lineNumber?: number;
  accepted?: boolean;
}

export function useImportAgent(onClose: () => void, onComplete?: () => void) {
  const dispatch = useAppDispatch();
  const extractionPromptTemplate = useAppSelector((state) => state.ui.extractionPromptTemplate);

  const [pastedContent, setPastedContent] = useState('');
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [showAIEditor, setShowAIEditor] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [processId, setProcessId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [promptModifications, setPromptModifications] = useState('');
  const [isGeneratingModifications, setIsGeneratingModifications] = useState(false);
  const [proposedChanges, setProposedChanges] = useState<ProposedChange[]>([]);

  const handleClose = () => {
    if (isProcessing) return;
    setPastedContent('');
    setSelectedFile(null);
    setShowFullPrompt(false);
    setShowAIEditor(false);
    setActiveTab(0);
    setImportSuccess(false);
    setImportError(null);
    setProcessId(null);
    setPromptModifications('');
    setProposedChanges([]);
    setIsGeneratingModifications(false);
    onClose();
  };

  const handleSubmit = async () => {
    try {
      setImportSuccess(false);
      setImportError(null);
      setIsProcessing(true);

      let content = '';
      if (pastedContent.trim()) {
        content = pastedContent;
      } else if (selectedFile) {
        content = await selectedFile.text();
      } else {
        return;
      }

      const response = await apiClient.post('/api/v1/integrations/chatgpt/import/intelligent', {
        userId: USER_ID,
        content,
      });
      setProcessId(response.data.processId);
    } catch (err) {
      console.error('Import failed:', err);
      setImportError(err instanceof Error ? err.message : 'Failed to start import');
      setIsProcessing(false);
    }
  };

  const handleProcessComplete = (data: any) => {
    if (data.extractedData) {
      dispatch(setTripData(data.extractedData));
    }
    const destinationCount = data.extractedData?.destinations?.length || 0;
    dispatch(addMessage({
      role: 'assistant',
      content: `I've analyzed your conversation and set up your trip! I found ${destinationCount} destination(s) and extracted key trip information. The system went through all processing phases including text extraction, semantic analysis, and AI-powered data extraction. You can start planning using the chat below.`,
    }));
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
      setShowFullPrompt(true);
      const response = await apiClient.post('/api/v1/integrations/chatgpt/modify-prompt', {
        currentPrompt: extractionPromptTemplate,
        userRequest: promptModifications,
      });
      const changes = response.data.changes || [];
      setProposedChanges(changes.map((change: any, idx: number) => ({
        ...change,
        id: `change-${idx}`,
        accepted: undefined,
      })));
    } catch (err) {
      console.error('Failed to generate modifications:', err);
      setProposedChanges([{
        id: 'change-1',
        type: 'modify',
        original: '### 2. TIME & SCHEDULING ACCURACY',
        proposed: '### 2. TIME & SCHEDULING ACCURACY\n' + promptModifications,
        lineNumber: 17,
        accepted: undefined,
      }]);
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

  return {
    // State
    pastedContent, setPastedContent,
    showFullPrompt, setShowFullPrompt,
    showAIEditor, setShowAIEditor,
    selectedFile,
    activeTab, setActiveTab,
    processId,
    isProcessing,
    importSuccess,
    importError, setImportError,
    promptModifications, setPromptModifications,
    isGeneratingModifications,
    proposedChanges,
    extractionPromptTemplate,
    // Handlers
    handleClose,
    handleSubmit,
    handleProcessComplete,
    handleProcessError,
    handleGenerateModifications,
    handleAcceptChange,
    handleRejectChange,
    handleApplyChanges,
    handleFileChange,
    handleFileDelete,
    canSubmit,
  };
}
