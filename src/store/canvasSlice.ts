import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type CanvasState = {
  scale: number
  tx: number
  ty: number
  handMode: boolean
}

const initialState: CanvasState = {
  scale: 1,
  tx: 0,
  ty: 0,
  handMode: true,
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    setScale(state, action: PayloadAction<number>) {
      state.scale = clamp(action.payload, 0.25, 2.5)
    },
    setTranslate(state, action: PayloadAction<{ tx: number; ty: number }>) {
      state.tx = action.payload.tx
      state.ty = action.payload.ty
    },
    setHandMode(state, action: PayloadAction<boolean>) {
      state.handMode = action.payload
    },
    resetView(state) {
      state.scale = 1
      state.tx = 0
      state.ty = 0
    },
  },
})

export const { setScale, setTranslate, setHandMode, resetView } = canvasSlice.actions
export const canvasReducer = canvasSlice.reducer

