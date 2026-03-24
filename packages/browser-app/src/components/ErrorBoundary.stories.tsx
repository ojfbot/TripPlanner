import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { ErrorBoundary } from '@ojfbot/frame-ui-components'

// A component that throws an error for testing
function ThrowingComponent(): React.ReactElement {
  throw new Error('Test error: Something went wrong in the itinerary view')
}

// A normal child component
function WorkingComponent() {
  return (
    <div style={{ padding: '2rem', background: 'var(--cds-layer-01, #f4f4f4)', borderRadius: '4px' }}>
      <h3>Trip Itinerary</h3>
      <p>Tokyo - 5 days, 12 activities planned</p>
    </div>
  )
}

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
}

export default meta
type Story = StoryObj<typeof ErrorBoundary>

export const WithWorkingChild: Story = {
  render: () => (
    <ErrorBoundary>
      <WorkingComponent />
    </ErrorBoundary>
  ),
}

export const WithError: Story = {
  render: () => (
    <ErrorBoundary>
      <ThrowingComponent />
    </ErrorBoundary>
  ),
}

export const WithCustomFallback: Story = {
  render: () => (
    <ErrorBoundary
      fallback={
        <div style={{ padding: '2rem', background: '#fff1f1', borderRadius: '4px', border: '1px solid #da1e28' }}>
          <h4>Custom Error View</h4>
          <p>We could not load your trip details. Please try refreshing.</p>
        </div>
      }
    >
      <ThrowingComponent />
    </ErrorBoundary>
  ),
}
