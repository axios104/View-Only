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
  order: number
  level: number
  label: string
  type: string // e.g. 'start', 'end', 'process-blue', 'decision', etc.
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