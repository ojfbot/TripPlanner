import { useState, useEffect } from 'react';
import { Tile, Button, Grid, Column, DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, Tag } from '@carbon/react';
import { Add, TrashCan, DocumentBlank } from '@carbon/icons-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchDocuments, deleteDocument } from '../store/slices/documentsSlice';
import OpenAIStatusCard from './OpenAIStatusCard';
import ImportChatGPTModal from './ImportChatGPTModal';
import ChatGPTSessionLinkTile from './ChatGPTSessionLinkTile';

const USER_ID = 'default-user'; // TODO: Replace with actual user authentication

function SettingsDashboard() {
  const dispatch = useAppDispatch();
  const { documents, isLoading } = useAppSelector((state) => state.documents);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    // Fetch documents on mount
    dispatch(fetchDocuments({ userId: USER_ID }));
  }, [dispatch]);

  const handleDeleteDocument = async (documentId: string) => {
    if (confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      await dispatch(deleteDocument(documentId));
      dispatch(fetchDocuments({ userId: USER_ID }));
    }
  };

  const getEmbeddingStatusTag = (status: string) => {
    switch (status) {
      case 'completed':
        return <Tag type="green">Ready</Tag>;
      case 'processing':
        return <Tag type="blue">Processing</Tag>;
      case 'pending':
        return <Tag type="gray">Pending</Tag>;
      case 'failed':
        return <Tag type="red">Failed</Tag>;
      default:
        return <Tag type="gray">{status}</Tag>;
    }
  };

  const headers = [
    { key: 'title', header: 'Title' },
    { key: 'type', header: 'Type' },
    { key: 'messageCount', header: 'Messages' },
    { key: 'status', header: 'Status' },
    { key: 'createdAt', header: 'Imported' },
    { key: 'actions', header: 'Actions' },
  ];

  const rows = documents.map((doc) => ({
    id: doc.documentId,
    title: doc.title,
    type: doc.type === 'chatgpt_transcript' ? 'ChatGPT' : doc.type,
    messageCount: doc.metadata.messageCount || '-',
    status: getEmbeddingStatusTag(doc.embeddingStatus),
    createdAt: new Date(doc.createdAt).toLocaleDateString(),
    actions: doc.documentId,
  }));

  return (
    <div style={{ padding: '1.5rem' }}>
      <Grid>
        <Column lg={16} md={8} sm={4}>
          <h2 style={{ marginBottom: '1.5rem' }}>Settings</h2>
        </Column>

        {/* AI & LLM Integration Section */}
        <Column lg={16} md={8} sm={4}>
          <h3 style={{ marginBottom: '1rem' }}>AI & LLM Integration</h3>
        </Column>

        <Column lg={8} md={4} sm={4}>
          <OpenAIStatusCard />
        </Column>

        <Column lg={8} md={4} sm={4}>
          <ChatGPTSessionLinkTile />
        </Column>

        {/* Imported Documents Section */}
        <Column lg={16} md={8} sm={4} style={{ marginTop: '2rem' }}>
          <Tile>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h4>Imported Conversations</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>
                  ChatGPT conversations imported for RAG search and context
                </p>
              </div>
              <Button
                kind="primary"
                size="sm"
                renderIcon={Add}
                onClick={() => setImportModalOpen(true)}
              >
                Import Conversation
              </Button>
            </div>

            {documents.length === 0 && !isLoading ? (
              <div
                style={{
                  padding: '3rem 1rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--cds-layer-01)',
                  borderRadius: '4px',
                }}
              >
                <DocumentBlank size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <h5 style={{ marginBottom: '0.5rem' }}>No conversations imported yet</h5>
                <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '1rem' }}>
                  Import your ChatGPT conversations to make them searchable through RAG
                </p>
                <Button
                  kind="tertiary"
                  size="sm"
                  onClick={() => setImportModalOpen(true)}
                >
                  Import your first conversation
                </Button>
              </div>
            ) : (
              <DataTable rows={rows} headers={headers}>
                {({ rows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
                  <Table {...getTableProps()} size="sm">
                    <TableHead>
                      <TableRow>
                        {headers.map((header: any) => (
                          <TableHeader {...getHeaderProps({ header })} key={header.key}>
                            {header.header}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row: any) => (
                        <TableRow {...getRowProps({ row })} key={row.id}>
                          {row.cells.map((cell: any) => (
                            <TableCell key={cell.id}>
                              {cell.info.header === 'actions' ? (
                                <Button
                                  kind="ghost"
                                  size="sm"
                                  renderIcon={TrashCan}
                                  iconDescription="Delete"
                                  hasIconOnly
                                  onClick={() => handleDeleteDocument(cell.value)}
                                />
                              ) : (
                                cell.value
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DataTable>
            )}
          </Tile>
        </Column>

        {/* Other Settings Section Placeholder */}
        <Column lg={16} md={8} sm={4} style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Other Settings</h3>
          <Tile>
            <h4 style={{ marginBottom: '0.5rem' }}>User Preferences</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
              Coming soon: Notification settings, display preferences, and more.
            </p>
          </Tile>
        </Column>
      </Grid>

      <ImportChatGPTModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        userId={USER_ID}
      />
    </div>
  );
}

export default SettingsDashboard;
