import { Airplane, Dining, Calendar, Building } from '@carbon/pictograms-react';

interface CategoryCardsProps {
  transitCount: number;
  mealCount: number;
  reservationCount: number;
  lodgingCount: number;
}

export default function CategoryCards({
  transitCount,
  mealCount,
  reservationCount,
  lodgingCount,
}: CategoryCardsProps) {
  return (
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
  );
}
