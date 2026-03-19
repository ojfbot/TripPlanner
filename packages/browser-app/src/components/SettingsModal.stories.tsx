import type { Meta, StoryObj } from '@storybook/react'
import SettingsModal from './SettingsModal'

const meta: Meta<typeof SettingsModal> = {
  title: 'Components/SettingsModal',
  component: SettingsModal,
  argTypes: {
    onClose: { action: 'closed' },
  },
}

export default meta
type Story = StoryObj<typeof SettingsModal>

export const Open: Story = {
  args: {
    open: true,
    onClose: () => {},
  },
}

export const Closed: Story = {
  args: {
    open: false,
    onClose: () => {},
  },
}
