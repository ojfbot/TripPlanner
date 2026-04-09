import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setCurrentItinerary } from '../../store/slices/itinerarySlice';
import { fetchDocuments } from '../../store/slices/documentsSlice';
import { documentsToItineraries } from '../../utils/itineraryTransform';
import { mockItinerary } from '../../data/mockItinerary';

export function useItinerariesLibrary() {
  const dispatch = useAppDispatch();
  const currentItinerary = useAppSelector((state) => state.itinerary.currentItinerary);
  const { documents, isLoading } = useAppSelector((state) => state.documents);
  const [detailedView, setDetailedView] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [availableItineraries, setAvailableItineraries] = useState<any[]>([]);

  useEffect(() => {
    console.log('[ItinerariesLibrary] Fetching documents for default-user');
    dispatch(fetchDocuments({ userId: 'default-user' }));

    const intervalId = setInterval(() => {
      if (documents.length === 0 && !isLoading) {
        console.log('[ItinerariesLibrary] Refetching documents (empty state)');
        dispatch(fetchDocuments({ userId: 'default-user' }));
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

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

      const allItineraries = itineraries.length > 0 ? itineraries : [mockItinerary];
      setAvailableItineraries(allItineraries);

      if (!currentItinerary) {
        console.log('[ItinerariesLibrary] Setting current itinerary:', allItineraries[0].title);
        dispatch(setCurrentItinerary(allItineraries[0]));
      }
    } else if (!isLoading && documents.length === 0) {
      console.log('[ItinerariesLibrary] No documents found, using mock itinerary');
      setAvailableItineraries([mockItinerary]);
      if (!currentItinerary) {
        dispatch(setCurrentItinerary(mockItinerary));
      }
    }
  }, [dispatch, documents, isLoading, currentItinerary]);

  const tripLength = currentItinerary
    ? Math.ceil(
        (new Date(currentItinerary.endDate).getTime() -
          new Date(currentItinerary.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 0;

  const days = currentItinerary
    ? Array.from({ length: tripLength }, (_, i) => {
        const startDate = new Date(currentItinerary.startDate);
        const dayDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dayItems = currentItinerary.items.filter((item) => item.dayIndex === i);
        return { dayIndex: i, date: dayDate, items: dayItems };
      })
    : [];

  const transitCount = currentItinerary
    ? currentItinerary.items.filter((item) => item.category === 'transit').length
    : 0;
  const mealCount = currentItinerary
    ? currentItinerary.items.filter((item) => item.category === 'meal').length
    : 0;
  const reservationCount = currentItinerary
    ? currentItinerary.items.filter((item) => item.status).length
    : 0;
  const lodgingCount = currentItinerary
    ? currentItinerary.items.filter((item) => item.category === 'lodging').length
    : 0;

  return {
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
  };
}
