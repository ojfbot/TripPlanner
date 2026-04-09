import { Tag } from '@carbon/react';
import { getCategoryColor } from './utils';

interface DayDetailedViewProps {
  days: Array<{
    dayIndex: number;
    date: Date;
    items: any[];
  }>;
}

export default function DayDetailedView({ days }: DayDetailedViewProps) {
  return (
    <>
      {days.map((day) => (
        <div key={day.dayIndex} className="day-section">
          <div className="day-header">
            <div className="day-header-spacer"></div>
            <div className="day-header-content">
              Day {day.dayIndex + 1} — {day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
          {day.items.length > 0 ? (
            <div className="day-items-list">
              {day.items.map((item) => (
                <div key={item.id} className="itinerary-item-row">
                  <div className="item-time">
                    {item.startTime
                      ? new Date(item.startTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : '—'}
                  </div>
                  <div className="item-title">{item.title}</div>
                  <div className="item-tags">
                    <Tag size="sm" type={getCategoryColor(item.category)}>
                      {item.category}
                    </Tag>
                    {item.status && (
                      <Tag
                        size="sm"
                        type={
                          item.status === 'confirmed'
                            ? 'green'
                            : item.status === 'pending'
                            ? 'cyan'
                            : item.status === 'needs_attention'
                            ? 'red'
                            : 'gray'
                        }
                      >
                        {item.status}
                      </Tag>
                    )}
                  </div>
                  {item.location && (
                    <div className="item-location">{item.location}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="day-empty">No activities</div>
          )}
        </div>
      ))}
    </>
  );
}
