import type { Meta, StoryObj } from '@storybook/react'
import TimelineView from './TimelineView'
import { withMockStore } from './__mocks__/storeDecorator'
import { mockTokyoTrip } from './__mocks__/mockItinerary'
import type { TripItinerary } from '../../types/itinerary'

const meta: Meta<typeof TimelineView> = {
  title: 'Itineraries/TimelineView',
  component: TimelineView,
}

export default meta
type Story = StoryObj<typeof TimelineView>

export const WithActivities: Story = {
  decorators: [
    withMockStore({
      currentItinerary: mockTokyoTrip,
    }),
  ],
}

export const WithAIInsights: Story = {
  decorators: [
    withMockStore({
      currentItinerary: {
        ...mockTokyoTrip,
        items: mockTokyoTrip.items.map((item, i) =>
          i < 3
            ? {
                ...item,
                aiInsight:
                  i === 0
                    ? 'Pro tip: The Narita Express has reserved seating. Purchase your ticket before boarding to guarantee a window seat for great views of the countryside.'
                    : i === 1
                    ? 'Cerulean Tower has an excellent bar on the 40th floor with panoramic views of Shibuya. Perfect for a nightcap after dinner.'
                    : 'Gonpachi is best known as the inspiration for the House of Blue Leaves in Kill Bill. Try the soba noodles - they make them fresh.',
              }
            : item
        ),
      } as TripItinerary,
    }),
  ],
}

export const EmptyItinerary: Story = {
  decorators: [
    withMockStore({
      currentItinerary: {
        ...mockTokyoTrip,
        items: [],
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
