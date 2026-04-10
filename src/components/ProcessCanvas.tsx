import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { Anchor, Person, RoadmapDiagram, Lane } from '../types/roadmap'
import { setTranslate, setScale, setSelectedEditEdgeId, setSelectedEditNodeIds, setSelectedEditNodeId } from '../store/canvasSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { updateNodeCoords, addEdge, removeEdge } from '../store/diagramSlice'
import { layoutRoadmapNodes, type PositionedRoadmapNode } from '../layout/layoutRoadmap'
import { User } from 'lucide-react'

type ProcessCanvasProps = {
  diagram: RoadmapDiagram
  className?: string
  onPersonClick?: (person: Person) => void
  onNodeClick?: (node: PositionedRoadmapNode) => void
  onLaneClick?: (lane: Lane) => void
  onBackgroundClick?: (x: number, y: number) => void
  onDropNode?: (type: string, worldX: number, worldY: number) => void
}

export type ProcessCanvasApi = {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  fit: () => void
}

function anchorPoint(n: PositionedRoadmapNode, a: Anchor): { x: number; y: number } {
  switch (a) {
    case 'left': return { x: n.x, y: n.y + n.h / 2 }
    case 'right': return { x: n.x + n.w, y: n.y + n.h / 2 }
    case 'top': return { x: n.x + n.w / 2, y: n.y }
    case 'bottom': return { x: n.x + n.w / 2, y: n.y + n.h }
    case 'center':
    default: return { x: n.x + n.w / 2, y: n.y + n.h / 2 }
  }
}

// ---------------------------------------------------------
// RESTORED ORIGINAL SHAPES & COLORS
// ---------------------------------------------------------
function getMappedNodeStyle(n: PositionedRoadmapNode) {
  let shape = 'rounded-rect'
  let fill = '#ffffff'
  let border = '#cbd5e1'

  const type = String(n.type || '').toLowerCase()
  const status = String((n as any).status || '').toLowerCase()

  if (type === 'process' || !type) {
    if (status === 'sap' || status === 'completed') {
      fill = '#DBEAFE'; border = '#1E40AF'; shape = 'rounded-rect';       // SAP Function — Blue
    } else if (status === 'legacy' || status === 'in-progress') {
      fill = '#F3E5F5'; border = '#7B1FA2'; shape = 'rounded-rect';       // Legacy Function — Purple
    } else if (status === 'manual' || status === 'planned') {
      fill = '#FFCDD2'; border = '#C62828'; shape = 'rounded-rect';       // Manual Function — Red
    } else {
      fill = '#E0E0E0'; border = '#616161'; shape = 'rounded-rect';       // Technical Term — Gray
    }
  }
  else if (type === 'decision') {
    fill = '#FFF9C4'; border = '#F9A825'; shape = 'decision';             // Decision — Yellow diamond
  }
  else if (type === 'terminator') {
    fill = '#E0F2F1'; border = '#00695C'; shape = 'hexagon';              // Start/End — Hexagon
  }
  else if (type === 'document') {
    fill = '#F1F5F9'; border = '#475569'; shape = 'document';
  }
  else if (type === 'data' || type === 'database') {
    fill = '#C8E6C9'; border = '#2E7D32'; shape = 'input';               // Input — rect + hexagon (2 Hex)
  }

  return { shape, fill, border }
}

// ---------------------------------------------------------
// RESTORED CUSTOM SVG GENERATOR
// ---------------------------------------------------------
function NodeBg({ shape, fill, border }: { shape: string, fill: string, border: string }) {
  const dropShadow = 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))'

  if (shape === 'decision') {
    return (
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: dropShadow }}>
        <polygon points="50,2 98,50 50,98 2,50" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    )
  }
  if (shape === 'hexagon') {
    return (
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: dropShadow }}>
        <polygon points="15,2 85,2 98,50 85,98 15,98 2,50" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    )
  }
  if (shape === 'parallelogram') {
    return (
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: dropShadow }}>
        <polygon points="15,2 98,2 85,98 2,98" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    )
  }
  if (shape === 'trapezoid') {
    return (
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: dropShadow }}>
        <polygon points="10,2 90,2 98,98 2,98" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    )
  }
  if (shape === 'capsule') {
    return (
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: dropShadow }}>
        <rect x="2" y="2" width="96" height="96" rx="48" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    )
  }
  if (shape === 'document') {
    return (
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: dropShadow }}>
        <polygon points="15,2 70,2 85,17 85,98 15,98" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <polyline points="70,2 70,17 85,17" fill="none" stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    )
  }
  if (shape === 'database') {
    return (
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: dropShadow }}>
        <path d="M 10,20 A 40,12 0 0,0 90,20 L 90,80 A 40,12 0 0,1 10,80 Z" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <ellipse cx="50" cy="20" rx="40" ry="12" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    )
  }
  if (shape === 'input') {
    // "2 Hex" — Full hexagon behind, rounded rect overlapping from the left
    return (
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: dropShadow }}>
        <polygon points="18,2 82,2 98,50 82,98 18,98 2,50" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <rect x="2" y="6" width="72" height="88" rx="8" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    )
  }

  // Default Rounded Rect
  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: dropShadow }}>
      <rect x="2" y="2" width="96" height="96" rx="8" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

