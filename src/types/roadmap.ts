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

export type NodeShape = 'rect' | 'decision' | 'arrow-right'
export type Anchor = 'left' | 'right' | 'top' | 'bottom' | 'center'

export type RoadmapNode = {
  id: string
  laneId: string
  /** Horizontal position within lane (column). */
  level: number
  /** Vertical position within lane (row). */
  order: number
  label: string
  shape: NodeShape
  workType: WorkType
  w: number
  h: number
  /**
   * Optional styling from API.
   * If omitted, the UI falls back to token-based colors derived from workType.
   */
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
  /**
   * Optional label rendered near the connector midpoint.
   * Can be null/undefined if there is no text between steps.
   */
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

