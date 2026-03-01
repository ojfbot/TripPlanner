/**
 * TripPlanner SettingsPanel — bare panel exposed via MF './Settings' to the shell.
 *
 * Full SettingsDashboard depends on TripPlanner's documentsSlice Redux store;
 * migrating it is deferred to a follow-up phase.
 * This stub satisfies the shell's ./Settings contract in the meantime.
 *
 * Shell provides the <Modal> chrome; this component owns only placeholder content.
 */

import { Tile } from '@carbon/react'

interface SettingsPanelProps {
  onClose?: () => void
}

export default function SettingsPanel(_props: SettingsPanelProps) {
  return (
    <Tile>
      <p>Configure your TripPlanner preferences and account settings.</p>
      <p style={{ marginTop: '1rem', color: 'var(--cds-text-secondary)' }}>
        Coming soon: User preferences, notification settings, and integrations.
      </p>
    </Tile>
  )
}
