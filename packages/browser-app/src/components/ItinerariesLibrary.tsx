import { useEffect, useState } from 'react';
import { Heading, Tag, IconButton, Tooltip, Dropdown, Button } from '@carbon/react';
import { ViewOff, View, Events } from '@carbon/icons-react';
import { Airplane, Dining, Calendar, Building } from '@carbon/pictograms-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCurrentItinerary } from '../store/slices/itinerarySlice';
import { fetchDocuments } from '../store/slices/documentsSlice';
import { documentsToItineraries } from '../utils/itineraryTransform';
import { mockItinerary } from '../data/mockItinerary';
import TimelineView from './itineraries/TimelineView';
import './ItinerariesLibrary.css';

function ItinerariesLibrary() {
  const dispatch = useAppDispatch();
  const currentItinerary = useAppSelector((state) => state.itinerary.currentItinerary);
  const { documents, isLoading } = useAppSelector((state) => state.documents);
  const [detailedView, setDetailedView] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [availableItineraries, setAvailableItineraries] = useState<any[]>([]);

  // Fetch documents on mount and when component becomes visible
  // This ensures fresh data when navigating to Itineraries tab after an import
  useEffect(() => {
    console.log('[ItinerariesLibrary] Fetching documents for default-user');
    dispatch(fetchDocuments({ userId: 'default-user' }));

    // Set up interval to refetch every 5 seconds if data is still loading
    // This helps pick up newly imported documents
    const intervalId = setInterval(() => {
      if (documents.length === 0 && !isLoading) {
        console.log('[ItinerariesLibrary] Refetching documents (empty state)');
        dispatch(fetchDocuments({ userId: 'default-user' }));
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Transform documents to itineraries when documents are loaded
  useEffect(() => {
    console.log('[ItinerariesLibrary] Processing documents:', {
      isLoading,
      documentCount: documents.length,
      documents: documents.map(d => ({
        id: d.documentId,
        title: d.title,
        extractionStatus: d.extractionStatus,
        hasExtractedData: !!d.extractedData
      }))
    });

    if (!isLoading && documents.length > 0) {
      const itineraries = documentsToItineraries(documents);
      console.log('[ItinerariesLibrary] Transformed itineraries:', {
        count: itineraries.length,
        itineraries: itineraries.map(i => ({ id: i.id, title: i.title, itemCount: i.items.length }))
      });

      // Add mock itinerary if no extracted itineraries
      const allItineraries = itineraries.length > 0 ? itineraries : [mockItinerary];
      setAvailableItineraries(allItineraries);

      // Set the first itinerary as current if none selected
      if (!currentItinerary) {
        console.log('[ItinerariesLibrary] Setting current itinerary:', allItineraries[0].title);
        dispatch(setCurrentItinerary(allItineraries[0]));
      }
    } else if (!isLoading && documents.length === 0) {
      console.log('[ItinerariesLibrary] No documents found, using mock itinerary');
      // No documents, use mock
      setAvailableItineraries([mockItinerary]);
      if (!currentItinerary) {
        dispatch(setCurrentItinerary(mockItinerary));
      }
    }
  }, [dispatch, documents, isLoading, currentItinerary]);

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

  // Determine day colors based on activity type / location
  const getDayColor = (dayIndex: number): string | null => {
    const dayItems = currentItinerary.items.filter((item) => item.dayIndex === dayIndex);
    const hasTransit = dayItems.some((item) => item.category === 'transit');

    // Get all locations for the day
    const locations = dayItems
      .filter((item) => item.location)
      .map((item) => item.location);

    // Determine primary location
    const primaryLocation = locations.length > 0 ? locations[0] : null;

    // Color code by location (consistent palette)
    if (primaryLocation?.includes('Oxford')) return '#8a3ffc'; // purple
    if (primaryLocation?.includes('London')) return '#0071e3'; // IBM blue
    if (hasTransit) return '#0062cc'; // darker blue for transit days
    return null; // default
  };

  // Get detailed tooltip for timeline segment
  const getTimelineTooltip = (dayIndex: number): string => {
    const dayItems = currentItinerary.items.filter((item) => item.dayIndex === dayIndex);
    const startDate = new Date(currentItinerary.startDate);
    const dayDate = new Date(startDate.getTime() + dayIndex * 24 * 60 * 60 * 1000);
    const dateStr = dayDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    if (dayItems.length === 0) {
      return `Day ${dayIndex + 1} (${dateStr}) - No activities`;
    }

    // Get primary location
    const locations = dayItems
      .filter((item) => item.location)
      .map((item) => item.location);
    const primaryLocation = locations.length > 0 ? locations[0] : 'Location TBD';

    // Count activities by category
    const categories = dayItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryStr = Object.entries(categories)
      .map(([cat, count]) => `${count} ${cat}`)
      .join(', ');

    return `Day ${dayIndex + 1} (${dateStr})\n${primaryLocation}\n${dayItems.length} activities: ${categoryStr}`;
  };

  return (
    <div className="itineraries-library" data-element="itineraries-library">
      {/* Combined Header */}
      <div className="itinerary-main-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <Heading>Itineraries — {currentItinerary.title}</Heading>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Button
              kind={viewMode === 'timeline' ? 'primary' : 'tertiary'}
              size="sm"
              renderIcon={Events}
              onClick={() => setViewMode(viewMode === 'timeline' ? 'table' : 'timeline')}
            >
              {viewMode === 'timeline' ? 'Table View' : 'Timeline View'}
            </Button>
            {availableItineraries.length > 1 && (
              <Dropdown
                id="itinerary-selector"
                titleText=""
                label="Switch itinerary"
                items={availableItineraries}
                itemToString={(item) => (item ? item.title : '')}
                selectedItem={currentItinerary}
                onChange={({ selectedItem }) => {
                  if (selectedItem) {
                    dispatch(setCurrentItinerary(selectedItem));
                  }
                }}
                size="md"
                style={{ minWidth: '250px' }}
              />
            )}
          </div>
        </div>
        <p className="itinerary-subtext">
          {tripLength} days · {currentItinerary.destinations.length} {currentItinerary.destinations.length === 1 ? 'location' : 'locations'}
          {availableItineraries.length > 1 && ` · ${availableItineraries.length} total itineraries`}
        </p>
      </div>

      {/* Conditional rendering based on view mode */}
      {viewMode === 'timeline' ? (
        <TimelineView />
      ) : (
        <>
          {/* Sleek Timeline Bar */}
          <div className="timeline-bar-container">
        <div className="timeline-bar-sleek">
          {Array.from({ length: tripLength }, (_, i) => {
            const dayItems = currentItinerary.items.filter((item) => item.dayIndex === i);
            const hasActivity = dayItems.length > 0;
            const dayColor = getDayColor(i);
            return (
              <div
                key={i}
                className={`timeline-segment-sleek ${hasActivity ? 'active' : ''}`}
                style={dayColor && hasActivity ? { background: dayColor } : {}}
                title={getTimelineTooltip(i)}
              />
            );
          })}
        </div>
      </div>

      {/* File-list-style Daily Viewer - Extended scrolling table */}
      <div className="daily-file-list-compact">
        {/* Sticky column headers */}
        {detailedView ? (
          <div className="itinerary-table-headers">
            <div className="column-header">Time</div>
            <div className="column-header">Activity</div>
            <div className="column-header">Type</div>
            <div className="column-header">Location</div>
            <div className="view-toggle-header">
              <Tooltip align="bottom-right" label="Switch to theme view">
                <IconButton
                  label="Toggle view"
                  onClick={() => setDetailedView(!detailedView)}
                  size="sm"
                  kind="ghost"
                >
                  <ViewOff size={16} />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        ) : (
          <div className="itinerary-table-headers-theme">
            <div className="column-header">Day</div>
            <div className="column-header">Location</div>
            <div className="column-header">Activities</div>
            <div className="view-toggle-header">
              <Tooltip align="bottom-right" label="Switch to detailed view">
                <IconButton
                  label="Toggle view"
                  onClick={() => setDetailedView(!detailedView)}
                  size="sm"
                  kind="ghost"
                >
                  <View size={16} />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        )}

        {detailedView ? (
          // Detailed view: show all items with times
          days.map((day) => (
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
          ))
        ) : (
          // Theme view: show abstracted day summaries
          days.map((day) => {
            const locations = day.items
              .filter((item) => item.location)
              .map((item) => item.location);
            const primaryLocation = locations.length > 0 ? locations[0] : 'Location TBD';

            // Count activities by category
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
                            {count} {category}
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
          })
        )}
      </div>

      {/* Filter Cards at Bottom - Using Carbon Pictograms */}
      <div className="filter-pictogram-cards">
        <div className="filter-pictogram-card transit-card">
          <div className="pictogram-wrapper">
            <Airplane />
          </div>
          <div className="filter-pictogram-content">
            <div className="filter-pictogram-label">Transit</div>
            <div className="filter-pictogram-count">{transitCount}</div>
          </div>
        </div>

        <div className="filter-pictogram-card meals-card">
          <div className="pictogram-wrapper">
            <Dining />
          </div>
          <div className="filter-pictogram-content">
            <div className="filter-pictogram-label">Meals</div>
            <div className="filter-pictogram-count">{mealCount}</div>
          </div>
        </div>

        <div className="filter-pictogram-card reservations-card">
          <div className="pictogram-wrapper">
            <Calendar />
          </div>
          <div className="filter-pictogram-content">
            <div className="filter-pictogram-label">Reservations</div>
            <div className="filter-pictogram-count">{reservationCount}</div>
          </div>
        </div>

        <div className="filter-pictogram-card lodging-card">
          <div className="pictogram-wrapper">
            <Building />
          </div>
          <div className="filter-pictogram-content">
            <div className="filter-pictogram-label">Lodging</div>
            <div className="filter-pictogram-count">{lodgingCount}</div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default ItinerariesLibrary;
