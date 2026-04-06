import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RoadmapTabKey } from '../types/ui'

export type UiState = {
  activeTab: RoadmapTabKey
}

const initialState: UiState = {
  activeTab: 'Model View',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<RoadmapTabKey>) {
      state.activeTab = action.payload
    },
  },
})

export const { setActiveTab } = uiSlice.actions
export const uiReducer = uiSlice.reducer

