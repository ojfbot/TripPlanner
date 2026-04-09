import { Tooltip, IconButton } from '@carbon/react';
import { ViewOff, View } from '@carbon/icons-react';

interface TableHeadersProps {
  detailedView: boolean;
  setDetailedView: (v: boolean) => void;
}

export default function TableHeaders({ detailedView, setDetailedView }: TableHeadersProps) {
  if (detailedView) {
    return (
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
    );
  }

  return (
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
  );
}
