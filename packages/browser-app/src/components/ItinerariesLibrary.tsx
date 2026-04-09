import TimelineView from './itineraries/TimelineView';
import {
  useItinerariesLibrary,
  ItineraryHeader,
  TimelineBar,
  TableHeaders,
  DayDetailedView,
  DayThemeView,
  CategoryCards,
} from './itineraries-library';
import './ItinerariesLibrary.css';

function ItinerariesLibrary() {
  const {
    currentItinerary,
    availableItineraries,
    detailedView,
    setDetailedView,
    viewMode,
    setViewMode,
    tripLength,
    days,
    transitCount,
    mealCount,
    reservationCount,
    lodgingCount,
    dispatch,
  } = useItinerariesLibrary();

  if (!currentItinerary) {
    return (
      <div className="itineraries-library" data-element="itineraries-library">
        <p style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>
          Loading itinerary data...
        </p>
      </div>
    );
  }

  return (
    <div className="itineraries-library" data-element="itineraries-library">
      <ItineraryHeader
        currentItinerary={currentItinerary}
        availableItineraries={availableItineraries}
        viewMode={viewMode}
        setViewMode={setViewMode}
        tripLength={tripLength}
        dispatch={dispatch}
      />

      {viewMode === 'timeline' ? (
        <TimelineView />
      ) : (
        <>
          <TimelineBar
            tripLength={tripLength}
            items={currentItinerary.items}
            startDate={currentItinerary.startDate}
          />

          <div className="daily-file-list-compact">
            <TableHeaders
              detailedView={detailedView}
              setDetailedView={setDetailedView}
            />

            {detailedView ? (
              <DayDetailedView days={days} />
            ) : (
              <DayThemeView days={days} />
            )}
          </div>

          <CategoryCards
            transitCount={transitCount}
            mealCount={mealCount}
            reservationCount={reservationCount}
            lodgingCount={lodgingCount}
          />
        </>
      )}
    </div>
  );
}

export default ItinerariesLibrary;
