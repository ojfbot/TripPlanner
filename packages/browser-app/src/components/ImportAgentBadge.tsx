import { useState } from 'react';
import { Tag, Tooltip } from '@carbon/react';
import { Upload } from '@carbon/icons-react';
import ImportAgentModal from './ImportAgentModal';

interface ImportAgentBadgeProps {
  onImportStart?: () => void;
  onImportComplete?: () => void;
}

function ImportAgentBadge({ onImportStart, onImportComplete }: ImportAgentBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = () => {
    setModalOpen(true);
    onImportStart?.();
  };

  const handleClose = () => {
    setModalOpen(false);
  };

  const handleComplete = () => {
    setModalOpen(false);
    onImportComplete?.();
  };

  return (
    <>
      <Tooltip
        align="bottom"
        label="Import AI conversation"
      >
        <Tag
          renderIcon={Upload}
          type="blue"
          onClick={handleClick}
          className="quick-action-tag"
          size="sm"
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <span className="action-icon">📥</span>
          Import Agent
        </Tag>
      </Tooltip>

      <ImportAgentModal
        open={modalOpen}
        onClose={handleClose}
        onComplete={handleComplete}
      />
    </>
  );
}

export default ImportAgentBadge;
