import type { Meta, StoryObj } from '@storybook/react'
import SpecialistPanel from './SpecialistPanel'
import { withMockStore } from './__mocks__/storeDecorator'
import { mockTokyoTrip } from './__mocks__/mockItinerary'

const meta: Meta<typeof SpecialistPanel> = {
  title: 'Itineraries/SpecialistPanel',
  component: SpecialistPanel,
}

export default meta
type Story = StoryObj<typeof SpecialistPanel>

export const TransitView: Story = {
  decorators: [
    withMockStore({
      currentItinerary: mockTokyoTrip,
      activeSpecialistMode: 'transit',
    }),
  ],
}

export const MealsView: Story = {
  decorators: [
    withMockStore({
      currentItinerary: mockTokyoTrip,
      activeSpecialistMode: 'meals',
    }),
  ],
}

export const ReservationsView: Story = {
  decorators: [
    withMockStore({
      currentItinerary: mockTokyoTrip,
      activeSpecialistMode: 'reservations',
    }),
  ],
}

export const LodgingView: Story = {
  decorators: [
    withMockStore({
      currentItinerary: mockTokyoTrip,
      activeSpecialistMode: 'lodging',
    }),
  ],
}

export const NoItinerary: Story = {
  decorators: [
    withMockStore({
      currentItinerary: null,
      activeSpecialistMode: 'transit',
    }),
  ],
}
