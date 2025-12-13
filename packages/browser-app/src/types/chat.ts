/**
 * Chat types for TripPlanner
 */

/**
 * Quick action for badge buttons in welcome message
 */
export interface QuickAction {
  label: string;
  icon: string;
  prompt: string;
  type: 'red' | 'magenta' | 'purple' | 'blue' | 'cyan' | 'teal' | 'green' | 'gray' | 'cool-gray' | 'warm-gray' | 'high-contrast' | 'outline';
}
