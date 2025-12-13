/**
 * Quick action buttons for chat welcome messages
 */

import type { QuickAction } from '../types/chat';

/**
 * Quick actions for InteractiveChat (full-page view)
 */
export const INTERACTIVE_QUICK_ACTIONS: readonly QuickAction[] = [
  {
    label: 'Plan a Trip',
    icon: '✈️',
    prompt: 'Help me plan a trip',
    type: 'blue',
  },
  {
    label: 'Create Itinerary',
    icon: '📅',
    prompt: 'Create an itinerary for my trip',
    type: 'purple',
  },
  {
    label: 'Find Activities',
    icon: '🎯',
    prompt: 'What are the best activities in my destination?',
    type: 'cyan',
  },
  {
    label: 'Book Hotels',
    icon: '🏨',
    prompt: 'Help me find and book accommodations',
    type: 'teal',
  },
  {
    label: 'Travel Tips',
    icon: '💡',
    prompt: 'Give me travel tips for my destination',
    type: 'magenta',
  },
] as const;

/**
 * Quick actions for CondensedChat (floating view)
 * Subset of interactive actions for compact display
 */
export const CONDENSED_QUICK_ACTIONS: readonly QuickAction[] = [
  {
    label: 'Plan a Trip',
    icon: '✈️',
    prompt: 'Help me plan a trip',
    type: 'blue',
  },
  {
    label: 'Create Itinerary',
    icon: '📅',
    prompt: 'Create an itinerary for my trip',
    type: 'purple',
  },
  {
    label: 'Find Activities',
    icon: '🎯',
    prompt: 'What are the best activities in my destination?',
    type: 'cyan',
  },
  {
    label: 'Travel Tips',
    icon: '💡',
    prompt: 'Give me travel tips for my destination',
    type: 'magenta',
  },
] as const;