function Node({ n, onClick, onPointerDown, onAnchorDown, onMouseEnter, onMouseLeave }: {
  n: PositionedRoadmapNode,
  onClick?: (n: PositionedRoadmapNode) => void,
  onPointerDown?: (e: React.PointerEvent, n: PositionedRoadmapNode) => void,
  onAnchorDown?: (e: React.PointerEvent, n: PositionedRoadmapNode, a: Anchor) => void,
  onMouseEnter?: (n: PositionedRoadmapNode) => void,
  onMouseLeave?: (n: PositionedRoadmapNode) => void,
}) {
  const { selectedEditNodeIds, mode, handMode } = useAppSelector((s) => s.canvas)
  const isSelected = mode === 'edit' && selectedEditNodeIds?.includes(n.id)

  const { shape, fill, border } = getMappedNodeStyle(n)

  const base = 'absolute grid select-none place-items-center text-center text-[11px] leading-snug transition duration-200 z-10'

  return (
    <div
      className={base + (mode === 'edit' ? ' cursor-move hover:brightness-110' : ' cursor-pointer hover:scale-105 hover:brightness-110')}
      data-node-id={n.id}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (!handMode) {
          e.stopPropagation()
          onClick?.(n)
        }
      }}
      onPointerDown={(e) => onPointerDown?.(e, n)}
      onMouseEnter={() => onMouseEnter?.(n)}
      onMouseLeave={() => onMouseLeave?.(n)}
      style={{
        left: n.x,
        top: n.y,
        width: n.w,
        height: n.h,
        color: '#1e293b',
        fontWeight: 700,
        outline: 'none',
        borderRadius: 'inherit'
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ borderRadius: 'inherit' }}>
        <NodeBg shape={shape} fill={fill} border={border} />
      </div>
      <div className="relative z-10 flex h-full w-full items-center justify-center p-3 text-center overflow-hidden pointer-events-none">
        <div>
          {(n.label || n.title || '').split('\n').map((line: string, idx: number) => (
            <div key={idx} className="break-words">{line}</div>
          ))}
        </div>
      </div>

      {isSelected && (
        <>
          <AnchorHandle pos="top" onClick={(e) => onAnchorDown?.(e, n, 'top')} />
          <AnchorHandle pos="right" onClick={(e) => onAnchorDown?.(e, n, 'right')} />
          <AnchorHandle pos="bottom" onClick={(e) => onAnchorDown?.(e, n, 'bottom')} />
          <AnchorHandle pos="left" onClick={(e) => onAnchorDown?.(e, n, 'left')} />
        </>
      )}
    </div>
  )
}

function AnchorHandle({ pos, onClick }: { pos: Anchor, onClick: (e: React.PointerEvent) => void }) {
  const getStyle = () => {
    switch (pos) {
      case 'top': return { top: -5, left: '50%', transform: 'translateX(-50%)' }
      case 'bottom': return { bottom: -5, left: '50%', transform: 'translateX(-50%)' }
      case 'left': return { left: -5, top: '50%', transform: 'translateY(-50%)' }
      case 'right': return { right: -5, top: '50%', transform: 'translateY(-50%)' }
      default: return {}
    }
  }
  return (
    <div
      className="absolute w-3 h-3 bg-[var(--color-primary)] border-[1.5px] border-white rounded-full z-20 cursor-crosshair hover:scale-125 transition-transform"
      style={getStyle()}
      onPointerDown={(e) => { e.stopPropagation(); onClick(e); }}
    />
  )
}

