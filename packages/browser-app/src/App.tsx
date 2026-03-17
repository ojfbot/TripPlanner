import { useState, useEffect, useRef } from 'react';
import {
  Theme,
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  HeaderMenuButton,
  SideNav,
  SideNavItems,
  TextInput,
} from '@carbon/react';
import { Asleep, Light, Settings } from '@carbon/icons-react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState } from './store';
import { setAppSwitcherExpanded, setImportModalOpen } from './store/slices/uiSlice';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import ImportAgentModal from './components/ImportAgentModal';
import './App.scss';

function AppContent() {
  const dispatch = useDispatch();
  const tripShortTitle = useSelector((state: RootState) => state.trip.shortTitle);
  const importModalOpen = useSelector((state: RootState) => state.ui.importModalOpen);
  const [theme, setTheme] = useState<'white' | 'g100'>('g100');
  const [sideNavExpanded, setSideNavExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mock applications for demo
  const applications = [
    'TripPlanner',
    'BlogEngine',
    'Resume Builder',
    'Project Manager',
    'Analytics Dashboard',
  ];

  // Port mapping for app navigation
  const appPorts: Record<string, number> = {
    'TripPlanner': 3010,
    'BlogEngine': 3005,
    'Resume Builder': 3000,
  };

  const filteredApplications = applications.filter(app =>
    app.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-carbon-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'white' ? 'g100' : 'white');
  };

  const onClickSideNavExpand = () => {
    const newExpanded = !sideNavExpanded;
    setSideNavExpanded(newExpanded);
    dispatch(setAppSwitcherExpanded(newExpanded));

    // Add/remove class on body for modal positioning
    if (newExpanded) {
      console.log('[App] Adding app-switcher-expanded class to body');
      document.body.classList.add('app-switcher-expanded');
    } else {
      console.log('[App] Removing app-switcher-expanded class from body');
      document.body.classList.remove('app-switcher-expanded');
    }
  };

  const handleAppClick = (appName: string) => {
    const port = appPorts[appName];
    if (port) {
      const url = `http://localhost:${port}`;
      window.location.href = url;
    }
    setSideNavExpanded(false); // Close sidebar after click
  };

  // Focus search input when sidebar expands
  useEffect(() => {
    if (sideNavExpanded && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    }
  }, [sideNavExpanded]);

  return (
    <Theme theme={theme}>
      <div className="app-container" style={{ maxHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header aria-label="TripPlanner">
          <HeaderMenuButton
            data-element="sidebar-toggle"
            aria-label={sideNavExpanded ? 'Close menu' : 'Open menu'}
            onClick={onClickSideNavExpand}
            isActive={sideNavExpanded}
            aria-expanded={sideNavExpanded}
          />
          <HeaderName prefix="">{tripShortTitle}</HeaderName>
          <HeaderGlobalBar>
            <HeaderGlobalAction
              data-element="settings-toggle"
              aria-label="Settings"
              tooltipAlignment="end"
              onClick={() => setSettingsModalOpen(true)}
            >
              <Settings size={20} />
            </HeaderGlobalAction>
            <HeaderGlobalAction
              data-element="theme-toggle"
              aria-label="Toggle theme"
              tooltipAlignment="end"
              onClick={toggleTheme}
            >
              {theme === 'white' ? <Asleep size={20} /> : <Light size={20} />}
            </HeaderGlobalAction>
          </HeaderGlobalBar>
        </Header>

        {sideNavExpanded && (
          <SideNav
            aria-label="Side navigation"
            expanded={sideNavExpanded}
            onOverlayClick={onClickSideNavExpand}
            className="app-switcher-nav"
          >
            <SideNavItems>
              <div className="sidebar-search-container">
                <TextInput
                  ref={searchInputRef}
                  id="app-search"
                  labelText=""
                  placeholder="Search applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="lg"
                />

                <div className="applications-list">
                  {filteredApplications.length > 0 ? (
                    filteredApplications.map((app, index) => (
                      <div
                        key={index}
                        className="application-item"
                        onClick={() => handleAppClick(app)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleAppClick(app);
                          }
                        }}
                      >
                        {app}
                      </div>
                    ))
                  ) : (
                    <div className="no-results">No applications found</div>
                  )}
                </div>
              </div>
            </SideNavItems>
          </SideNav>
        )}

        <div className="main-content" style={{ marginLeft: sideNavExpanded ? '256px' : '0', transition: 'margin-left 0.11s cubic-bezier(0.2, 0, 1, 0.9)', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Dashboard />
        </div>

        {/* Settings Modal */}
        <SettingsModal
          open={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
        />

        {/* Import Agent Modal */}
        <ImportAgentModal
          open={importModalOpen}
          onClose={() => dispatch(setImportModalOpen(false))}
          onComplete={() => {
            dispatch(setImportModalOpen(false));
          }}
        />
      </div>
    </Theme>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
