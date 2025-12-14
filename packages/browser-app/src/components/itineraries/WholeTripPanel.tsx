import { useMemo } from 'react';
import {
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  Dropdown,
  Tag,
} from '@carbon/react';
import { ArrowLeft } from '@carbon/icons-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { backToOverview, setGranularity } from '../../store/slices/itinerarySlice';
import { Granularity } from '../../types/itinerary';

function WholeTripPanel() {
  const dispatch = useAppDispatch();
  const currentItinerary = useAppSelector((state) => state.itinerary.currentItinerary);
  const granularity = useAppSelector((state) => state.itinerary.granularity);

  const tripLength = currentItinerary
    ? Math.ceil(
        (new Date(currentItinerary.endDate).getTime() -
          new Date(currentItinerary.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 0;

  // Compute adaptive granularity
  const effectiveGranularity: Granularity = useMemo(() => {
    if (granularity !== 'auto') return granularity;
    
    if (tripLength <= 2) return 'hourly';
    if (tripLength <= 7) return 'daily';
    if (tripLength <= 21) return 'weekly';
    return 'weekly';
  }, [granularity, tripLength]);

  // Group items by granularity
  const groupedItems = useMemo(() => {
    if (!currentItinerary) return [];

    const groups: Record<string, any[]> = {};
    
    currentItinerary.items.forEach((item) => {
      let groupKey: string;
      const startDate = new Date(currentItinerary.startDate);
      const itemDate = new Date(startDate.getTime() + item.dayIndex * 24 * 60 * 60 * 1000);
      
      if (effectiveGranularity === 'hourly') {
        groupKey = `Day ${item.dayIndex + 1}`;
      } else if (effectiveGranularity === 'daily') {
        groupKey = `Day ${item.dayIndex + 1} - ${itemDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        const weekNum = Math.floor(item.dayIndex / 7) + 1;
        groupKey = `Week ${weekNum}`;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    return Object.entries(groups).map(([key, items]) => ({
      groupKey: key,
      items,
    }));
  }, [currentItinerary, effectiveGranularity]);

  const headers = [
    { key: 'time', header: 'Time' },
    { key: 'title', header: 'Activity' },
    { key: 'category', header: 'Type' },
    { key: 'location', header: 'Location' },
    { key: 'status', header: 'Status' },
  ];

  const granularityOptions = [
    { id: 'auto', label: 'Auto' },
    { id: 'hourly', label: 'Hourly' },
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
  ];

  if (!currentItinerary) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--cds-text-secondary)' }}>
        No itinerary loaded
      </div>
    );
  }

  return (
    <div>
      {/* Header with breadcrumb and controls */}
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
          <span>Whole Trip</span>
        </div>
        <Dropdown
          id="granularity-dropdown"
          titleText=""
          label="Granularity"
          items={granularityOptions}
          itemToString={(item) => (item ? item.label : '')}
          selectedItem={granularityOptions.find((opt) => opt.id === granularity)}
          onChange={({ selectedItem }) =>
            selectedItem && dispatch(setGranularity(selectedItem.id as Granularity))
          }
          size="sm"
        />
      </div>

      {/* Trip summary */}
      <div style={{ marginBottom: '1.5rem', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
        {currentItinerary.title} · {tripLength} days · {currentItinerary.destinations.join(', ')}
      </div>

      {/* Grouped itinerary table */}
      <div style={{ marginBottom: '1rem' }}>
        {groupedItems.map((group) => {
          const rows = group.items.map((item) => ({
            id: item.id,
            time: item.startTime
              ? new Date(item.startTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : '—',
            title: item.title,
            category: (
              <Tag type="blue" size="sm">
                {item.category}
              </Tag>
            ),
            location: item.location || item.toLocation || '—',
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
          }));

          return (
            <div key={group.groupKey} style={{ marginBottom: '2rem' }}>
              <h5 style={{ marginBottom: '0.5rem' }}>{group.groupKey}</h5>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WholeTripPanel;
