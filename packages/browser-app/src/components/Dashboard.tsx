import { useState } from 'react';
import { Provider } from 'react-redux';
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Heading,
  Tooltip,
} from '@carbon/react';
import { Menu, Close } from '@carbon/icons-react';
import { DashboardLayout, ErrorBoundary } from '@ojfbot/frame-ui-components';
import '@ojfbot/frame-ui-components/styles/dashboard-layout';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCurrentTab } from '../store/slices/navigationSlice';
import { TabKey, TAB_ORDER, getTabByKey } from '../models/navigation';
import InteractiveChat from './InteractiveChat';
import TripsLibrary from './TripsLibrary';
import ItinerariesLibrary from './ItinerariesLibrary';
import IntegrationsLibrary from './IntegrationsLibrary';
import CondensedChat from './CondensedChat';
import ThreadSidebarConnected from './ThreadSidebarConnected';
// MF isolation: Dashboard may be loaded as a Module Federation remote under the shell's
// Provider (which has no TripPlanner slices). Wrap with the local store so
// DashboardContent always resolves against the correct Redux context.
import { store } from '../store';
import './Dashboard.css';

interface DashboardProps {
  /** True when mounted inside the Frame shell host. Suppresses standalone-mode
   *  margins and activates the flex height chain so content fills the shell frame. */
  shellMode?: boolean;
}

function DashboardContent({ shellMode }: DashboardProps) {
  const dispatch = useAppDispatch();
  const currentTab = useAppSelector(state => state.navigation.currentTab);
  const currentTabIndex = useAppSelector(state => state.navigation.currentTabIndex);
  const tripTitle = useAppSelector(state => state.trip.title);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const showThreadSidebar = true;

  const renderTabContent = (tabKey: TabKey) => {
    switch (tabKey) {
      case TabKey.INTERACTIVE:
        return (
          <ErrorBoundary>
            <InteractiveChat />
          </ErrorBoundary>
        );
      case TabKey.TRIPS:
        return <TripsLibrary />;
      case TabKey.ITINERARIES:
        return <ItinerariesLibrary />;
      case TabKey.INTEGRATIONS:
        return <IntegrationsLibrary />;
      default:
        return <div>Unknown tab</div>;
    }
  };

  return (
    <>
      {/* Thread sidebar for managing conversation sessions */}
      {showThreadSidebar && (
        <ThreadSidebarConnected
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      )}

      <DashboardLayout
        shellMode={shellMode}
        sidebarExpanded={showThreadSidebar && sidebarExpanded}
      >
        <DashboardLayout.Header>
          <Heading>{tripTitle}</Heading>

          <div className="dashboard-header-actions">
            {/* Thread sidebar toggle button */}
            {showThreadSidebar && (
              <Tooltip
                align="bottom-right"
                label={sidebarExpanded ? 'Close threads' : 'Show threads'}
              >
                <button
                  className="sidebar-toggle-btn"
                  onClick={() => setSidebarExpanded(!sidebarExpanded)}
                  aria-label="Toggle thread sidebar"
                >
                  {sidebarExpanded ? <Close size={20} /> : <Menu size={20} />}
                </button>
              </Tooltip>
            )}
          </div>
        </DashboardLayout.Header>

        <Tabs
          selectedIndex={currentTabIndex}
          onChange={({ selectedIndex }) => dispatch(setCurrentTab(selectedIndex))}
        >
          <TabList aria-label="TripPlanner sections" contained>
            {TAB_ORDER.map(tabKey => {
              const tab = getTabByKey(tabKey);
              return (
                <Tab
                  key={tabKey}
                  data-element={`${tabKey}-tab`}
                >
                  {tab.icon} {tab.label}
                </Tab>
              );
            })}
          </TabList>
          <TabPanels>
            {TAB_ORDER.map(tabKey => (
              <TabPanel
                key={tabKey}
                data-element={`${tabKey}-panel`}
              >
                {renderTabContent(tabKey)}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </DashboardLayout>

      {/* Show condensed chat on all non-Interactive tabs */}
      {currentTab !== TabKey.INTERACTIVE && (
        <ErrorBoundary>
          <CondensedChat sidebarExpanded={showThreadSidebar && sidebarExpanded} />
        </ErrorBoundary>
      )}
    </>
  );
}

// Self-contained export for Module Federation. Carries its own store so Redux
// slices always resolve correctly regardless of which Provider is above.
// In standalone mode App.tsx wraps with the same store singleton — harmless double-wrap.
function Dashboard({ shellMode }: DashboardProps) {
  return (
    <Provider store={store}>
      <DashboardContent shellMode={shellMode} />
    </Provider>
  );
}

export default Dashboard;
