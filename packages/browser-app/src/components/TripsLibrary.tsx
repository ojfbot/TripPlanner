import { useState, useEffect } from 'react';
import {
  Heading,
  Tile,
  Button,
  Grid,
  Column,
  Tag,
  Loading,
  Modal,
  CodeSnippet,
} from '@carbon/react';
import {
  Upload,
  Checkmark,
  WarningAlt,
  Time,
  View,
} from '@carbon/icons-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchDocuments } from '../store/slices/documentsSlice';
import ImportAgentModal from './ImportAgentModal';

function TripsLibrary() {
  const dispatch = useAppDispatch();
  const { documents, isLoading } = useAppSelector(state => state.documents);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);

  // Fetch documents on mount
  useEffect(() => {
    console.log('[TripsLibrary] Fetching documents for default-user');
    dispatch(fetchDocuments({ userId: 'default-user' }));
  }, [dispatch]);

  // Debug: Log documents state changes
  useEffect(() => {
    console.log('[TripsLibrary] Documents state updated:', {
      isLoading,
      documentCount: documents.length,
      documents: documents.map(d => ({
        id: d.documentId,
        title: d.title,
        extractionStatus: d.extractionStatus,
        hasExtractedData: !!d.extractedData,
        extractedDataPreview: d.extractedData?.substring(0, 100)
      }))
    });
  }, [documents, isLoading]);

  const getExtractionStatus = (doc: any) => {
    if (doc.extractionStatus === 'completed') return { icon: Checkmark, color: 'green', text: 'Extracted' };
    if (doc.extractionStatus === 'processing') return { icon: Time, color: 'blue', text: 'Processing' };
    if (doc.extractionStatus === 'failed') return { icon: WarningAlt, color: 'red', text: 'Failed' };
    return { icon: Time, color: 'gray', text: 'Pending' };
  };

  const getEmbeddingStatus = (doc: any) => {
    if (doc.embeddingStatus === 'completed') return { icon: Checkmark, color: 'green', text: 'Indexed' };
    if (doc.embeddingStatus === 'processing') return { icon: Time, color: 'blue', text: 'Indexing' };
    if (doc.embeddingStatus === 'failed') return { icon: WarningAlt, color: 'red', text: 'Failed' };
    return { icon: Time, color: 'gray', text: 'Pending' };
  };

  const renderVisionTile = (doc: any) => {
    const extractionStatus = getExtractionStatus(doc);
    const embeddingStatus = getEmbeddingStatus(doc);
    const ExtractionIcon = extractionStatus.icon;
    const EmbeddingIcon = embeddingStatus.icon;

    const metadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata;
    const messageCount = metadata?.messageCount || metadata?.stats?.messageCount || 0;
    const chunks = metadata?.chunks || 0;
    const embeddings = metadata?.embeddings || 0;

    // Parse raw content to show conversation preview
    let conversationPreview = 'Loading conversation...';
    try {
      const rawContent = typeof doc.rawContent === 'string' ? JSON.parse(doc.rawContent) : doc.rawContent;
      conversationPreview = `${rawContent.title || 'Untitled Conversation'} - ${messageCount} messages`;
    } catch (e) {
      console.error('Failed to parse raw content:', e);
    }

    return (
      <Tile
        key={doc.documentId}
        data-element="vision-tile"
        style={{
          minHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          border: '2px solid transparent',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--cds-border-interactive)';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'transparent';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        onClick={() => {
          setSelectedDocument(doc);
          setJsonModalOpen(true);
        }}
      >
        {/* Status Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <Tag type={extractionStatus.color as any} size="sm">
            <ExtractionIcon size={12} style={{ marginRight: '4px' }} />
            {extractionStatus.text}
          </Tag>
          <Tag type={embeddingStatus.color as any} size="sm">
            <EmbeddingIcon size={12} style={{ marginRight: '4px' }} />
            {embeddingStatus.text}
          </Tag>
        </div>

        {/* Title */}
        <Heading style={{ fontSize: '1.25rem', marginBottom: '0.75rem', lineHeight: '1.3' }}>
          {doc.title}
        </Heading>

        {/* Conversation Preview */}
        <p style={{
          color: 'var(--cds-text-secondary)',
          fontSize: '0.875rem',
          marginBottom: '1rem',
          lineHeight: '1.5'
        }}>
          {conversationPreview}
        </p>

        {/* Agent Analysis Strategy */}
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--cds-layer-01)',
          borderRadius: '4px',
          marginBottom: '0.75rem',
          borderLeft: '3px solid var(--cds-border-interactive)'
        }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>
            LangGraph Agent Extraction Strategy
          </p>
          <ul style={{ fontSize: '0.7rem', color: 'var(--cds-text-primary)', lineHeight: '1.5', marginLeft: '1rem', listStyle: 'disc' }}>
            <li>Works <strong>backwards</strong> from most recent conversation entries</li>
            <li>Extracts itinerary with <strong>minute-level granularity</strong></li>
            <li>Detects reservations - assumes booking if reservable, searches history for confirmation</li>
            <li>Finds <strong>3 valid options per slot</strong> from conversation depth</li>
            <li>Verifies context, reasoning, and documentation links for accuracy</li>
          </ul>
          <p style={{ fontSize: '0.65rem', color: 'var(--cds-text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
            See AGENT_EXTRACTION_SPEC.md for full requirements
          </p>
        </div>

        {/* View Raw JSON Note */}
        <p style={{
          color: 'var(--cds-text-secondary)',
          fontSize: '0.75rem',
          fontStyle: 'italic'
        }}>
          Click tile to view formatted conversation JSON
        </p>

        {/* Footer Stats */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '1rem',
            borderTop: '1px solid var(--cds-border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
            <span>{messageCount} messages</span>
            {chunks > 0 && <span>{chunks} chunks</span>}
            {embeddings > 0 && <span>{embeddings} embeddings</span>}
          </div>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={View}
            iconDescription="View JSON"
            hasIconOnly
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDocument(doc);
              setJsonModalOpen(true);
            }}
          />
        </div>
      </Tile>
    );
  };

  return (
    <div className="dashboard-content" data-element="trips-library">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Heading className="section-header">Trip Vision</Heading>
        <Button
          renderIcon={Upload}
          kind="primary"
          onClick={() => setImportModalOpen(true)}
        >
          Import Trip Document
        </Button>
      </div>

      <Grid narrow>
        <Column lg={12} md={8} sm={4}>
          <Tile style={{ marginBottom: '2rem' }}>
            <p style={{ color: 'var(--cds-text-secondary)' }}>
              Import ChatGPT conversations or trip documents. AI will extract destinations, dates, preferences,
              and create searchable trip knowledge for intelligent recommendations.
            </p>
          </Tile>
        </Column>
      </Grid>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loading description="Loading your trips..." withOverlay={false} />
        </div>
      ) : documents.length === 0 ? (
        <>
          <Heading style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--cds-text-secondary)' }}>
            No trip documents yet
          </Heading>
          <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '1.5rem' }}>
            Import a ChatGPT conversation about your trip planning to get started
          </p>
        </>
      ) : (
        <>
          <Heading style={{ fontSize: '1rem', marginBottom: '1rem' }}>
            Your Trip Documents ({documents.length})
          </Heading>
          <div className="card-container">
            {documents.map(renderVisionTile)}
          </div>
        </>
      )}

      {/* Import Modal */}
      <ImportAgentModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onComplete={() => {
          setImportModalOpen(false);
          dispatch(fetchDocuments({ userId: 'default-user' }));
        }}
      />

      {/* JSON Preview Modal */}
      <Modal
        open={jsonModalOpen}
        onRequestClose={() => setJsonModalOpen(false)}
        modalHeading={`Conversation: ${selectedDocument?.title || 'Unknown'}`}
        modalLabel="Raw Conversation JSON"
        passiveModal
        size="lg"
      >
        {selectedDocument && (
          <div>
            <Heading style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Processing Status
            </Heading>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {(() => {
                const extractionStatus = getExtractionStatus(selectedDocument);
                const embeddingStatus = getEmbeddingStatus(selectedDocument);
                const ExtractionIcon = extractionStatus.icon;
                const EmbeddingIcon = embeddingStatus.icon;
                return (
                  <>
                    <Tag type={extractionStatus.color as any}>
                      <ExtractionIcon size={12} style={{ marginRight: '4px' }} />
                      {extractionStatus.text}
                    </Tag>
                    <Tag type={embeddingStatus.color as any}>
                      <EmbeddingIcon size={12} style={{ marginRight: '4px' }} />
                      {embeddingStatus.text}
                    </Tag>
                  </>
                );
              })()}
            </div>

            <Heading style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Conversation JSON (Formatted)
            </Heading>
            <div style={{ maxHeight: '500px', overflow: 'auto', marginBottom: '1rem' }}>
              <CodeSnippet
                type="multi"
                feedback="Copied!"
              >
                {selectedDocument.rawContent
                  ? JSON.stringify(
                      typeof selectedDocument.rawContent === 'string'
                        ? JSON.parse(selectedDocument.rawContent)
                        : selectedDocument.rawContent,
                      null,
                      2
                    )
                  : 'No conversation data available'}
              </CodeSnippet>
            </div>

            <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--cds-layer-01)', borderRadius: '4px' }}>
              <Heading style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                Audit Trail
              </Heading>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                <div>Uploaded: {new Date(selectedDocument.createdAt).toLocaleString()}</div>
                <div>Last Processed: {new Date(selectedDocument.updatedAt).toLocaleString()}</div>
                <div>Document ID: {selectedDocument.documentId}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default TripsLibrary;
