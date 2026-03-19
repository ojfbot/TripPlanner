import type { Meta, StoryObj } from '@storybook/react'
import DayWeekPanel from './DayWeekPanel'
import { withMockStore } from './__mocks__/storeDecorator'
import { mockTokyoTrip } from './__mocks__/mockItinerary'

const meta: Meta<typeof DayWeekPanel> = {
  title: 'Itineraries/DayWeekPanel',
  component: DayWeekPanel,
}

export default meta
type Story = StoryObj<typeof DayWeekPanel>

export const Day1Selected: Story = {
  decorators: [
    withMockStore({
      currentItinerary: mockTokyoTrip,
      selectedDayIndex: 0,
    }),
  ],
}

export const Day2Selected: Story = {
  decorators: [
    withMockStore({
      currentItinerary: mockTokyoTrip,
      selectedDayIndex: 1,
    }),
  ],
}

export const NoDaySelected: Story = {
  decorators: [
    withMockStore({
      currentItinerary: mockTokyoTrip,
      selectedDayIndex: null,
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
