import { useState } from 'react';
import {
  Heading,
  Tile,
  Button,
  Grid,
  Column,
} from '@carbon/react';
import {
  Add,
  ChatBot,
  Upload,
  Location,
  Map,
  Calendar,
  FlightInternational,
} from '@carbon/icons-react';

interface TripCard {
  id: string;
  title: string;
  destination: string;
  dates: string;
  status: 'planning' | 'upcoming' | 'completed';
  imageUrl?: string;
}

function TripsLibrary() {
  const [trips] = useState<TripCard[]>([]);

  const actionTiles = [
    {
      icon: ChatBot,
      title: 'Plan with AI',
      description: 'Chat with AI to create a personalized trip itinerary based on your preferences',
      onClick: () => console.log('Chat to plan clicked'),
    },
    {
      icon: Location,
      title: 'Pick Destination',
      description: 'Browse and select from popular destinations or enter your own',
      onClick: () => console.log('Pick destination clicked'),
    },
    {
      icon: Upload,
      title: 'Import Itinerary',
      description: 'Upload existing travel documents, confirmations, or itineraries',
      onClick: () => console.log('Import itinerary clicked'),
    },
    {
      icon: Calendar,
      title: 'Set Dates',
      description: 'Start by selecting your travel dates and let AI suggest activities',
      onClick: () => console.log('Set dates clicked'),
    },
  ];

  return (
    <div className="dashboard-content" data-element="trips-library">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Heading className="section-header">My Trips</Heading>
        <Button renderIcon={Add} kind="primary">
          New Trip
        </Button>
      </div>

      <Grid narrow>
        <Column lg={12} md={8} sm={4}>
          <Tile style={{ marginBottom: '2rem' }}>
            <p style={{ color: 'var(--cds-text-secondary)' }}>
              Create and manage your travel plans. Use AI to discover destinations, plan itineraries,
              and organize all your trip details in one place.
            </p>
          </Tile>
        </Column>
      </Grid>

      {trips.length === 0 ? (
        <>
          <Heading style={{ fontSize: '1rem', marginBottom: '1rem' }}>
            Get started with your first trip
          </Heading>
          <div className="card-container">
            {actionTiles.map((tile, index) => {
              const TileIcon = tile.icon;
              return (
                <Tile
                  key={index}
                  data-element={`trip-action-tile-${index}`}
                  style={{
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--cds-border-interactive)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onClick={tile.onClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      tile.onClick();
                    }
                  }}
                >
                  <TileIcon size={48} style={{ marginBottom: '1rem', color: 'var(--cds-icon-primary)' }} />
                  <Heading style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                    {tile.title}
                  </Heading>
                  <p style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                    {tile.description}
                  </p>
                </Tile>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <Heading style={{ fontSize: '1rem', marginBottom: '1rem' }}>
            Your Trips ({trips.length})
          </Heading>
          <div className="card-container">
            {trips.map((trip) => (
              <Tile
                key={trip.id}
                data-element="trip-card"
                style={{
                  minHeight: '220px',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--cds-border-interactive)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={() => console.log('View trip:', trip)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <FlightInternational size={20} style={{ color: 'var(--cds-icon-primary)' }} />
                  <Heading style={{ fontSize: '1.125rem' }}>
                    {trip.title}
                  </Heading>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Map size={16} style={{ color: 'var(--cds-icon-secondary)' }} />
                    <span style={{ color: 'var(--cds-text-primary)', fontSize: '0.875rem' }}>
                      {trip.destination}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Calendar size={16} style={{ color: 'var(--cds-icon-secondary)' }} />
                    <span style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                      {trip.dates}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--cds-border-subtle)',
                    fontSize: '0.75rem',
                    color: 'var(--cds-text-secondary)',
                    textTransform: 'capitalize',
                  }}
                >
                  Status: {trip.status}
                </div>
              </Tile>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default TripsLibrary;
