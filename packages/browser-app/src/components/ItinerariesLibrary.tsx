import { useEffect } from 'react';
import { Heading, Tag } from '@carbon/react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCurrentItinerary } from '../store/slices/itinerarySlice';
import { mockItinerary } from '../data/mockItinerary';
import './ItinerariesLibrary.css';

function ItinerariesLibrary() {
  const dispatch = useAppDispatch();
  const currentItinerary = useAppSelector((state) => state.itinerary.currentItinerary);

  // Load mock data on mount
  useEffect(() => {
    if (!currentItinerary) {
      dispatch(setCurrentItinerary(mockItinerary));
    }
  }, [dispatch, currentItinerary]);

  if (!currentItinerary) {
    return (
      <div className="itineraries-library" data-element="itineraries-library">
        <p style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>
          Loading itinerary data...
        </p>
      </div>
    );
  }

  const tripLength = Math.ceil(
    (new Date(currentItinerary.endDate).getTime() -
      new Date(currentItinerary.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  ) + 1;

  const days = Array.from({ length: tripLength }, (_, i) => {
    const startDate = new Date(currentItinerary.startDate);
    const dayDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dayItems = currentItinerary.items.filter((item) => item.dayIndex === i);
    
    return {
      dayIndex: i,
      date: dayDate,
      items: dayItems,
    };
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'transit': return 'blue';
      case 'meal': return 'red';
      case 'lodging': return 'purple';
      case 'reservation': return 'green';
      case 'activity': return 'cyan';
      default: return 'gray';
    }
  };

  const transitCount = currentItinerary.items.filter((item) => item.category === 'transit').length;
  const mealCount = currentItinerary.items.filter((item) => item.category === 'meal').length;
  const reservationCount = currentItinerary.items.filter((item) => item.status).length;
  const lodgingCount = currentItinerary.items.filter((item) => item.category === 'lodging').length;

  return (
    <div className="itineraries-library" data-element="itineraries-library">
      {/* Combined Header */}
      <div className="itinerary-main-header">
        <Heading>Itineraries — {currentItinerary.title}</Heading>
        <p className="itinerary-subtext">
          {tripLength} days · {currentItinerary.destinations.length} {currentItinerary.destinations.length === 1 ? 'location' : 'locations'}
        </p>
      </div>

      {/* Timeline Bar - More Prominent */}
      <div className="timeline-bar-container">
        <div className="timeline-bar-inline">
          {Array.from({ length: tripLength }, (_, i) => {
            const dayItems = currentItinerary.items.filter((item) => item.dayIndex === i);
            const hasActivity = dayItems.length > 0;
            const startDate = new Date(currentItinerary.startDate);
            const dayDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            return (
              <div
                key={i}
                className={`timeline-segment-inline ${hasActivity ? 'active' : ''}`}
                title={`Day ${i + 1} (${dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}) - ${dayItems.length} items`}
              >
                <span className="day-label">{i + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Cards */}
      <div className="filter-cards-row">
        <div className="filter-card-inline">
          <span className="filter-label">Transit</span>
          <span className="filter-count">{transitCount}</span>
        </div>
        <div className="filter-card-inline">
          <span className="filter-label">Meals</span>
          <span className="filter-count">{mealCount}</span>
        </div>
        <div className="filter-card-inline">
          <span className="filter-label">Reservations</span>
          <span className="filter-count">{reservationCount}</span>
        </div>
        <div className="filter-card-inline">
          <span className="filter-label">Lodging</span>
          <span className="filter-count">{lodgingCount}</span>
        </div>
      </div>

      {/* File-list-style Daily Viewer */}
      <div className="daily-file-list">
        {days.map((day) => (
          <div key={day.dayIndex} className="day-section">
            <div className="day-header">
              Day {day.dayIndex + 1} — {day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
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
      </div>
    </div>
  );
}

export default ItinerariesLibrary;
