import { Button, Tag, Tile, Accordion, AccordionItem } from '@carbon/react';
import { ArrowLeft } from '@carbon/icons-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { backToOverview, setSelectedDayIndex } from '../../store/slices/itinerarySlice';
import './DayWeekPanel.css';

function DayWeekPanel() {
  const dispatch = useAppDispatch();
  const currentItinerary = useAppSelector((state) => state.itinerary.currentItinerary);
  const selectedDayIndex = useAppSelector((state) => state.itinerary.selectedDayIndex);

  const tripLength = currentItinerary
    ? Math.ceil(
        (new Date(currentItinerary.endDate).getTime() -
          new Date(currentItinerary.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 0;

  if (!currentItinerary) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--cds-text-secondary)' }}>
        No itinerary loaded
      </div>
    );
  }

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

  // Helper functions for future use
  // const getCategoryColor = (category: string) => {
  //   switch (category) {
  //     case 'transit': return 'blue';
  //     case 'meal': return 'red';
  //     case 'lodging': return 'purple';
  //     case 'reservation': return 'green';
  //     case 'activity': return 'cyan';
  //     default: return 'gray';
  //   }
  // };

  // const getStatusIcon = (status?: string) => {
  //   if (status === 'confirmed') return <Checkmark size={16} />;
  //   if (status === 'pending') return <Time size={16} />;
  //   return null;
  // };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          padding: '0.5rem 0',
          borderBottom: '1px solid var(--cds-border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={ArrowLeft}
            onClick={() => dispatch(backToOverview())}
          >
            Back to Overview
          </Button>
          <span style={{ color: 'var(--cds-text-secondary)' }}>/</span>
          <span>Daily View</span>
        </div>
      </div>

      {/* Day chooser (horizontal scroll for >4 days) */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          marginBottom: '1.5rem',
          padding: '0.5rem 0',
        }}
      >
        {days.map((day) => (
          <Tag
            key={day.dayIndex}
            type={selectedDayIndex === day.dayIndex ? 'blue' : 'gray'}
            size="md"
            style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={() => dispatch(setSelectedDayIndex(day.dayIndex))}
          >
            Day {day.dayIndex + 1} ({day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
          </Tag>
        ))}
      </div>

      {/* Detail view */}
      {selectedDayIndex !== null ? (
        <div>
          <h5 style={{ marginBottom: '1rem' }}>
            Day {selectedDayIndex + 1} -{' '}
            {days[selectedDayIndex].date.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h5>
          {days[selectedDayIndex].items.length > 0 ? (
            <Accordion>
              {days[selectedDayIndex].items.map((item) => (
                <AccordionItem key={item.id} title={item.title}>
                  <div style={{ padding: '0.5rem 0' }}>
                    {item.startTime && (
                      <p>
                        <strong>Time:</strong>{' '}
                        {new Date(item.startTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {item.endTime &&
                          ` - ${new Date(item.endTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}`}
                      </p>
                    )}
                    <p>
                      <strong>Type:</strong> <Tag size="sm">{item.category}</Tag>
                    </p>
                    {item.location && (
                      <p>
                        <strong>Location:</strong> {item.location}
                      </p>
                    )}
                    {item.description && (
                      <p style={{ color: 'var(--cds-text-secondary)' }}>{item.description}</p>
                    )}
                    {item.status && (
                      <p>
                        <strong>Status:</strong>{' '}
                        <Tag
                          type={
                            item.status === 'confirmed'
                              ? 'green'
                              : item.status === 'pending'
                              ? 'cyan'
                              : item.status === 'needs_attention'
                              ? 'red'
                              : 'gray'
                          }
                          size="sm"
                        >
                          {item.status}
                        </Tag>
                      </p>
                    )}
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <Tile style={{ textAlign: 'center', padding: '2rem', color: 'var(--cds-text-secondary)' }}>
              No activities scheduled for this day
            </Tile>
          )}
        </div>
      ) : (
        <Tile style={{ textAlign: 'center', padding: '2rem', color: 'var(--cds-text-secondary)' }}>
          Select a day above to view details
        </Tile>
      )}
    </div>
  );
}

export default DayWeekPanel;