export const ProcessCanvas = forwardRef<ProcessCanvasApi, ProcessCanvasProps>(function ProcessCanvas(
  { diagram, className, onPersonClick, onNodeClick, onLaneClick, onBackgroundClick, onDropNode },
  ref,
) {
  const safeDiagram = useMemo(() => ({
    ...diagram,
    lanes: diagram?.lanes || [],
    people: diagram?.people || [],
    edges: diagram?.edges || [],
    nodes: diagram?.nodes || [],
    canvas: diagram?.canvas || { width: 2000, height: 1000 }
  }), [diagram])

  const dispatch = useAppDispatch()
  const { scale, tx, ty, handMode, magnifierMode, pendingAddType, mode, selectedEditNodeIds, selectedEditEdgeId } = useAppSelector((s) => s.canvas)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const transformLayerRef = useRef<HTMLDivElement | null>(null)
  const [containerW, setContainerW] = useState(1200)

  const [dragging, setDragging] = useState(false)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const clickCandidateRef = useRef<{ personId: string | null; nodeId: string | null; laneId: string | null; x: number; y: number; moved: boolean }>({ personId: null, nodeId: null, laneId: null, x: 0, y: 0, moved: false })

  const [draggedNodes, setDraggedNodes] = useState<Record<string, { x: number, y: number, laneId?: string }>>({})
  const [marqueeBox, setMarqueeBox] = useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null)
  const isDraggingMarqueeRef = useRef(false)
  const isDraggingNodeRef = useRef(false)

  type DrawingEdge = { sourceId: string; sourceAnchor: Anchor; x: number; y: number }
  const [drawingEdge, setDrawingEdge] = useState<DrawingEdge | null>(null)
  const hoveredNodeRef = useRef<string | null>(null)

  const peopleById = useMemo(() => {
    const m = new Map<string, Person>()
    safeDiagram.people.forEach((p) => m.set(p.id, p))
    return m
  }, [safeDiagram.people])

  const lanesById = useMemo(() => {
    const m = new Map<string, Lane>()
    safeDiagram.lanes.forEach((l) => m.set(l.id, l))
    return m
  }, [safeDiagram.lanes])

  // Dynamic lane width — proportional to node count per lane
  const laneWidths = useMemo(() => {
    const lanes = safeDiagram.lanes
    if (lanes.length === 0) return [] as number[]
    const MIN_LANE_W = 180
    const nodeCountPerLane = new Map<string, number>()
    lanes.forEach(l => nodeCountPerLane.set(l.id, 0))
    safeDiagram.nodes.forEach(n => {
      nodeCountPerLane.set(n.laneId, (nodeCountPerLane.get(n.laneId) ?? 0) + 1)
    })
    // Each lane gets at least weight=1 so empty lanes still show
    const weights = lanes.map(l => Math.max(1, nodeCountPerLane.get(l.id) ?? 0))
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    // Distribute available width proportionally, with minimum
    const rawWidths = weights.map(w => Math.max(MIN_LANE_W, (w / totalWeight) * containerW))
    const totalRaw = rawWidths.reduce((a, b) => a + b, 0)
    // Scale to fill exactly containerW
    const scaleFactor = containerW / totalRaw
    return rawWidths.map(w => w * scaleFactor)
  }, [safeDiagram.lanes, safeDiagram.nodes, containerW])

  const laneOffsets = useMemo(() => {
    const offsets: number[] = []
    let acc = 0
    for (const w of laneWidths) { offsets.push(acc); acc += w }
    return offsets
  }, [laneWidths])

  const laneWidth = laneWidths.length > 0
    ? laneWidths.reduce((a, b) => a + b, 0) / laneWidths.length
    : containerW;
  const computedCanvasWidth = laneWidths.length > 0
    ? laneWidths.reduce((a, b) => a + b, 0)
    : containerW;

  const headerH = 110;
  const rowGap = 90;

  const positionedNodes = useMemo(() => {
    return layoutRoadmapNodes(safeDiagram, { laneWidth, headerH, rowGap, laneWidths, laneOffsets })
  }, [safeDiagram, laneWidth, laneWidths, laneOffsets])

  const maxLevel = positionedNodes.reduce((acc, n) => Math.max(acc, n.level), 0)
  const contentHeight = headerH + (maxLevel + 1) * rowGap
  const docHeight = Math.max(safeDiagram.canvas.height, contentHeight + 50)

  const nodesById = useMemo(() => {
    const m = new Map<string, PositionedRoadmapNode>()
    for (const n of positionedNodes) m.set(n.id, n)
    return m
  }, [positionedNodes])

  const edges = useMemo(() => {
    const edgesList = safeDiagram.edges.map((e) => {
      const fromN = nodesById.get(e.from || e.source)
      const toN = nodesById.get(e.to || e.target)
      if (!fromN || !toN) return null

      // Smart anchor selection based on relative position
      let fromA: Anchor = e.fromAnchor ?? 'right'
      let toA: Anchor = e.toAnchor ?? 'left'

      if (!e.fromAnchor && !e.toAnchor) {
        const fromCx = fromN.x + fromN.w / 2
        const fromCy = fromN.y + fromN.h / 2
        const toCx = toN.x + toN.w / 2
        const toCy = toN.y + toN.h / 2
        const dx = toCx - fromCx
        const dy = toCy - fromCy

        // Same lane (small horizontal distance) → vertical connection
        if (Math.abs(dx) < laneWidth * 0.4) {
          if (dy > 0) { fromA = 'bottom'; toA = 'top'; }
          else { fromA = 'top'; toA = 'bottom'; }
        }
        // Target is clearly to the right
        else if (dx > 0) {
          // If also significantly below, use bottom→top for a cleaner path
          if (dy > fromN.h * 1.5) { fromA = 'bottom'; toA = 'left'; }
          else { fromA = 'right'; toA = 'left'; }
        }
        // Target is clearly to the left
        else {
          if (dy > fromN.h * 1.5) { fromA = 'bottom'; toA = 'right'; }
          else { fromA = 'left'; toA = 'right'; }
        }
      }

      const from = anchorPoint(fromN, fromA)
      const to = anchorPoint(toN, toA)
      const connector = 'var(--color-bg-sap-function)'
      return { id: e.id, from, to, connector, label: e.label ?? null, source: e.from || e.source, target: e.to || e.target, fromAnchor: fromA, toAnchor: toA }
    }).filter(Boolean) as any[]

    const edgesByPair = new Map<string, any[]>()
    edgesList.forEach(edge => {
      const key1 = `${edge.source}->${edge.target}`
      const key = edgesByPair.has(key1) ? key1 : key1
      if (!edgesByPair.has(key)) edgesByPair.set(key, [])
      edgesByPair.get(key)!.push(edge)
    })

    const offsetEdges = edgesList.map(edge => {
      const key = `${edge.source}->${edge.target}`
      const parallelEdges = edgesByPair.get(key) || []
      const index = parallelEdges.indexOf(edge)
      const offset = index > 0 ? (index - (parallelEdges.length - 1) / 2) * 12 : 0
      return { ...edge, offset }
    })

    return offsetEdges
  }, [safeDiagram.edges, nodesById])

  const renderNodes = useMemo(() => {
    return positionedNodes.map(n => {
      if (draggedNodes[n.id]) {
        return { ...n, x: draggedNodes[n.id].x, y: draggedNodes[n.id].y } as PositionedRoadmapNode
      }
      return n
    })
  }, [positionedNodes, draggedNodes])

  const handleNodePointerDown = (e: React.PointerEvent, n: PositionedRoadmapNode) => {
    if (mode !== 'edit' || handMode) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)

    const startPos = { x: e.clientX, y: e.clientY }
    isDraggingNodeRef.current = false

    let currentSelection = selectedEditNodeIds || []
    if (!currentSelection.includes(n.id)) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) currentSelection = [...currentSelection, n.id]
      else currentSelection = [n.id]
      dispatch(setSelectedEditNodeIds(currentSelection))
    }

    const el = transformLayerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const worldX = px / scale
    const worldY = py / scale

    const initialDrag: Record<string, {x: number, y: number, offsetX: number, offsetY: number}> = {}
    currentSelection.forEach(id => {
      const node = nodesById.get(id)
      if (node) {
        initialDrag[id] = { x: node.x, y: node.y, offsetX: worldX - node.x, offsetY: worldY - node.y }
      }
    })
    setDraggedNodes(initialDrag)

    const onMove = (ev: PointerEvent) => {
      const ex = ev.clientX - rect.left
      const ey = ev.clientY - rect.top
      const currentWorldX = ex / scale
      const currentWorldY = ey / scale

      if (Math.abs(ev.clientX - startPos.x) > 3 || Math.abs(ev.clientY - startPos.y) > 3) {
        isDraggingNodeRef.current = true
      }

      setDraggedNodes(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(id => {
          const init = initialDrag[id]
          if (!init) return
          const node = nodesById.get(id)
          if (!node) return

          const nx = currentWorldX - init.offsetX
          const ny = currentWorldY - init.offsetY
          
          const nodeWorldX = nx + node.w / 2
          let specificLaneIdx = 0;
          for (let i = 0; i < laneOffsets.length; i++) {
            if (nodeWorldX >= laneOffsets[i]) specificLaneIdx = i; else break;
          }
          specificLaneIdx = Math.max(0, Math.min(safeDiagram.lanes.length - 1, specificLaneIdx))

          const hoveredLaneId = safeDiagram.lanes[specificLaneIdx]?.id
          const thisLaneWidth = laneWidths[specificLaneIdx] ?? laneWidth;
          const thisLaneOffset = laneOffsets[specificLaneIdx] ?? (specificLaneIdx * laneWidth);

          const laneMinX = thisLaneOffset + 8
          const laneMaxX = laneMinX + thisLaneWidth - node.w - 16

          const clampedX = Math.max(laneMinX, Math.min(laneMaxX, nx))
          next[id] = { ...next[id], x: clampedX, y: ny, laneId: hoveredLaneId }
        })
        return next
      })
    }

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setDraggedNodes(prev => {
        Object.entries(prev).forEach(([id, pos]) => {
          dispatch(updateNodeCoords({ id, posX: pos.x, posY: pos.y, laneId: pos.laneId }))
        })
        return {}
      })
      try { (ev.target as Element).releasePointerCapture(ev.pointerId) } catch { }
      setTimeout(() => { isDraggingNodeRef.current = false }, 50)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const handleAnchorDown = (e: React.PointerEvent, n: PositionedRoadmapNode, a: Anchor) => {
    if (mode !== 'edit') return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)

    const el = transformLayerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    const startPt = anchorPoint(n, a)
    setDrawingEdge({ sourceId: n.id, sourceAnchor: a, x: startPt.x, y: startPt.y })

    const onMove = (ev: PointerEvent) => {
      const ex = ev.clientX - rect.left
      const ey = ev.clientY - rect.top
      const worldX = ex / scale
      const worldY = ey / scale

      setDrawingEdge(prev => prev ? { ...prev, x: worldX, y: worldY } : null)

      const hovered = positionedNodes.find(pn => worldX >= pn.x && worldX <= pn.x + pn.w && worldY >= pn.y && worldY <= pn.y + pn.h)
      hoveredNodeRef.current = hovered ? hovered.id : null
    }

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)

      setDrawingEdge(prev => {
        if (prev && hoveredNodeRef.current && hoveredNodeRef.current !== prev.sourceId) {
          const edgeId = `edge-${Date.now()}`
          dispatch(addEdge({ edge: { id: edgeId, source: prev.sourceId, target: hoveredNodeRef.current, fromAnchor: prev.sourceAnchor, toAnchor: 'top' } }))
        }
        return null
      })
      try { (ev.target as Element).releasePointerCapture(ev.pointerId) } catch { }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const zoomAround = (nextScale: number, clientX: number, clientY: number) => {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top

    const worldX = (el.scrollLeft + px) / scaleRef.current
    const worldY = (el.scrollTop + py) / scaleRef.current

    const clampedScale = Math.max(0.05, Math.min(4.0, nextScale))
    dispatch(setScale(clampedScale))

    requestAnimationFrame(() => {
      el.scrollLeft = worldX * clampedScale - px
      el.scrollTop = worldY * clampedScale - py
    })
  }

  const fit = () => {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    const contentW = Math.max(1, computedCanvasWidth)
    const contentH = Math.max(1, docHeight)
    const padding = 50
    const targetScaleW = (rect.width - padding * 2) / contentW
    const targetScaleH = (rect.height - padding * 2) / contentH
    const targetScale = Math.max(0.05, Math.min(2.5, Math.min(targetScaleW, targetScaleH)))

    dispatch(setScale(targetScale))
    requestAnimationFrame(() => {
      el.scrollLeft = (contentW * targetScale - rect.width) / 2
      el.scrollTop = 0
    })
  }

  const resetToLeft = () => {
    const el = viewportRef.current
    if (!el) return
    dispatch(setScale(0.9775))
    requestAnimationFrame(() => {
      el.scrollLeft = 0
      el.scrollTop = 0
    })
  }

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const rect = viewportRef.current?.getBoundingClientRect()
      if (rect) zoomAround(scaleRef.current * 1.15, rect.left + rect.width / 2, rect.top + rect.height / 2)
    },
    zoomOut: () => {
      const rect = viewportRef.current?.getBoundingClientRect()
      if (rect) zoomAround(scaleRef.current * 0.85, rect.left + rect.width / 2, rect.top + rect.height / 2)
    },
    reset: resetToLeft,
    fit,
  }), [dispatch, scale, docHeight, computedCanvasWidth])

  const handModeRef = useRef(handMode)
  useEffect(() => { handModeRef.current = handMode }, [handMode])

  // Non-passive wheel zoom at cursor position
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (!handModeRef.current && !e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const s = scaleRef.current
      const nextScale = s * (e.deltaY > 0 ? 0.92 : 1.08)
      const clamped = Math.max(0.05, Math.min(4.0, nextScale))
      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const worldX = (el.scrollLeft + px) / s
      const worldY = (el.scrollTop + py) / s
      dispatch(setScale(clamped))
      scaleRef.current = clamped
      requestAnimationFrame(() => {
        el.scrollLeft = worldX * clamped - px
        el.scrollTop = worldY * clamped - py
      })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [dispatch])

  // Viewport size observer for dynamic lane width
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const update = () => setContainerW(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className={['relative h-full w-full overflow-hidden', className ?? ''].join(' ')}>
      <div
        ref={viewportRef}
        className={['absolute inset-0 overflow-auto bg-[var(--color-bg-body)]',
          pendingAddType ? 'cursor-crosshair' : (magnifierMode ? 'cursor-zoom-in' : (handMode ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'))].join(' ')}
        style={{ touchAction: 'none' }}
        onScroll={() => {
          const el = viewportRef.current
          if (el) {
            dispatch(setTranslate({ tx: -el.scrollLeft, ty: -el.scrollTop }))
          }
        }}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('[data-node-id]') || target.closest('[data-lane-id]') || target.closest('[data-person-id]')) return
          fit()
        }}
        onPointerDown={(e) => {
          if (magnifierMode) {
            zoomAround(scale * 1.5, e.clientX, e.clientY)
            return
          }

          const isMiddle = e.button === 1
          if (!handMode && !isMiddle && mode !== 'edit') return

          if (!handMode && mode === 'edit') {
            const vp = viewportRef.current
            if (!vp) return
            const rect = vp.getBoundingClientRect()
            const startX = (e.clientX - rect.left + vp.scrollLeft) / scale
            const startY = (e.clientY - rect.top + vp.scrollTop) / scale
            
            setMarqueeBox({ startX, startY, endX: startX, endY: startY })
            isDraggingMarqueeRef.current = false
            e.currentTarget.setPointerCapture(e.pointerId)
            
            const onMarqueeMove = (ev: PointerEvent) => {
              isDraggingMarqueeRef.current = true
              const currentX = (ev.clientX - rect.left + vp.scrollLeft) / scale
              const currentY = (ev.clientY - rect.top + vp.scrollTop) / scale
              setMarqueeBox(prev => prev ? { ...prev, endX: currentX, endY: currentY } : null)
            }
            
            const onMarqueeUp = (ev: PointerEvent) => {
              window.removeEventListener('pointermove', onMarqueeMove)
              window.removeEventListener('pointerup', onMarqueeUp)
              setMarqueeBox(prev => {
                if (prev) {
                  const minX = Math.min(prev.startX, prev.endX)
                  const maxX = Math.max(prev.startX, prev.endX)
                  const minY = Math.min(prev.startY, prev.endY)
                  const maxY = Math.max(prev.startY, prev.endY)
                  
                  if (Math.abs(maxX - minX) > 5 || Math.abs(maxY - minY) > 5) {
                    const intersected = positionedNodes.filter(n => {
                       return !(n.x > maxX || n.x + n.w < minX || n.y > maxY || n.y + n.h < minY)
                    })
                    dispatch(setSelectedEditNodeIds(intersected.map(n => n.id)))
                  }
                }
                return null
              })
              try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { }
              setTimeout(() => { isDraggingMarqueeRef.current = false }, 50)
            }
            
            window.addEventListener('pointermove', onMarqueeMove)
            window.addEventListener('pointerup', onMarqueeUp)
            return
          }

          lastPointerRef.current = { x: e.clientX, y: e.clientY }
          setDragging(true)
          e.currentTarget.setPointerCapture(e.pointerId)

          const el = e.target instanceof Element ? e.target : null
          clickCandidateRef.current = {
            personId: el?.closest('[data-person-id]')?.getAttribute('data-person-id') ?? null,
            nodeId: el?.closest('[data-node-id]')?.getAttribute('data-node-id') ?? null,
            laneId: el?.closest('[data-lane-id]')?.getAttribute('data-lane-id') ?? null,
            x: e.clientX, y: e.clientY, moved: false
          }

          const onMove = (ev: PointerEvent) => {
            const dx = ev.clientX - lastPointerRef.current!.x
            const dy = ev.clientY - lastPointerRef.current!.y
            lastPointerRef.current = { x: ev.clientX, y: ev.clientY }

            if (!clickCandidateRef.current.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
              clickCandidateRef.current.moved = true
            }

            const vp = viewportRef.current
            if (vp) {
              vp.scrollLeft -= dx
              vp.scrollTop -= dy
            }
          }

          const onUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            setDragging(false)

            try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { }

            if (ev.type === 'pointerup' && !clickCandidateRef.current.moved) {
              const { personId, nodeId, laneId, x, y } = clickCandidateRef.current
              if (nodeId) onNodeClick?.(nodesById.get(nodeId)!)
              else if (personId) onPersonClick?.(peopleById.get(personId)!)
              else if (laneId) onLaneClick?.(lanesById.get(laneId)!)
              else {
                const el = viewportRef.current
                if (el) {
                  const rect = el.getBoundingClientRect()
                  const px = x - rect.left
                  const py = y - rect.top
                  const worldX = (el.scrollLeft + px) / scale
                  const worldY = (el.scrollTop + py) / scale
                  onBackgroundClick?.(worldX, worldY)
                }
              }
            }
          }

          window.addEventListener('pointermove', onMove)
          window.addEventListener('pointerup', onUp)
        }}
      >
        <div className="sticky inset-0 w-full h-0 pointer-events-none z-0">
          <div className="absolute inset-0 pointer-events-none"
            style={{
              width: '100vw', height: '100vh',
              backgroundImage: `
              radial-gradient(circle, rgba(100, 116, 139, 0.5) 1.5px, transparent 1.5px),
              radial-gradient(circle at 20px 20px, rgba(100, 116, 139, 0.5) 1.5px, transparent 1.5px)
            `,
              backgroundSize: `40px 40px`,
              backgroundPosition: `0 0, 20px 20px`,
            }}
          />
        </div>
        <div
          style={{ width: computedCanvasWidth * scale, height: docHeight * scale, position: 'relative', flexShrink: 0 }}
        >
          <div
            ref={transformLayerRef}
            onClick={(e) => {
              if (handMode || isDraggingMarqueeRef.current) return;
              if ((e.target as HTMLElement).closest('[data-node-id]')) return;

              const rect = transformLayerRef.current?.getBoundingClientRect();
              if (!rect) return;
              const px = e.clientX - rect.left;
              const py = e.clientY - rect.top;
              const worldX = px / scale;
              const worldY = py / scale;
              
              const laneEl = (e.target as HTMLElement).closest('[data-lane-id]');
              if (laneEl) {
                const laneId = laneEl.getAttribute('data-lane-id');
                if (laneId && (!selectedEditNodeIds || selectedEditNodeIds.length === 0) && !selectedEditEdgeId) {
                  onLaneClick?.(lanesById.get(laneId)!);
                  return;
                }
              }

              onBackgroundClick?.(worldX, worldY);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const type = e.dataTransfer.getData('application/node-type');
              if (type && onDropNode) {
                const rect = transformLayerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const px = e.clientX - rect.left;
                const py = e.clientY - rect.top;
                const worldX = px / scale;
                const worldY = py / scale;
                onDropNode(type, worldX, worldY);
              }
            }}
            style={{ transform: `scale(${scale})`, transformOrigin: '0 0', width: computedCanvasWidth, height: docHeight, position: 'absolute', left: 0, top: 0 }}
          >
            {/* Darker lane lines that go to the bottom of the document */}
            {safeDiagram.lanes.map((lane, idx) => (
              <div key={`v-grid-${lane.id}`} className="pointer-events-none absolute top-0 z-0" style={{ left: laneOffsets[idx] ?? (idx * laneWidth), width: '2px', height: '100%', backgroundColor: '#64748b', opacity: 0.8 }} />
            ))}
            <div className="pointer-events-none absolute top-0 z-0" style={{ left: computedCanvasWidth, width: '2px', height: '100%', backgroundColor: '#64748b', opacity: 0.8 }} />

            <div className="absolute left-0 top-0 z-20" style={{ width: computedCanvasWidth, height: headerH }}>
              {safeDiagram.lanes.map((lane, idx) => {
                const person = lane.personId ? peopleById.get(lane.personId) : undefined
                const thisW = laneWidths[idx] ?? laneWidth
                const thisX = laneOffsets[idx] ?? (idx * laneWidth)
                return (
                  <div key={lane.id} data-person-id={person?.id ?? undefined} data-lane-id={lane.id}
                    onClick={() => !handMode && onLaneClick?.(lane)}
                    className="absolute top-0 flex flex-col items-center justify-center bg-white px-2 py-2 text-center cursor-pointer hover:bg-slate-50 transition-all duration-200 border-b border-slate-200 z-20"
                    style={{ left: thisX, width: thisW, height: headerH, borderRight: '1px solid #cbd5e1' }}
                  >
                    <div className="text-[11px] font-semibold text-slate-600 tracking-wide mb-1.5">
                      Carries out & Supports by
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-400 bg-white mb-1.5 text-blue-500">
                      <User size={20} strokeWidth={2} />
                    </div>
                    <div className="text-sm font-bold text-teal-700">
                      {person?.name ?? lane.title ?? '—'}
                    </div>
                  </div>
                )
              })}
            </div>

            <svg className="pointer-events-none absolute inset-0 z-0" width={computedCanvasWidth} height={docHeight}>
              {drawingEdge && (() => {
                const srcNode = nodesById.get(drawingEdge.sourceId)
                if (!srcNode) return null
                const draggedSrc = draggedNodes[srcNode.id]
                const pt = anchorPoint({ ...srcNode, x: draggedSrc ? draggedSrc.x : srcNode.x, y: draggedSrc ? draggedSrc.y : srcNode.y }, drawingEdge.sourceAnchor)
                return (
                  <path d={`M ${pt.x} ${pt.y} L ${drawingEdge.x} ${drawingEdge.y}`} stroke="var(--color-primary)" strokeWidth={3} fill="none" strokeDasharray="5,5" />
                )
              })()}
              {edges.map((e) => {
                const draggedSrc = draggedNodes[e.source]
                const draggedTgt = draggedNodes[e.target]
                const sN = nodesById.get(e.source)
                const tN = nodesById.get(e.target)
                if (!sN || !tN) return null

                const fromNode = draggedSrc ? { ...sN, x: draggedSrc.x, y: draggedSrc.y } : sN
                const toNode = draggedTgt ? { ...tN, x: draggedTgt.x, y: draggedTgt.y } : tN

                const fromPt = anchorPoint(fromNode, e.fromAnchor ?? 'right')
                const toPt = anchorPoint(toNode, e.toAnchor ?? 'left')

                const isSelectedEdge = selectedEditEdgeId === e.id
                const strokeColor = isSelectedEdge ? 'var(--color-primary)' : e.connector
                const offset = (e.offset || 0)

                // Build path based on connection direction
                let pathD: string
                let labelX: number
                let labelY: number

                const fromDir = (e.fromAnchor === 'top' || e.fromAnchor === 'bottom') ? 'V' : 'H'
                const toDir = (e.toAnchor === 'top' || e.toAnchor === 'bottom') ? 'V' : 'H'

                if (fromDir === 'V' && toDir === 'V') {
                  // Straight vertical (with optional horizontal offset for parallel edges)
                  const midY = (fromPt.y + toPt.y) / 2 + offset
                  pathD = `M ${fromPt.x} ${fromPt.y} L ${fromPt.x} ${midY} L ${toPt.x} ${midY} L ${toPt.x} ${toPt.y}`
                  labelX = Math.max(fromPt.x, toPt.x) + 10
                  labelY = midY - 5
                } else if (fromDir === 'V' && toDir === 'H') {
                  // L-shaped: go vertical first, then horizontal
                  pathD = `M ${fromPt.x} ${fromPt.y} L ${fromPt.x} ${toPt.y} L ${toPt.x} ${toPt.y}`
                  labelX = (fromPt.x + toPt.x) / 2
                  labelY = toPt.y - 10
                } else if (fromDir === 'H' && toDir === 'V') {
                  // L-shaped: go horizontal first, then vertical
                  pathD = `M ${fromPt.x} ${fromPt.y} L ${toPt.x} ${fromPt.y} L ${toPt.x} ${toPt.y}`
                  labelX = (fromPt.x + toPt.x) / 2
                  labelY = fromPt.y - 10
                } else {
                  // Standard horizontal→vertical→horizontal (stepped)
                  const midX = (fromPt.x + toPt.x) / 2 + offset
                  pathD = `M ${fromPt.x} ${fromPt.y} L ${midX} ${fromPt.y} L ${midX} ${toPt.y} L ${toPt.x} ${toPt.y}`
                  const isGoingRight = toPt.x >= fromPt.x
                  labelX = isGoingRight ? midX + 8 : midX - 8
                  labelY = (fromPt.y + toPt.y) / 2 - 8
                }

                return (
                  <g key={e.id}
                    className={mode === 'edit' ? 'cursor-pointer hover:opacity-80' : ''}
                    style={{ pointerEvents: 'all' }}
                    onClick={(ev) => {
                      if (mode === 'edit') {
                        ev.stopPropagation()
                        dispatch(setSelectedEditEdgeId(e.id))
                      }
                    }}
                  >
                    <defs>
                      <marker id={`arrowhead-${e.id}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                        <polygon points="0 0, 10 3, 0 6" fill={strokeColor} />
                      </marker>
                    </defs>

                    <path d={pathD}
                      stroke="transparent" strokeWidth={15} fill="none" />

                    <path d={pathD}
                      stroke={strokeColor} strokeWidth={isSelectedEdge ? 3 : 2} fill="none" strokeOpacity={0.85} strokeLinecap="round" strokeLinejoin="round" markerEnd={`url(#arrowhead-${e.id})`} />
                    <circle cx={fromPt.x} cy={fromPt.y} r={3.5} fill={strokeColor} opacity={0.9} />
                    <circle cx={toPt.x} cy={toPt.y} r={3.5} fill={strokeColor} opacity={0.9} />
                    {e.label && (
                      <text x={labelX} y={labelY} textAnchor="start" fontSize={11} fill="var(--color-text-primary)" fontWeight={600}
                        style={{ pointerEvents: 'none' }}>
                        {e.label}
                      </text>
                    )}
                  </g>
                )
              })}
              {marqueeBox && (
                <rect 
                  x={Math.min(marqueeBox.startX, marqueeBox.endX)}
                  y={Math.min(marqueeBox.startY, marqueeBox.endY)}
                  width={Math.abs(marqueeBox.endX - marqueeBox.startX)}
                  height={Math.abs(marqueeBox.endY - marqueeBox.startY)}
                  fill="rgba(59, 130, 246, 0.2)"
                  stroke="rgba(59, 130, 246, 0.8)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  pointerEvents="none"
                />
              )}
            </svg>
            {renderNodes.map((n) => (
              <Node
                key={n.id}
                n={n}
                onClick={(node) => {
                  if (isDraggingNodeRef.current) return;
                  onNodeClick?.(node)
                }}
                onPointerDown={handleNodePointerDown}
                onAnchorDown={handleAnchorDown}
                onMouseEnter={() => { hoveredNodeRef.current = n.id }}
                onMouseLeave={() => { hoveredNodeRef.current = null }}
              />
            ))}
          </div>
        </div>

      </div>
      <MiniMap
        diagram={safeDiagram}
        docHeight={docHeight}
        viewportRef={viewportRef}
        scale={scale}
        tx={tx}
        ty={ty}
        canvasWidth={computedCanvasWidth}
        onJump={(next) => {
          const vp = viewportRef.current
          if (vp) {
            vp.scrollLeft = -next.tx
            vp.scrollTop = -next.ty
          }
        }}
        positionedNodes={positionedNodes}
        edges={edges}
      />
    </div>
  )
})

