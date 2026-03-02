import { Tile, Button } from '@carbon/react';
import { Upload } from '@carbon/icons-react';

function IntegrationsLibrary() {
  return (
    <div className="dashboard-content" data-element="integrations-library">
      <Tile
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '4rem 2rem',
          minHeight: '400px',
        }}
      >
        <Upload size={48} style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>
          No integrations configured
        </h3>
        <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>
          Upload trip documents or connect external services to get started
        </p>
        <Button renderIcon={Upload} kind="primary">
          Upload File
        </Button>
      </Tile>
    </div>
  );
}

export default IntegrationsLibrary;
