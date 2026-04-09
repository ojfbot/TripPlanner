export function getCategoryColor(category: string) {
  switch (category) {
    case 'transit': return 'blue';
    case 'meal': return 'red';
    case 'lodging': return 'purple';
    case 'reservation': return 'green';
    case 'activity': return 'cyan';
    default: return 'gray';
  }
}

export function getDayColor(dayIndex: number, items: any[]): string | null {
  const dayItems = items.filter((item) => item.dayIndex === dayIndex);
  const hasTransit = dayItems.some((item) => item.category === 'transit');

  const locations = dayItems
    .filter((item) => item.location)
    .map((item) => item.location);

  const primaryLocation = locations.length > 0 ? locations[0] : null;

  if (primaryLocation?.includes('Oxford')) return '#8a3ffc';
  if (primaryLocation?.includes('London')) return '#0071e3';
  if (hasTransit) return '#0062cc';
  return null;
}

export function getTimelineTooltip(dayIndex: number, items: any[], startDateStr: string): string {
  const dayItems = items.filter((item) => item.dayIndex === dayIndex);
  const startDate = new Date(startDateStr);
  const dayDate = new Date(startDate.getTime() + dayIndex * 24 * 60 * 60 * 1000);
  const dateStr = dayDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  if (dayItems.length === 0) {
    return `Day ${dayIndex + 1} (${dateStr}) - No activities`;
  }

  const locations = dayItems
    .filter((item) => item.location)
    .map((item) => item.location);
  const primaryLocation = locations.length > 0 ? locations[0] : 'Location TBD';

  const categories = dayItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryStr = Object.entries(categories)
    .map(([cat, count]) => `${count} ${cat}`)
    .join(', ');

  return `Day ${dayIndex + 1} (${dateStr})\n${primaryLocation}\n${dayItems.length} activities: ${categoryStr}`;
}
