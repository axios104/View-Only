import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { RoadmapDiagram, RoadmapNode, RoadmapEdge, RoadmapLane } from '../types/roadmap'
import { getRoadmapDiagram } from '../services/roadmapApi'

export type DiagramState = {
  past: RoadmapDiagram[]
  data: RoadmapDiagram | null
  future: RoadmapDiagram[]
  loading: boolean
  error: string | null
}

const initialState: DiagramState = {
  past: [],
  data: null,
  future: [],
  loading: false,
  error: null,
}

function saveHistory(state: DiagramState) {
  if (state.data) {
    state.past.push(JSON.parse(JSON.stringify(state.data)))
    state.future = []
  }
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
    addNode(state, action: PayloadAction<{ node: RoadmapNode }>) {
      saveHistory(state)
      if (state.data) state.data.nodes.push(action.payload.node)
    },
    removeNode(state, action: PayloadAction<string>) {
      saveHistory(state)
      if (state.data) {
        state.data.nodes = state.data.nodes.filter(n => n.id !== action.payload)
        state.data.edges = state.data.edges.filter(e => {
          const s = e.source || e.from || ''
          const t = e.target || e.to || ''
          return s !== action.payload && t !== action.payload
        })
      }
    },
    updateNodeCoords(state, action: PayloadAction<{ id: string, posX: number, posY: number, laneId?: string }>) {
      saveHistory(state)
      if (state.data) {
        const node = state.data.nodes.find(n => n.id === action.payload.id)
        if (node) {
          node.posX = action.payload.posX
          node.posY = action.payload.posY
          if (action.payload.laneId) {
            node.laneId = action.payload.laneId
          }
        }
      }
    },
    addEdge(state, action: PayloadAction<{ edge: RoadmapEdge }>) {
      saveHistory(state)
      if (state.data) {
        const aSrc = action.payload.edge.source || action.payload.edge.from
        const aTgt = action.payload.edge.target || action.payload.edge.to
        const exists = state.data.edges.some(e => {
          const eSrc = e.source || e.from
          const eTgt = e.target || e.to
          return (eSrc === aSrc && eTgt === aTgt) || (eSrc === aTgt && eTgt === aSrc)
        })
        if (!exists) {
          state.data.edges.push(action.payload.edge)
        }
      }
    },
    removeEdge(state, action: PayloadAction<string>) {
      saveHistory(state)
      if (state.data) {
        state.data.edges = state.data.edges.filter(e => e.id !== action.payload)
      }
    },
    updateNodeStyle(state, action: PayloadAction<{ id: string, type: import('../types/roadmap').NodeType }>) {
      saveHistory(state)
      if (state.data) {
        const node = state.data.nodes.find(n => n.id === action.payload.id)
        if (node) node.type = action.payload.type
      }
    },
    updateNodeLabel(state, action: PayloadAction<{ id: string, label: string }>) {
      saveHistory(state)
      if (state.data) {
        const node = state.data.nodes.find(n => n.id === action.payload.id)
        if (node) {
          node.label = action.payload.label
          node.title = action.payload.label
        }
      }
    },
    // --- Lane Management ---
    addLane(state, action: PayloadAction<{ lane: RoadmapLane }>) {
      saveHistory(state)
      if (state.data) state.data.lanes.push(action.payload.lane)
    },
    removeLane(state, action: PayloadAction<string>) {
      saveHistory(state)
      if (state.data) {
        state.data.lanes = state.data.lanes.filter(l => l.id !== action.payload)
        const nodesToRemove = state.data.nodes.filter(n => n.laneId === action.payload).map(n => n.id)
        state.data.nodes = state.data.nodes.filter(n => !nodesToRemove.includes(n.id))
        state.data.edges = state.data.edges.filter(e =>
          !nodesToRemove.includes(e.source || e.from || '') &&
          !nodesToRemove.includes(e.target || e.to || '')
        )
      }
    },
    updateLane(state, action: PayloadAction<{ id: string, title: string, personId?: string, department?: string }>) {
      saveHistory(state)
      if (state.data) {
        const lane = state.data.lanes.find(l => l.id === action.payload.id)
        if (lane) {
          lane.title = action.payload.title
          if (action.payload.personId !== undefined) lane.personId = action.payload.personId
          // @ts-ignore - Dynamically adding department if it doesn't exist on type
          if (action.payload.department !== undefined) lane.department = action.payload.department
        }
      }
    },
    // --- Node Full Details Management ---
    updateNodeInfo(state, action: PayloadAction<{
      id: string, label: string, description?: string,
      tCode?: string, manual?: string, output?: string,
      createPerson?: string, changePerson?: string
    }>) {
      saveHistory(state)
      if (state.data) {
        const node = state.data.nodes.find(n => n.id === action.payload.id)
        if (node) {
          node.label = action.payload.label
          node.title = action.payload.label
          node.description = action.payload.description

          // @ts-ignore - Adding extended details dynamically
          node.tCode = action.payload.tCode
          // @ts-ignore
          node.manual = action.payload.manual
          // @ts-ignore
          node.output = action.payload.output
          // @ts-ignore
          node.createPerson = action.payload.createPerson
          // @ts-ignore
          node.changePerson = action.payload.changePerson
        }
      }
    },
    undo(state) {
      if (state.past.length > 0 && state.data) {
        const previous = state.past.pop()
        state.future.push(JSON.parse(JSON.stringify(state.data)))
        state.data = previous!
      }
    },
    redo(state) {
      if (state.future.length > 0 && state.data) {
        const next = state.future.pop()
        state.past.push(JSON.parse(JSON.stringify(state.data)))
        state.data = next!
      }
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

export const {
  addNode, removeNode, updateNodeCoords, addEdge, removeEdge, updateNodeStyle, updateNodeLabel,
  undo, redo, addLane, removeLane, updateLane, updateNodeInfo
} = diagramSlice.actions

export const diagramReducer = diagramSlice.reducer