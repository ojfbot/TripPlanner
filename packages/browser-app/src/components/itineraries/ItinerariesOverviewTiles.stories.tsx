import type { Meta, StoryObj } from '@storybook/react'
import ItinerariesOverviewTiles from './ItinerariesOverviewTiles'
import { withMockStore } from './__mocks__/storeDecorator'
import { mockTokyoTrip } from './__mocks__/mockItinerary'

const meta: Meta<typeof ItinerariesOverviewTiles> = {
  title: 'Itineraries/ItinerariesOverviewTiles',
  component: ItinerariesOverviewTiles,
}

export default meta
type Story = StoryObj<typeof ItinerariesOverviewTiles>

export const WithTrip: Story = {
  decorators: [
    withMockStore({
      currentItinerary: mockTokyoTrip,
    }),
  ],
}

export const EmptyTrip: Story = {
  decorators: [
    withMockStore({
      currentItinerary: {
        ...mockTokyoTrip,
        items: [],
        title: 'Weekend in Osaka',
        destinations: ['Osaka'],
        startDate: '2026-05-01T00:00:00Z',
        endDate: '2026-05-03T00:00:00Z',
      },
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
