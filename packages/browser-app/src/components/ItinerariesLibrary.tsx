import { useState } from 'react';
import {
  Heading,
  Tile,
  Button,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import { DocumentAdd, View, Edit, Download } from '@carbon/icons-react';

interface Itinerary {
  id: string;
  title: string;
  destination: string;
  days: number;
  created: string;
}

function ItinerariesLibrary() {
  const [itineraries] = useState<Itinerary[]>([]);

  const headers = [
    { key: 'title', header: 'Itinerary Name' },
    { key: 'destination', header: 'Destination' },
    { key: 'days', header: 'Duration' },
    { key: 'created', header: 'Created' },
    { key: 'actions', header: 'Actions' },
  ];

  const rows = itineraries.map((itinerary) => ({
    id: itinerary.id,
    title: itinerary.title,
    destination: itinerary.destination,
    days: `${itinerary.days} days`,
    created: itinerary.created,
    actions: (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          size="sm"
          kind="ghost"
          renderIcon={View}
          iconDescription="View"
          hasIconOnly
          onClick={() => console.log('View itinerary:', itinerary)}
        />
        <Button
          size="sm"
          kind="ghost"
          renderIcon={Edit}
          iconDescription="Edit"
          hasIconOnly
          onClick={() => console.log('Edit itinerary:', itinerary)}
        />
        <Button
          size="sm"
          kind="ghost"
          renderIcon={Download}
          iconDescription="Export"
          hasIconOnly
          onClick={() => console.log('Export itinerary:', itinerary)}
        />
      </div>
    ),
  }));

  return (
    <div className="dashboard-content" data-element="itineraries-library">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Heading className="section-header">Itineraries</Heading>
        <Button
          data-element="add-itinerary-button"
          renderIcon={DocumentAdd}
          kind="primary"
          onClick={() => console.log('Add itinerary clicked')}
        >
          Add Itinerary
        </Button>
      </div>

      <Tile style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--cds-text-secondary)' }}>
          Create and manage detailed day-by-day itineraries for your trips. Plan activities,
          track reservations, and organize all your travel details in one place.
        </p>
      </Tile>

      <DataTable rows={rows} headers={headers}>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
          <TableContainer data-element="itineraries-table-container">
            <Table {...getTableProps()} data-element="itineraries-table">
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
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={headers.length} style={{ textAlign: 'center', padding: '2rem' }}>
                      <div style={{ color: 'var(--cds-text-secondary)' }}>
                        No itineraries yet. Add your first itinerary to get started!
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row: any) => (
                    <TableRow {...getRowProps({ row })} key={row.id} data-element="itinerary-row">
                      {row.cells.map((cell: any) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    </div>
  );
}

export default ItinerariesLibrary;
