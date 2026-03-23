import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type CanvasState = {
  scale: number
  tx: number
  ty: number
  handMode: boolean
  magnifierMode: boolean
}

const initialState: CanvasState = {
  scale: 1,
  tx: 0,
  ty: 0,
  handMode: true,
  magnifierMode: false,
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    setScale(state, action: PayloadAction<number>) {
      // Changed minimum from 0.25 to 0.05 to allow wide diagrams to fit on screen
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
  },
})

export const { setScale, setTranslate, setHandMode, setMagnifierMode } = canvasSlice.actions
export const canvasReducer = canvasSlice.reducer