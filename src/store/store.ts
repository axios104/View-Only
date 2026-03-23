import { configureStore } from '@reduxjs/toolkit'
import { uiReducer } from './uiSlice'
import { canvasReducer } from './canvasSlice'
import { diagramReducer } from './diagramSlice'

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    canvas: canvasReducer,
    diagram: diagramReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

