import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { RoadmapDiagram } from '../types/roadmap'
import { getRoadmapDiagram } from '../services/roadmapApi'

export type DiagramState = {
  data: RoadmapDiagram | null
  loading: boolean
  error: string | null
}

const initialState: DiagramState = {
  data: null,
  loading: false,
  error: null,
}

export const fetchDiagram = createAsyncThunk(
  'diagram/fetchDiagram',
  async (_, { rejectWithValue }) => {
    try {
      const diagram = await getRoadmapDiagram()
      return diagram
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

const diagramSlice = createSlice({
  name: 'diagram',
  initialState,
  reducers: {
    setDiagram(state, action: PayloadAction<RoadmapDiagram>) {
      state.data = action.payload
      state.error = null
    },
    clearDiagram(state) {
      state.data = null
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDiagram.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDiagram.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
        state.error = null
      })
      .addCase(fetchDiagram.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { setDiagram, clearDiagram } = diagramSlice.actions
export const diagramReducer = diagramSlice.reducer
