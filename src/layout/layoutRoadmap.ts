import type { RoadmapDiagram, RoadmapNode } from '../types/roadmap'

export type PositionedRoadmapNode = RoadmapNode & { x: number; y: number }

export type LayoutOptions = {
  laneWidth: number
  headerH: number
  rowGap?: number
}

export function layoutRoadmapNodes(diagram: RoadmapDiagram, opts: LayoutOptions): PositionedRoadmapNode[] {
  const rowGap = opts.rowGap ?? 120
  const lanePadX = 12
  const lanePadY = 12

  const laneIndexById = new Map<string, number>()
  diagram.lanes.forEach((l, idx) => laneIndexById.set(l.id, idx))

  return diagram.nodes.map((n: RoadmapNode) => {
    const laneIdx = laneIndexById.get(n.laneId) ?? 0
    
    // Strict bounds ensures a component never bleeds outside its single grid box
    const maxW = opts.laneWidth - lanePadX * 2
    const maxH = rowGap - lanePadY * 2
    
    let w = n.w
    let h = n.h
    
    if (w > maxW || h > maxH) {
      const ratio = Math.min(maxW / w, maxH / h)
      w = w * ratio
      h = h * ratio
    }

    // Grid cell boundaries
    const cellX = laneIdx * opts.laneWidth
    const cellY = opts.headerH + n.level * rowGap
    
    // Position centered natively
    let x = cellX + (opts.laneWidth - w) / 2
    
    // If order modifier is used, shift it but strictly clamp it inside the box
    if (n.order !== 0) {
      const offset = n.order * (w + 10)
      x += offset
      x = Math.max(cellX + lanePadX, Math.min(cellX + opts.laneWidth - w - lanePadX, x))
    }
    
    // Vertically center inside its level (row)
    const y = cellY + (rowGap - h) / 2

    return { ...n, x, y, w, h }
  })
}