import type { Meta, StoryObj } from '@storybook/react'
import WholeTripPanel from './WholeTripPanel'
import { withMockStore } from './__mocks__/storeDecorator'
import { mockTokyoTrip } from './__mocks__/mockItinerary'

const meta: Meta<typeof WholeTripPanel> = {
  title: 'Itineraries/WholeTripPanel',
  component: WholeTripPanel,
}

export default meta
type Story = StoryObj<typeof WholeTripPanel>

export const AutoGranularity: Story = {
  decorators: [
    withMockStore({
      currentItinerary: mockTokyoTrip,
      granularity: 'auto',
    }),
  ],
}

export const DailyGranularity: Story = {
  decorators: [
    withMockStore({
      currentItinerary: mockTokyoTrip,
      granularity: 'daily',
    }),
  ],
}

export const HourlyGranularity: Story = {
  decorators: [
    withMockStore({
      currentItinerary: mockTokyoTrip,
      granularity: 'hourly',
    }),
  ],
}

export const NoItinerary: Story = {
  decorators: [
    withMockStore({
      currentItinerary: null,
    }),
  ],
}
