import { Tag, Tooltip } from '@carbon/react';
import { Upload } from '@carbon/icons-react';
import { useAppDispatch } from '../store/hooks';
import { setImportModalOpen } from '../store/slices/uiSlice';

interface ImportAgentBadgeProps {
  onImportStart?: () => void;
}

function ImportAgentBadge({ onImportStart }: ImportAgentBadgeProps) {
  const dispatch = useAppDispatch();

  const handleClick = () => {
    dispatch(setImportModalOpen(true));
    onImportStart?.();
  };

  return (
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
  );
}

export default ImportAgentBadge;
