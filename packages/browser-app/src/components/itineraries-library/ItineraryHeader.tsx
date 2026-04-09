import { Heading, Dropdown, Button } from '@carbon/react';
import { Events } from '@carbon/icons-react';
import { setCurrentItinerary } from '../../store/slices/itinerarySlice';

interface ItineraryHeaderProps {
  currentItinerary: any;
  availableItineraries: any[];
  viewMode: 'table' | 'timeline';
  setViewMode: (mode: 'table' | 'timeline') => void;
  tripLength: number;
  dispatch: any;
}

export default function ItineraryHeader({
  currentItinerary,
  availableItineraries,
  viewMode,
  setViewMode,
  tripLength,
  dispatch,
}: ItineraryHeaderProps) {
  return (
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
  );
}
