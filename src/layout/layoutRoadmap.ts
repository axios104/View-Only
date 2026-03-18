import type { RoadmapDiagram, RoadmapNode } from '../types/roadmap'

export type PositionedRoadmapNode = RoadmapNode & { x: number; y: number }

type LayoutOptions = {
  laneWidth: number
  headerH: number
  lanePadX?: number
  lanePadY?: number
  colGap?: number
  rowGap?: number
}

export function layoutRoadmapNodes(diagram: RoadmapDiagram, opts: LayoutOptions): PositionedRoadmapNode[] {
  const lanePadX = opts.lanePadX ?? 24
  const lanePadY = opts.lanePadY ?? 18
  // Tuned column / row gaps so nodes keep a clean visual order
  // without exploding the layout or drifting too far off-grid.
  const colGap = opts.colGap ?? 140
  const rowGap = opts.rowGap ?? 120

  const laneIndexById = new Map<string, number>()
  diagram.lanes.forEach((l, idx) => laneIndexById.set(l.id, idx))

  // Deterministic grid layout:
  // x = laneIndex * laneWidth + lanePadX + level * colGap
  // y = headerH + lanePadY + order * rowGap
  return diagram.nodes.map((n: RoadmapNode) => {
    const laneIdx = laneIndexById.get(n.laneId) ?? 0
    const x = laneIdx * opts.laneWidth + lanePadX + n.level * colGap
    const y = opts.headerH + lanePadY + n.order * rowGap
    return { ...n, x, y }
  })
}

