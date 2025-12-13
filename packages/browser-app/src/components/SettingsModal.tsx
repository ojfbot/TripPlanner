import { Modal, Tile } from '@carbon/react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

function SettingsModal({ open, onClose }: SettingsModalProps) {
  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="Settings"
      primaryButtonText="Close"
      onRequestSubmit={onClose}
      size="md"
    >
      <Tile>
        <p>Configure your TripPlanner preferences and account settings.</p>
        <p style={{ marginTop: '1rem', color: 'var(--cds-text-secondary)' }}>
          Coming soon: User preferences, notification settings, and integrations.
        </p>
      </Tile>
    </Modal>
  );
}

export default SettingsModal;
