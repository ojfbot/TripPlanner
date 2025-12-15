import { useState } from 'react';
import { Button, InlineLoading, Tile } from '@carbon/react';
import {
  Add,
  Star,
  Restaurant,
  Hotel,
  Delivery,
  EventSchedule,
  Location,
} from '@carbon/icons-react';
import { useAppSelector } from '../../store/hooks';
import './TimelineView.css';

interface TimelineItem {
  id: string;
  time: string;
  title: string;
  category: string;
  description?: string;
  location?: string;
  aiInsight?: string;
}

function TimelineView() {
  const currentItinerary = useAppSelector((state) => state.itinerary.currentItinerary);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  if (!currentItinerary) {
    return (
      <div className="timeline-view">
        <p style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>
          No itinerary selected
        </p>
      </div>
    );
  }

  // Group items by day
  const tripLength = Math.ceil(
    (new Date(currentItinerary.endDate).getTime() -
      new Date(currentItinerary.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  ) + 1;

  const days = Array.from({ length: tripLength }, (_, i) => {
    const startDate = new Date(currentItinerary.startDate);
    const dayDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dayItems = currentItinerary.items
      .filter((item) => item.dayIndex === i)
      .map((item) => ({
        id: item.id,
        time: item.startTime || '9:00 AM',
        title: item.title,
        category: item.category,
        description: item.description,
        location: item.location,
        aiInsight: item.aiInsight,
      }));

    return {
      dayIndex: i,
      date: dayDate,
      items: dayItems,
    };
  });

  // Currently showing the first day's timeline - could be extended to switch days
  const currentDay = days[0];
  const timelineItems = currentDay?.items || [];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'meal':
        return <Restaurant size={16} />;
      case 'lodging':
        return <Hotel size={16} />;
      case 'transit':
        return <Delivery size={16} />;
      case 'reservation':
        return <EventSchedule size={16} />;
      default:
        return <Location size={16} />;
    }
  };

  const generateAIInsight = async () => {
    setIsGeneratingInsight(true);
    // TODO: Call API to generate AI insight for the active timeline item
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsGeneratingInsight(false);
  };

  const activeItem = timelineItems[activeIndex];

  return (
    <div className="timeline-view">
      <div className="timeline-header">
        <h2>{currentItinerary.title}</h2>
        <p className="timeline-subtitle">
          Day {currentDay.dayIndex + 1} • {currentDay.date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      <div className="timeline-flex-parent">
        {/* Horizontal timeline dots */}
        <div className="timeline-input-container">
          {timelineItems.map((item, index) => (
            <div
              key={item.id}
              className={`timeline-dot ${index === activeIndex ? 'active' : ''}`}
              onClick={() => setActiveIndex(index)}
            >
              <span data-time={item.time} data-info={item.title}>
                <div className="timeline-dot-icon">
                  {getCategoryIcon(item.category)}
                </div>
              </span>
            </div>
          ))}
        </div>

        {/* Description area */}
        <div className="timeline-description-container">
          {timelineItems.map((item, index) => (
            <Tile
              key={item.id}
              className={`timeline-description-card ${index === activeIndex ? 'active' : ''}`}
            >
              <div className="timeline-card-header">
                <div className="timeline-card-icon-wrapper">
                  {getCategoryIcon(item.category)}
                </div>
                <div className="timeline-card-title-section">
                  <h3>{item.title}</h3>
                  <p className="timeline-card-time">{item.time}</p>
                </div>
              </div>

              {item.location && (
                <div className="timeline-card-location">
                  <Location size={16} />
                  <span>{item.location}</span>
                </div>
              )}

              {item.description && (
                <p className="timeline-card-description">{item.description}</p>
              )}

              {/* AI Insight Section */}
              <div className="timeline-ai-section">
                {item.aiInsight ? (
                  <div className="timeline-ai-insight">
                    <div className="timeline-ai-header">
                      <Star size={16} />
                      <span>AI Insight</span>
                    </div>
                    <p>{item.aiInsight}</p>
                  </div>
                ) : (
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={Star}
                    onClick={generateAIInsight}
                    disabled={isGeneratingInsight}
                  >
                    {isGeneratingInsight ? (
                      <>
                        <InlineLoading description="Generating insight..." />
                      </>
                    ) : (
                      'Generate AI Insight'
                    )}
                  </Button>
                )}
              </div>

              <div className="timeline-card-actions">
                <Button kind="tertiary" size="sm">
                  Edit
                </Button>
                <Button kind="ghost" size="sm" renderIcon={Add}>
                  Add Activity
                </Button>
              </div>
            </Tile>
          ))}

          {timelineItems.length === 0 && (
            <Tile className="timeline-empty-state">
              <p>No activities scheduled for this day yet.</p>
              <Button kind="primary" size="sm" renderIcon={Add}>
                Add First Activity
              </Button>
            </Tile>
          )}
        </div>
      </div>

      {/* AI Summary Section */}
      <div className="timeline-day-summary">
        <Tile className="timeline-summary-card">
          <div className="timeline-summary-header">
            <Star size={20} />
            <h4>Day Summary</h4>
          </div>
          <p className="timeline-summary-text">
            {timelineItems.length > 0
              ? `You have ${timelineItems.length} activities planned for today. The day starts with ${timelineItems[0]?.title} and includes ${timelineItems.filter(i => i.category === 'meal').length} meals.`
              : 'No activities planned for this day yet. Add some activities to get started!'}
          </p>
          <Button kind="ghost" size="sm" renderIcon={Star}>
            Get AI Suggestions
          </Button>
        </Tile>
      </div>
    </div>
  );
}

export default TimelineView;
