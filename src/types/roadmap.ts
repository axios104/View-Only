export type WorkType = 'sap' | 'legacy' | 'manual' | 'neutral'

export type Lane = {
  id: string
  title: string
  personId: string | null
}

export type Person = {
  id: string
  name: string
  role: string
  email: string
  location: string
  team: string
}

export type NodeShape = 'rect' | 'decision' | 'arrow-right' | 'hexagon' | 'document' | 'rounded-rect'
export type Anchor = 'left' | 'right' | 'top' | 'bottom' | 'center'

export type RoadmapNode = {
  id: string
  laneId: string
  /** Horizontal position modifier within the same level (0 is center, -0.5 is left, etc.). */
  order: number
  /** Vertical grid placement (row). */
  level: number
  label: string
  shape: NodeShape
  workType: WorkType
  w: number
  h: number
  style?: {
    fill?: string
    text?: string
    border?: string
    connector?: string
  }
}

export type RoadmapEdge = {
  id: string
  from: string
  to: string
  fromAnchor?: Anchor
  toAnchor?: Anchor
  label?: string | null
}

export type RoadmapDiagram = {
  lanes: Lane[]
  people: Person[]
  nodes: RoadmapNode[]
  edges: RoadmapEdge[]
  canvas: {
    width: number
    height: number
  }
}