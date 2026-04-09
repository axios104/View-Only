import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { Anchor, Person, RoadmapDiagram, Lane } from '../types/roadmap'
import { setTranslate, setScale, setSelectedEditEdgeId, setSelectedEditNodeId } from '../store/canvasSlice'
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
      fill = '#E3F2FD'; border = '#1565C0'; shape = 'rounded-rect';
    } else if (status === 'legacy' || status === 'in-progress') {
      fill = '#FFF3E0'; border = '#E65100'; shape = 'parallelogram'; // Restored Parallelogram
    } else if (status === 'manual' || status === 'planned') {
      fill = '#E8F5E9'; border = '#2E7D32'; shape = 'trapezoid'; // Restored Trapezoid
    } else {
      fill = '#F8FAFC'; border = '#64748B'; shape = 'rounded-rect';
    }
  }
  else if (type === 'decision') {
    fill = '#FEFCE8'; border = '#EAB308'; shape = 'decision';
  }
  else if (type === 'terminator') {
    fill = '#F3E8FF'; border = '#A855F7'; shape = 'hexagon'; // Restored Hexagon
  }
  else if (type === 'document') {
    fill = '#F1F5F9'; border = '#475569'; shape = 'document';
  }
  else if (type === 'data' || type === 'database') {
    fill = '#F1F5F9'; border = '#475569'; shape = 'database';
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
  const { selectedEditNodeId, mode, handMode } = useAppSelector((s) => s.canvas)
  const isSelected = mode === 'edit' && selectedEditNodeId === n.id

  const { shape, fill, border } = getMappedNodeStyle(n)

  const base = 'absolute grid select-none place-items-center text-center text-[11px] leading-snug transition-all duration-200 z-10'

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
  const { scale, tx, ty, handMode, magnifierMode, pendingAddType, mode, selectedEditEdgeId } = useAppSelector((s) => s.canvas)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const transformLayerRef = useRef<HTMLDivElement | null>(null)

  const [dragging, setDragging] = useState(false)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const clickCandidateRef = useRef<{ personId: string | null; nodeId: string | null; laneId: string | null; x: number; y: number; moved: boolean }>({ personId: null, nodeId: null, laneId: null, x: 0, y: 0, moved: false })

  const [draggedNode, setDraggedNode] = useState<{ id: string, x: number, y: number, laneId?: string } | null>(null)

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

  // Horizontal Scrolling / Dynamic Lane Width Logic
  const MIN_LANE_WIDTH = 350;
  const computedCanvasWidth = Math.max(safeDiagram.canvas.width || 2000, safeDiagram.lanes.length * MIN_LANE_WIDTH);
  const laneWidth = safeDiagram.lanes.length > 0 ? computedCanvasWidth / safeDiagram.lanes.length : computedCanvasWidth;

  const headerH = 110;
  const rowGap = 90;

  const positionedNodes = useMemo(() => {
    return layoutRoadmapNodes(safeDiagram, { laneWidth, headerH, rowGap })
  }, [safeDiagram, laneWidth])

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
      const from = anchorPoint(fromN, e.fromAnchor ?? 'right')
      const to = anchorPoint(toN, e.toAnchor ?? 'left')
      const connector = 'var(--color-bg-sap-function)'
      return { id: e.id, from, to, connector, label: e.label ?? null, source: e.from || e.source, target: e.to || e.target }
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
      if (draggedNode?.id === n.id) {
        return { ...n, x: draggedNode.x, y: draggedNode.y } as PositionedRoadmapNode
      }
      return n
    })
  }, [positionedNodes, draggedNode])

  const handleNodePointerDown = (e: React.PointerEvent, n: PositionedRoadmapNode) => {
    if (mode !== 'edit' || handMode) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)

    dispatch(setSelectedEditNodeId(n.id))

    const el = transformLayerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const worldX = px / scale
    const worldY = py / scale
    const offsetX = worldX - n.x
    const offsetY = worldY - n.y

    setDraggedNode({ id: n.id, x: n.x, y: n.y })

    const onMove = (ev: PointerEvent) => {
      const ex = ev.clientX - rect.left
      const ey = ev.clientY - rect.top
      const worldX = ex / scale
      const worldY = ey / scale

      const laneIdx = Math.max(0, Math.min(safeDiagram.lanes.length - 1, Math.floor(worldX / laneWidth)))
      const hoveredLaneId = safeDiagram.lanes[laneIdx]?.id

      const laneMinX = laneIdx * laneWidth + 8
      const laneMaxX = laneMinX + laneWidth - n.w - 16

      const nx = worldX - offsetX
      const ny = worldY - offsetY
      const clampedX = Math.max(laneMinX, Math.min(laneMaxX, nx))

      setDraggedNode({ id: n.id, x: clampedX, y: ny, laneId: hoveredLaneId })
    }

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setDraggedNode(prev => {
        if (prev) {
          dispatch(updateNodeCoords({ id: n.id, posX: prev.x, posY: prev.y, laneId: prev.laneId }))
        }
        return null
      })
      try { (ev.target as Element).releasePointerCapture(ev.pointerId) } catch { }
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

    const worldX = (el.scrollLeft + px) / scale
    const worldY = (el.scrollTop + py) / scale

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
      if (rect) zoomAround(scale * 1.15, rect.left + rect.width / 2, rect.top + rect.height / 2)
    },
    zoomOut: () => {
      const rect = viewportRef.current?.getBoundingClientRect()
      if (rect) zoomAround(scale * 0.85, rect.left + rect.width / 2, rect.top + rect.height / 2)
    },
    reset: resetToLeft,
    fit,
  }), [dispatch, scale, docHeight, computedCanvasWidth])

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
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            zoomAround(scale * (e.deltaY > 0 ? 0.92 : 1.08), e.clientX, e.clientY)
          }
        }}
        onPointerDown={(e) => {
          if (magnifierMode) {
            zoomAround(scale * 1.5, e.clientX, e.clientY)
            return
          }

          const isMiddle = e.button === 1
          if (!handMode && !isMiddle) return

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
              if (handMode) return;
              if ((e.target as HTMLElement).closest('[data-node-id]') || (e.target as HTMLElement).closest('[data-lane-id]')) return;

              const rect = transformLayerRef.current?.getBoundingClientRect();
              if (!rect) return;
              const px = e.clientX - rect.left;
              const py = e.clientY - rect.top;
              const worldX = px / scale;
              const worldY = py / scale;
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
              <div key={`v-grid-${lane.id}`} className="pointer-events-none absolute top-0 z-0" style={{ left: idx * laneWidth, width: '2px', height: '100%', backgroundColor: '#64748b', opacity: 0.8 }} />
            ))}
            <div className="pointer-events-none absolute top-0 z-0" style={{ left: safeDiagram.lanes.length * laneWidth, width: '2px', height: '100%', backgroundColor: '#64748b', opacity: 0.8 }} />

            <div className="absolute left-0 top-0 z-20" style={{ width: computedCanvasWidth, height: headerH }}>
              {safeDiagram.lanes.map((lane, idx) => {
                const person = lane.personId ? peopleById.get(lane.personId) : undefined
                return (
                  <div key={lane.id} data-person-id={person?.id ?? undefined} data-lane-id={lane.id}
                    onClick={() => !handMode && onLaneClick?.(lane)}
                    className="absolute top-0 flex flex-col items-center justify-center bg-white px-2 py-2 text-center cursor-pointer hover:bg-slate-50 transition-all duration-200 border-b border-slate-200 z-20"
                    style={{ left: idx * laneWidth, width: laneWidth, height: headerH, borderRight: '1px solid #cbd5e1' }}
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
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="var(--color-bg-sap-function)" />
                </marker>
              </defs>
              {drawingEdge && (() => {
                const srcNode = nodesById.get(drawingEdge.sourceId)
                if (!srcNode) return null
                const pt = anchorPoint({ ...srcNode, x: draggedNode?.id === srcNode.id ? draggedNode.x : srcNode.x, y: draggedNode?.id === srcNode.id ? draggedNode.y : srcNode.y }, drawingEdge.sourceAnchor)
                return (
                  <path d={`M ${pt.x} ${pt.y} L ${drawingEdge.x} ${drawingEdge.y}`} stroke="var(--color-primary)" strokeWidth={3} fill="none" strokeDasharray="5,5" />
                )
              })()}
              {edges.map((e) => {
                const draggedSrc = draggedNode && e.source === draggedNode.id
                const draggedTgt = draggedNode && e.target === draggedNode.id
                const sN = nodesById.get(e.source)
                const tN = nodesById.get(e.target)
                if (!sN || !tN) return null

                const fromNode = draggedSrc ? { ...sN, x: draggedNode.x, y: draggedNode.y } : sN
                const toNode = draggedTgt ? { ...tN, x: draggedNode.x, y: draggedNode.y } : tN

                const fromPt = anchorPoint(fromNode, e.fromAnchor ?? 'right')
                const toPt = anchorPoint(toNode, e.toAnchor ?? 'left')

                const midX = (fromPt.x + toPt.x) / 2
                const vGap = Math.abs(toPt.y - fromPt.y)
                const bendY = fromPt.y + vGap / 2
                const isGoingRight = toPt.x >= fromPt.x
                const labelX = isGoingRight ? midX + 40 : midX - 40
                const labelY = bendY - 15
                const offset = (e.offset || 0)
                const bendXOffset = midX + offset

                const isSelectedEdge = selectedEditEdgeId === e.id
                const strokeColor = isSelectedEdge ? 'var(--color-primary)' : e.connector

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
                    <path d={`M ${fromPt.x} ${fromPt.y} L ${bendXOffset} ${fromPt.y} L ${bendXOffset} ${toPt.y} L ${toPt.x} ${toPt.y}`}
                      stroke="transparent" strokeWidth={15} fill="none" />

                    <path d={`M ${fromPt.x} ${fromPt.y} L ${bendXOffset} ${fromPt.y} L ${bendXOffset} ${toPt.y} L ${toPt.x} ${toPt.y}`}
                      stroke={strokeColor} strokeWidth={isSelectedEdge ? 3 : 2} fill="none" strokeOpacity={0.85} strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#arrowhead)" />
                    <circle cx={fromPt.x} cy={fromPt.y} r={3.5} fill={strokeColor} opacity={0.9} />
                    <circle cx={toPt.x} cy={toPt.y} r={3.5} fill={strokeColor} opacity={0.9} />
                    {e.label && (
                      <text x={labelX} y={labelY} textAnchor={isGoingRight ? 'start' : 'end'} fontSize={11} fill="var(--color-text-primary)" fontWeight={600}
                        style={{ pointerEvents: 'none' }}>
                        {e.label}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
            {renderNodes.map((n) => (
              <Node
                key={n.id}
                n={n}
                onClick={onNodeClick}
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
  onJump: (pos: { tx: number; ty: number }) => void
  positionedNodes: PositionedRoadmapNode[]
  edges: any[]
}

function MiniMap({ diagram, docHeight, viewportRef, scale, tx, ty, onJump, positionedNodes, edges }: MiniMapProps) {
  const miniWidth = 220
  const miniHeight = 160

  const MIN_LANE_WIDTH = 350;
  const computedCanvasWidth = Math.max(diagram.canvas?.width || 2000, diagram.lanes.length * MIN_LANE_WIDTH);
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
    : { right: 16, bottom: 16, cursor: 'grab' }

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