import { getDayColor, getTimelineTooltip } from './utils';

interface TimelineBarProps {
  tripLength: number;
  items: any[];
  startDate: string;
}

export default function TimelineBar({ tripLength, items, startDate }: TimelineBarProps) {
  return (
    <div className="timeline-bar-container">
      <div className="timeline-bar-sleek">
        {Array.from({ length: tripLength }, (_, i) => {
          const dayItems = items.filter((item) => item.dayIndex === i);
          const hasActivity = dayItems.length > 0;
          const dayColor = getDayColor(i, items);
          return (
            <div
              key={i}
              className={`timeline-segment-sleek ${hasActivity ? 'active' : ''}`}
              style={dayColor && hasActivity ? { background: dayColor } : {}}
              title={getTimelineTooltip(i, items, startDate)}
            />
          );
        })}
      </div>
    </div>
  );
}
