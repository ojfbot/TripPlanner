import type { Meta, StoryObj } from '@storybook/react'
import MarkdownMessage from './MarkdownMessage'

const meta: Meta<typeof MarkdownMessage> = {
  title: 'Components/MarkdownMessage',
  component: MarkdownMessage,
}

export default meta
type Story = StoryObj<typeof MarkdownMessage>

export const PlainText: Story = {
  args: {
    content: 'Your 5-day trip to Tokyo is looking great! You have 12 activities planned across 3 neighborhoods.',
  },
}

export const RichItinerary: Story = {
  args: {
    content: `# Tokyo Trip Summary

## Day 1 - Arrival & Shibuya

- **10:30 AM** - Arrive at Narita Airport (NRT)
- **12:00 PM** - Train to Shibuya via Narita Express
- **2:00 PM** - Check in at Hotel Cerulean Tower
- **3:30 PM** - Explore Shibuya Crossing & Hachiko

### Dinner Reservation
> **Gonpachi Nishiazabu** - 7:00 PM
> Confirmation: \`TK-2024-9981\`

## Budget Breakdown

| Category | Amount |
|----------|--------|
| Transit  | $120   |
| Lodging  | $280   |
| Meals    | $90    |
| **Total** | **$490** |`,
  },
}

export const Compact: Story = {
  args: {
    content: 'Flight JL005 departs at **2:45 PM** from Gate 32B. Boarding begins at 2:15 PM.',
    compact: true,
  },
}

export const WithCodeBlock: Story = {
  args: {
    content: `Here is your trip data in JSON format:

\`\`\`json
{
  "destination": "Kyoto",
  "duration": 3,
  "activities": [
    "Fushimi Inari Shrine",
    "Arashiyama Bamboo Grove",
    "Kinkaku-ji Temple"
  ]
}
\`\`\``,
  },
}
