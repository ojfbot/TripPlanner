import { Button } from '@carbon/react';
import {
  Delivery,
  Restaurant,
  Hotel,
  EventSchedule,
} from '@carbon/icons-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveLens } from '../../store/slices/itinerarySlice';
import './ItinerariesOverviewTiles.css';

function ItinerariesOverviewTiles() {
  const dispatch = useAppDispatch();
  const currentItinerary = useAppSelector((state) => state.itinerary.currentItinerary);

  const tripLength = currentItinerary
    ? Math.ceil(
        (new Date(currentItinerary.endDate).getTime() -
          new Date(currentItinerary.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 0;

  const destinationCount = currentItinerary?.destinations.length || 0;
  const transitCount = currentItinerary?.items.filter((item) => item.category === 'transit').length || 0;
  const mealCount = currentItinerary?.items.filter((item) => item.category === 'meal').length || 0;
  const reservationCount = currentItinerary?.items.filter((item) => item.status).length || 0;
  const lodgingCount = currentItinerary?.items.filter((item) => item.category === 'lodging').length || 0;

  if (!currentItinerary) return null;

  return (
    <div className="overview-tiles-container">
      {/* Trip Timeline Banner */}
      <div className="trip-timeline-banner" onClick={() => dispatch(setActiveLens('wholeTrip'))}>
        <div className="timeline-header">
          <h3 className="timeline-title">{currentItinerary.title}</h3>
          <div className="timeline-meta">
            {tripLength} days · {destinationCount} {destinationCount === 1 ? 'destination' : 'destinations'}
          </div>
        </div>
        <div className="timeline-bar">
          {Array.from({ length: tripLength }, (_, i) => {
            const dayItems = currentItinerary.items.filter((item) => item.dayIndex === i);
            const hasActivity = dayItems.length > 0;
            return (
              <div
                key={i}
                className={`timeline-segment ${hasActivity ? 'active' : ''}`}
                title={`Day ${i + 1} - ${dayItems.length} items`}
              />
            );
          })}
        </div>
        <Button kind="ghost" size="sm" className="timeline-action">
          View Full Timeline →
        </Button>
      </div>

      {/* Daily Breakdown Card */}
      <div className="daily-breakdown-card" onClick={() => dispatch(setActiveLens('dayWeek'))}>
        <div className="card-icon-wrapper">
          <EventSchedule size={32} />
        </div>
        <div className="card-content">
          <h4>Daily Breakdown</h4>
          <p>Scroll through {tripLength} days of activities</p>
        </div>
        <div className="card-arrow">→</div>
      </div>

      {/* Filter Cards (Specialist Views) */}
      <div className="filter-cards-grid">
        <div className="filter-card transit" onClick={() => dispatch(setActiveLens('specialist'))}>
          <div className="filter-card-icon">
            <Delivery size={28} />
          </div>
          <div className="filter-card-content">
            <h5>Transit</h5>
            <div className="filter-card-count">{transitCount}</div>
          </div>
        </div>

        <div className="filter-card meals" onClick={() => dispatch(setActiveLens('specialist'))}>
          <div className="filter-card-icon">
            <Restaurant size={28} />
          </div>
          <div className="filter-card-content">
            <h5>Meals</h5>
            <div className="filter-card-count">{mealCount}</div>
          </div>
        </div>

        <div className="filter-card reservations" onClick={() => dispatch(setActiveLens('specialist'))}>
          <div className="filter-card-icon">
            <EventSchedule size={28} />
          </div>
          <div className="filter-card-content">
            <h5>Reservations</h5>
            <div className="filter-card-count">{reservationCount}</div>
          </div>
        </div>

        <div className="filter-card lodging" onClick={() => dispatch(setActiveLens('specialist'))}>
          <div className="filter-card-icon">
            <Hotel size={28} />
          </div>
          <div className="filter-card-content">
            <h5>Lodging</h5>
            <div className="filter-card-count">{lodgingCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ItinerariesOverviewTiles;
