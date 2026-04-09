import { Tag } from '@carbon/react';
import { getCategoryColor } from './utils';

interface DayThemeViewProps {
  days: Array<{
    dayIndex: number;
    date: Date;
    items: any[];
  }>;
}

export default function DayThemeView({ days }: DayThemeViewProps) {
  return (
    <>
      {days.map((day) => {
        const locations = day.items
          .filter((item) => item.location)
          .map((item) => item.location);
        const primaryLocation = locations.length > 0 ? locations[0] : 'Location TBD';

        const categories = day.items.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return (
          <div key={day.dayIndex} className="day-theme-row">
            <div className="theme-day-info">
              <div className="theme-day-label">Day {day.dayIndex + 1}</div>
              <div className="theme-day-date">
                {day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div className="theme-location">{primaryLocation}</div>
            <div className="theme-activities">
              {day.items.length > 0 ? (
                <>
                  <span className="theme-activity-count">{day.items.length} activities</span>
                  <div className="theme-category-tags">
                    {Object.entries(categories).map(([category, count]) => (
                      <Tag key={category} size="sm" type={getCategoryColor(category)}>
                        {`${count} ${category}`}
                      </Tag>
                    ))}
                  </div>
                </>
              ) : (
                <span className="theme-no-activities">No activities</span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
