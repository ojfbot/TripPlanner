import {
  Button,
  ContentSwitcher,
  Switch,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  Tag,
  Tile,
} from '@carbon/react';
import { ArrowLeft } from '@carbon/icons-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { backToOverview, setActiveSpecialistMode } from '../../store/slices/itinerarySlice';
import { SpecialistMode } from '../../types/itinerary';

function SpecialistPanel() {
  const dispatch = useAppDispatch();
  const currentItinerary = useAppSelector((state) => state.itinerary.currentItinerary);
  const activeSpecialistMode = useAppSelector((state) => state.itinerary.activeSpecialistMode);

  if (!currentItinerary) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--cds-text-secondary)' }}>
        No itinerary loaded
      </div>
    );
  }

  // Filter items by mode
  const filteredItems = currentItinerary.items.filter((item) => {
    if (!activeSpecialistMode) return false;
    return item.category === activeSpecialistMode || 
           (activeSpecialistMode === 'meals' && item.category === 'meal');
  });

  const renderTransitView = () => {
    const headers = [
      { key: 'time', header: 'Time' },
      { key: 'from', header: 'From' },
      { key: 'to', header: 'To' },
      { key: 'mode', header: 'Mode' },
      { key: 'vendor', header: 'Vendor' },
      { key: 'confirmation', header: 'Confirmation' },
    ];

    const rows = filteredItems.map((item) => ({
      id: item.id,
      time: item.startTime
        ? new Date(item.startTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
        : '—',
      from: item.fromLocation || '—',
      to: item.toLocation || '—',
      mode: item.transitMode || '—',
      vendor: item.vendor || '—',
      confirmation: item.confirmationNumber || '—',
    }));

    return (
      <DataTable rows={rows} headers={headers}>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
          <TableContainer>
            <Table {...getTableProps()} size="sm">
              <TableHead>
                <TableRow>
                  {headers.map((header: any) => (
                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row: any) => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map((cell: any) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    );
  };

  const renderMealsView = () => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {filteredItems.map((item) => (
          <Tile key={item.id} style={{ padding: '1rem' }}>
            <h5 style={{ marginBottom: '0.5rem' }}>{item.title}</h5>
            <div style={{ marginBottom: '0.5rem' }}>
              {item.mealType && <Tag size="sm" type="blue">{item.mealType}</Tag>}
              {item.cuisine && <Tag size="sm" type="cyan" style={{ marginLeft: '0.25rem' }}>{item.cuisine}</Tag>}
            </div>
            {item.location && (
              <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
                📍 {item.location}
              </p>
            )}
            {item.startTime && (
              <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
                🕐 {new Date(item.startTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}
            {item.status && (
              <Tag
                type={item.status === 'confirmed' ? 'green' : 'cyan'}
                size="sm"
                style={{ marginTop: '0.5rem' }}
              >
                {item.status}
              </Tag>
            )}
          </Tile>
        ))}
      </div>
    );
  };

  const renderReservationsView = () => {
    const headers = [
      { key: 'title', header: 'Reservation' },
      { key: 'vendor', header: 'Vendor' },
      { key: 'time', header: 'Time' },
      { key: 'confirmation', header: 'Confirmation' },
      { key: 'status', header: 'Status' },
      { key: 'cost', header: 'Cost' },
    ];

    const rows = filteredItems.map((item) => ({
      id: item.id,
      title: item.title,
      vendor: item.vendor || '—',
      time: item.startTime
        ? new Date(item.startTime).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : '—',
      confirmation: item.confirmationNumber || '—',
      status: item.status ? (
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
      ) : (
        '—'
      ),
      cost: item.cost ? `${item.currency || ''}${item.cost}` : '—',
    }));

    return (
      <DataTable rows={rows} headers={headers}>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
          <TableContainer>
            <Table {...getTableProps()} size="sm">
              <TableHead>
                <TableRow>
                  {headers.map((header: any) => (
                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row: any) => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map((cell: any) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    );
  };

  const renderLodgingView = () => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
        {filteredItems.map((item) => (
          <Tile key={item.id} style={{ padding: '1.5rem' }}>
            <h5 style={{ marginBottom: '0.75rem' }}>{item.title}</h5>
            {item.address && (
              <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <strong>Address:</strong> {item.address}
              </p>
            )}
            {item.checkIn && (
              <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <strong>Check-in:</strong>{' '}
                {new Date(item.checkIn).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}
            {item.checkOut && (
              <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <strong>Check-out:</strong>{' '}
                {new Date(item.checkOut).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}
            {item.confirmationNumber && (
              <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <strong>Confirmation:</strong> {item.confirmationNumber}
              </p>
            )}
            {item.status && (
              <Tag
                type={item.status === 'confirmed' ? 'green' : 'cyan'}
                size="sm"
                style={{ marginTop: '0.5rem' }}
              >
                {item.status}
              </Tag>
            )}
          </Tile>
        ))}
      </div>
    );
  };

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
          <span>Specialist Views</span>
        </div>
      </div>

      {/* Mode switcher */}
      <div style={{ marginBottom: '1.5rem' }}>
        <ContentSwitcher
          size="md"
          selectedIndex={
            activeSpecialistMode === 'transit'
              ? 0
              : activeSpecialistMode === 'meals'
              ? 1
              : activeSpecialistMode === 'reservations'
              ? 2
              : 3
          }
          onChange={(e: any) => {
            const modes: SpecialistMode[] = ['transit', 'meals', 'reservations', 'lodging'];
            dispatch(setActiveSpecialistMode(modes[e.index]));
          }}
        >
          <Switch name="transit" text="Transit" />
          <Switch name="meals" text="Meals" />
          <Switch name="reservations" text="Reservations" />
          <Switch name="lodging" text="Lodging" />
        </ContentSwitcher>
      </div>

      {/* Content area */}
      {filteredItems.length > 0 ? (
        <div>
          {activeSpecialistMode === 'transit' && renderTransitView()}
          {activeSpecialistMode === 'meals' && renderMealsView()}
          {activeSpecialistMode === 'reservations' && renderReservationsView()}
          {activeSpecialistMode === 'lodging' && renderLodgingView()}
        </div>
      ) : (
        <Tile style={{ textAlign: 'center', padding: '3rem', color: 'var(--cds-text-secondary)' }}>
          No {activeSpecialistMode} found in this itinerary
        </Tile>
      )}
    </div>
  );
}

export default SpecialistPanel;
