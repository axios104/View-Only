import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type CanvasState = {
  scale: number
  tx: number
  ty: number
  handMode: boolean
  magnifierMode: boolean
  mode: 'none' | 'view' | 'edit'
  selectedEditNodeIds: string[]
  selectedEditEdgeId: string | null
  pendingAddType: string | null
}

const initialState: CanvasState = {
  scale: 0.98,
  tx: 0,
  ty: 0,
  handMode: false,
  magnifierMode: false,
  mode: 'view',
  selectedEditNodeIds: [],
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
        state.selectedEditNodeIds = []
        state.pendingAddType = null
      }
    },
    setSelectedEditNodeIds(state, action: PayloadAction<string[]>) {
      state.selectedEditNodeIds = action.payload
      if (action.payload.length > 0) state.selectedEditEdgeId = null // Mutually exclusive
    },
    setSelectedEditNodeId(state, action: PayloadAction<string | null>) {
      state.selectedEditNodeIds = action.payload ? [action.payload] : []
      if (action.payload) state.selectedEditEdgeId = null // Mutually exclusive
    },
    setSelectedEditEdgeId(state, action: PayloadAction<string | null>) {
      state.selectedEditEdgeId = action.payload
      if (action.payload) state.selectedEditNodeIds = []
    },
    setPendingAddType(state, action: PayloadAction<string | null>) {
      state.pendingAddType = action.payload
    },
  },
})

export const { setScale, setTranslate, setHandMode, setMagnifierMode, setMode, setSelectedEditNodeIds, setSelectedEditNodeId, setSelectedEditEdgeId, setPendingAddType } = canvasSlice.actions
export const canvasReducer = canvasSlice.reducer