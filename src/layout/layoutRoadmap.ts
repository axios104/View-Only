import type { RoadmapDiagram, RoadmapNode, NodeShape } from '../types/roadmap'

export type NodeStyle = { fill: string; border: string; text: string; connector?: string }

export type PositionedRoadmapNode = RoadmapNode & { 
  x: number
  y: number
  w: number
  h: number
  shape: NodeShape
  style: NodeStyle 
}

export type LayoutOptions = {
  laneWidth: number
  headerH: number
  rowGap?: number
}

// Map the API 'type' directly to its visual footprint utilizing your original theme CSS variables
// Sizes have been significantly reduced to fit better within the grid cells
const NODE_TYPE_MAP: Record<string, { shape: NodeShape; w: number; h: number; style: NodeStyle }> = {
  'start': { 
    shape: 'rounded-rect', w: 100, h: 45, 
    style: { fill: 'var(--color-bg-neutral-node)', border: 'var(--color-border)', text: 'var(--color-text-primary)', connector: 'var(--color-bg-neutral-node)' } 
  },
  'end': { 
    shape: 'rounded-rect', w: 100, h: 45, 
    style: { fill: 'var(--color-bg-neutral-node)', border: 'var(--color-border)', text: 'var(--color-text-primary)', connector: 'var(--color-bg-neutral-node)' } 
  },
  // --- ADDED MAPPINGS FOR FLAT ADAPTER ---
  'terminator': { 
    shape: 'rounded-rect', w: 100, h: 45, 
    style: { fill: 'var(--color-bg-neutral-node)', border: 'var(--color-border)', text: 'var(--color-text-primary)', connector: 'var(--color-bg-neutral-node)' } 
  },
  'process': { 
    shape: 'rect', w: 100, h: 45, 
    style: { fill: 'var(--color-bg-sap-function)', border: 'var(--color-bg-sap-function)', text: 'var(--color-text-secondary)', connector: 'var(--color-bg-sap-function)' } 
  },
  'data': { 
    shape: 'hexagon', w: 120, h: 55, 
    style: { fill: 'var(--color-bg-neutral-node)', border: 'var(--color-border)', text: 'var(--color-text-primary)', connector: 'var(--color-bg-neutral-node)' } 
  },
  // ---------------------------------------
  'process-red': { 
    shape: 'rect', w: 100, h: 45, 
    style: { fill: 'var(--color-bg-manual-function)', border: 'var(--color-bg-manual-function)', text: 'var(--color-text-secondary)', connector: 'var(--color-bg-manual-function)' } 
  },
  'process-blue': { 
    shape: 'rect', w: 100, h: 45, 
    style: { fill: 'var(--color-bg-sap-function)', border: 'var(--color-bg-sap-function)', text: 'var(--color-text-secondary)', connector: 'var(--color-bg-sap-function)' } 
  },
  'process-purple': { 
    shape: 'rect', w: 100, h: 45, 
    style: { fill: 'var(--color-bg-legacy-function)', border: 'var(--color-bg-legacy-function)', text: 'var(--color-text-secondary)', connector: 'var(--color-bg-legacy-function)' } 
  },
  'document': { 
    shape: 'document', w: 90, h: 35, 
    style: { fill: 'var(--color-bg-neutral-node)', border: 'var(--color-border)', text: 'var(--color-text-primary)', connector: 'var(--color-bg-neutral-node)' } 
  },
  'decision': { 
    shape: 'decision', w: 110, h: 60, 
    style: { fill: 'var(--color-bg-neutral-node)', border: 'var(--color-border)', text: 'var(--color-text-primary)', connector: 'var(--color-bg-neutral-node)' } 
  },
  'substrate': { 
    shape: 'hexagon', w: 120, h: 55, 
    style: { fill: 'var(--color-bg-neutral-node)', border: 'var(--color-border)', text: 'var(--color-text-primary)', connector: 'var(--color-bg-neutral-node)' } 
  },
  'default': { 
    shape: 'rect', w: 100, h: 45, 
    style: { fill: 'var(--color-bg-neutral-node)', border: 'var(--color-border)', text: 'var(--color-text-primary)', connector: 'var(--color-bg-neutral-node)' } 
  },
}

export function layoutRoadmapNodes(diagram: RoadmapDiagram, opts: LayoutOptions): PositionedRoadmapNode[] {
  // Reduced rowGap for tighter vertical spacing
  const rowGap = opts.rowGap ?? 90
  const lanePadX = 8
  const lanePadY = 8

  const laneIndexById = new Map<string, number>()
  if (diagram.lanes) {
    diagram.lanes.forEach((l, idx) => laneIndexById.set(l.id, idx))
  }

  // Ensure diagram.nodes exists before mapping
  const nodesToLayout = diagram.nodes || []

  return nodesToLayout.map((n: RoadmapNode) => {
    const laneIdx = laneIndexById.get(n.laneId) ?? 0
    
    // 1. Fetch visual footprint based entirely on 'type'
    const visualConfig = NODE_TYPE_MAP[n.type] || NODE_TYPE_MAP['default']
    
    // Strict bounds ensures a component never bleeds outside its single grid box
    const maxW = opts.laneWidth - lanePadX * 2
    const maxH = rowGap - lanePadY * 2
    
    let w = visualConfig.w
    let h = visualConfig.h
    
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
    if (n.order !== 0 && n.order !== undefined) {
      const offset = n.order * (w + 10)
      x += offset
      x = Math.max(cellX + lanePadX, Math.min(cellX + opts.laneWidth - w - lanePadX, x))
    }
    
    // Vertically center inside its level (row)
    let y = cellY + (rowGap - h) / 2

    // If manual drag coordinates exist, override the calc while strictly clamping X to the lane
    if (n.posX !== undefined) {
      x = Math.max(cellX + lanePadX, Math.min(cellX + opts.laneWidth - w - lanePadX, n.posX))
    }
    if (n.posY !== undefined) {
      y = Math.max(opts.headerH + lanePadY, n.posY)
    }

    return { 
      ...n,
      label: (n as any).label ?? n.title,
      x,
      y,
      w,
      h,
      shape: visualConfig.shape,
      style: visualConfig.style,
    }
  })
}