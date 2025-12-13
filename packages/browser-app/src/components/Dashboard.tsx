import { useState } from 'react';
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
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCurrentTab } from '../store/slices/navigationSlice';
import { TabKey, TAB_ORDER, getTabByKey } from '../models/navigation';
import InteractiveChat from './InteractiveChat';
import TripsLibrary from './TripsLibrary';
import ItinerariesLibrary from './ItinerariesLibrary';
import IntegrationsLibrary from './IntegrationsLibrary';
import CondensedChat from './CondensedChat';
import ThreadSidebar from './ThreadSidebar';
import ErrorBoundary from './ErrorBoundary';
import './Dashboard.css';

function Dashboard() {
  const dispatch = useAppDispatch();
  const currentTab = useAppSelector(state => state.navigation.currentTab);
  const currentTabIndex = useAppSelector(state => state.navigation.currentTabIndex);
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
        <ThreadSidebar
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      )}

      <div
        className={`dashboard-wrapper ${showThreadSidebar && sidebarExpanded ? 'with-sidebar' : ''}`}
        data-element="app-container"
      >
        <div className="dashboard-header">
          <Heading>TripPlanner Dashboard</Heading>

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
        </div>

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
      </div>

      {/* Show condensed chat on all non-Interactive tabs */}
      {currentTab !== TabKey.INTERACTIVE && (
        <ErrorBoundary>
          <CondensedChat sidebarExpanded={showThreadSidebar && sidebarExpanded} />
        </ErrorBoundary>
      )}
    </>
  );
}

export default Dashboard;