type MiniMapProps = {
  diagram: RoadmapDiagram
  docHeight: number
  viewportRef: React.RefObject<HTMLDivElement | null>
  scale: number
  tx: number
  ty: number
  canvasWidth: number
  onJump: (pos: { tx: number; ty: number }) => void
  positionedNodes: PositionedRoadmapNode[]
  edges: any[]
}

function MiniMap({ docHeight, viewportRef, scale, tx, ty, canvasWidth, onJump, positionedNodes, edges }: MiniMapProps) {
  const miniWidth = 200
  const miniHeight = 140

  const computedCanvasWidth = canvasWidth;
  const s = Math.min(miniWidth / computedCanvasWidth, miniHeight / docHeight)
  const [isDragging, setIsDragging] = useState(false)

  const [customPos, setCustomPos] = useState<{ x: number; y: number } | null>(null)
  const [isDraggingMinimap, setIsDraggingMinimap] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const minimapContainerRef = useRef<HTMLDivElement>(null)

  const updateJump = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const worldX = (e.clientX - rect.left) / s
    const worldY = (e.clientY - rect.top) / s
    const vp = viewportRef.current
    if (!vp) return
    vp.scrollLeft = worldX * scale - vp.clientWidth / 2
    vp.scrollTop = worldY * scale - vp.clientHeight / 2
  }

  const handleMinimapDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.minimap-canvas')) return
    e.stopPropagation()
    const container = minimapContainerRef.current?.parentElement
    if (!container || !minimapContainerRef.current) return

    if (!customPos) {
      const rect = minimapContainerRef.current.getBoundingClientRect()
      const parentRect = container.getBoundingClientRect()
      const startX = rect.left - parentRect.left
      const startY = rect.top - parentRect.top
      setCustomPos({ x: startX, y: startY })
      setDragStart({ x: e.clientX - startX, y: e.clientY - startY })
    } else {
      setDragStart({ x: e.clientX - customPos.x, y: e.clientY - customPos.y })
    }

    setIsDraggingMinimap(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleMinimapDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingMinimap || !minimapContainerRef.current || !minimapContainerRef.current.parentElement) return
    const parentRect = minimapContainerRef.current.parentElement.getBoundingClientRect()
    const mmRect = minimapContainerRef.current.getBoundingClientRect()

    let newX = e.clientX - dragStart.x
    let newY = e.clientY - dragStart.y

    newX = Math.max(0, Math.min(parentRect.width - mmRect.width, newX))
    newY = Math.max(0, Math.min(parentRect.height - mmRect.height, newY))

    setCustomPos({ x: newX, y: newY })
  }

  const handleMinimapDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingMinimap(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const scrollLeft = -tx
  const scrollTop = -ty

  const positionStyle: React.CSSProperties = customPos
    ? { left: customPos.x, top: customPos.y, cursor: isDraggingMinimap ? 'grabbing' : 'grab' }
    : { right: 104, bottom: 16, cursor: 'grab' }

  return (
    <div
      ref={minimapContainerRef}
      className="pointer-events-auto absolute z-50 rounded-md border border-border bg-card shadow-md p-2"
      style={positionStyle}
      onPointerDown={handleMinimapDragStart}
      onPointerMove={handleMinimapDragMove}
      onPointerUp={handleMinimapDragEnd}
      onPointerLeave={(e) => {
        if (isDraggingMinimap) {
          setIsDraggingMinimap(false)
          e.currentTarget.releasePointerCapture(e.pointerId)
        }
      }}
    >
      <div className="text-xs font-semibold mb-2 text-text-primary/70">Mini Map</div>
      <div className="minimap-canvas relative overflow-hidden rounded-sm border border-border/50 bg-[var(--color-bg-body)]"
        style={{ width: computedCanvasWidth * s, height: docHeight * s, cursor: isDragging ? 'grabbing' : 'pointer', pointerEvents: 'auto' }}
        onPointerDown={(e) => { setIsDragging(true); e.currentTarget.setPointerCapture(e.pointerId); updateJump(e); }}
        onPointerMove={(e) => { if (isDragging) updateJump(e); }}
        onPointerUp={(e) => { setIsDragging(false); e.currentTarget.releasePointerCapture(e.pointerId); }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-15 bg-primary/10" />

        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" viewBox={`0 0 ${computedCanvasWidth} ${docHeight}`}>
            {edges.map((e) => {
              const midX = (e.from.x + e.to.x) / 2
              return (
                <path key={`mini-${e.id}`} d={`M ${e.from.x} ${e.from.y} L ${midX} ${e.from.y} L ${midX} ${e.to.y} L ${e.to.x} ${e.to.y}`}
                  stroke={e.connector} strokeWidth={7} fill="none" opacity={0.6} strokeLinecap="round" strokeLinejoin="round" />
              )
            })}
            {positionedNodes.map(n => {
              const { fill, border } = getMappedNodeStyle(n)
              return (
                <rect key={`mini-${n.id}`} x={n.x} y={n.y} width={n.w} height={n.h} fill={fill} stroke={border} strokeWidth={4} rx={10} />
              )
            })}
          </svg>
        </div>

        {viewportRef.current && (
          <div className="absolute border-[1.5px] border-primary/70 bg-primary/15 pointer-events-none shadow-sm transition-none rounded-sm"
            style={{
              left: (scrollLeft / scale) * s,
              top: (scrollTop / scale) * s,
              width: (viewportRef.current.clientWidth / scale) * s,
              height: (viewportRef.current.clientHeight / scale) * s,
            }}
          />
        )}
      </div>
    </div>
  )
}