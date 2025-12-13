import { Chat, Book, Notebook, Connect } from '@carbon/icons-react';

export enum TabKey {
  INTERACTIVE = 'interactive',
  TRIPS = 'trips',
  ITINERARIES = 'itineraries',
  INTEGRATIONS = 'integrations',
}

export interface TabDefinition {
  key: TabKey;
  label: string;
  icon: JSX.Element;
}

export const TAB_ORDER: TabKey[] = [
  TabKey.INTERACTIVE,
  TabKey.TRIPS,
  TabKey.ITINERARIES,
  TabKey.INTEGRATIONS,
];

export const TABS: Record<TabKey, TabDefinition> = {
  [TabKey.INTERACTIVE]: {
    key: TabKey.INTERACTIVE,
    label: 'Interactive',
    icon: <Chat size={16} />,
  },
  [TabKey.TRIPS]: {
    key: TabKey.TRIPS,
    label: 'My Trips',
    icon: <Book size={16} />,
  },
  [TabKey.ITINERARIES]: {
    key: TabKey.ITINERARIES,
    label: 'Itineraries',
    icon: <Notebook size={16} />,
  },
  [TabKey.INTEGRATIONS]: {
    key: TabKey.INTEGRATIONS,
    label: 'Integrations',
    icon: <Connect size={16} />,
  },
};

export function getTabByKey(key: TabKey): TabDefinition {
  return TABS[key];
}
