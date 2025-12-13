import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TabKey, TAB_ORDER } from '../../models/navigation';

export interface NavigationState {
  currentTab: TabKey;
  currentTabIndex: number;
}

const initialState: NavigationState = {
  currentTab: TabKey.INTERACTIVE,
  currentTabIndex: 0,
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setCurrentTab: (state, action: PayloadAction<number>) => {
      state.currentTabIndex = action.payload;
      state.currentTab = TAB_ORDER[action.payload];
    },
  },
});

export const { setCurrentTab } = navigationSlice.actions;
export default navigationSlice.reducer;
