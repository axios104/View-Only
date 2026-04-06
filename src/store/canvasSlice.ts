import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type CanvasState = {
  scale: number
  tx: number
  ty: number
  handMode: boolean
  magnifierMode: boolean
  mode: 'none' | 'view' | 'edit'
  selectedEditNodeId: string | null
  selectedEditEdgeId: string | null
  pendingAddType: string | null
}

const initialState: CanvasState = {
  scale: 0.85,
  tx: 0,
  ty: 0,
  handMode: false,
  magnifierMode: false,
  mode: 'view',
  selectedEditNodeId: null,
  selectedEditEdgeId: null,
  pendingAddType: null,
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    setScale(state, action: PayloadAction<number>) {
      state.scale = clamp(action.payload, 0.05, 4.0)
    },
    setTranslate(state, action: PayloadAction<{ tx: number; ty: number }>) {
      state.tx = action.payload.tx
      state.ty = action.payload.ty
    },
    setHandMode(state, action: PayloadAction<boolean>) {
      state.handMode = action.payload
      if (action.payload) state.magnifierMode = false
    },
    setMagnifierMode(state, action: PayloadAction<boolean>) {
      state.magnifierMode = action.payload
      if (action.payload) state.handMode = false
    },
    setMode(state, action: PayloadAction<'none' | 'view' | 'edit'>) {
      state.mode = action.payload
      if (action.payload !== 'edit') {
        state.selectedEditNodeId = null
        state.pendingAddType = null
      }
    },
    setSelectedEditNodeId(state, action: PayloadAction<string | null>) {
      state.selectedEditNodeId = action.payload
      if (action.payload) state.selectedEditEdgeId = null // Mutually exclusive
    },
    setSelectedEditEdgeId(state, action: PayloadAction<string | null>) {
      state.selectedEditEdgeId = action.payload
      if (action.payload) state.selectedEditNodeId = null
    },
    setPendingAddType(state, action: PayloadAction<string | null>) {
      state.pendingAddType = action.payload
    },
  },
})

export const { setScale, setTranslate, setHandMode, setMagnifierMode, setMode, setSelectedEditNodeId, setSelectedEditEdgeId, setPendingAddType } = canvasSlice.actions
export const canvasReducer = canvasSlice.reducer