import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { Anchor, Person, RoadmapDiagram, NodeShape, Lane } from '../types/roadmap'
import { setTranslate, setScale, setSelectedEditEdgeId, setSelectedEditNodeId } from '../store/canvasSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { updateNodeCoords, addEdge, removeEdge } from '../store/diagramSlice'
import { Avatar } from './Avatar'
import { layoutRoadmapNodes, type PositionedRoadmapNode } from '../layout/layoutRoadmap'

type ProcessCanvasProps = {
  diagram: RoadmapDiagram
  className?: string
  onPersonClick?: (person: Person) => void
  onNodeClick?: (node: PositionedRoadmapNode) => void
  onLaneClick?: (lane: Lane) => void
  onBackgroundClick?: (x: number, y: number) => void
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

function NodeBg({ shape, fill, border }: { shape: NodeShape, fill: string, border: string }) {
  if (shape === 'decision') {
    return (
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))' }}>
        <polygon points="50,2 98,50 50,98 2,50" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    )
  }
  if (shape === 'hexagon') {
    return (
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))' }}>
        <polygon points="12,2 88,2 98,50 88,98 12,98 2,50" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    )
  }
  if (shape === 'document') {
    return (
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))' }}>
        <polygon points="2,2 75,2 98,25 98,98 2,98" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <polyline points="75,2 75,25 98,25" fill="none" stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    )
  }
  if (shape === 'rounded-rect' || shape === 'rect') {
    const rx = shape === 'rounded-rect' ? "10" : "2"
    return (
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))' }}>
        <rect x="2" y="2" width="96" height="96" rx={rx} fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    )
  }
  if (shape === 'arrow-right') {
    return (
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))' }}>
        <polygon points="2,2 85,2 98,50 85,98 2,98 15,50" fill={fill} stroke={border} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    )
  }
  return null
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
        color: n.style.text,
        fontWeight: 600,
        outline: isSelected ? '3px solid var(--color-primary)' : 'none',
        outlineOffset: isSelected ? '4px' : '0px',
        borderRadius: n.shape === 'decision' || n.shape === 'hexagon' ? '4px' : 'inherit'
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ borderRadius: 'inherit' }}>
        <NodeBg shape={n.shape} fill={n.style.fill} border={n.style.border} />
      </div>
      <div className="relative z-10 flex h-full w-full items-center justify-center p-2 text-center overflow-hidden pointer-events-none">
        <div>
          {(n.label ?? '').split('\n').map((line: string, idx: number) => (
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
    switch(pos) {
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
  { diagram, className, onPersonClick, onNodeClick, onLaneClick, onBackgroundClick },
  ref,
) {
  // SAFETY NET: Provide fallbacks for missing arrays or canvas properties
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

  const laneWidth = safeDiagram.lanes.length > 0 ? safeDiagram.canvas.width / safeDiagram.lanes.length : safeDiagram.canvas.width
  const headerH = 64
  const rowGap = 90

  const positionedNodes = useMemo(() => {
    return layoutRoadmapNodes(safeDiagram, { laneWidth, headerH, rowGap })
  }, [safeDiagram, laneWidth])

  const maxLevel = positionedNodes.reduce((acc, n) => Math.max(acc, n.level), 0)
  const contentHeight = headerH + (maxLevel + 1) * rowGap
  const docHeight = Math.max(safeDiagram.canvas.height, contentHeight + 50)

  // Bounds Calculator: Prevent infinite scrolling
  const getClampedTranslate = (nextTx: number, nextTy: number, currentScale: number) => {
    const el = viewportRef.current
    if (!el) return { tx: nextTx, ty: nextTy }

    const rect = el.getBoundingClientRect()
    const padding = 50

    const scaledW = safeDiagram.canvas.width * currentScale
    let minTx, maxTx
    if (scaledW + padding * 2 < rect.width) {
      minTx = maxTx = (rect.width - scaledW) / 2
    } else {
      minTx = rect.width - scaledW - padding
      maxTx = padding
    }

    const scaledH = docHeight * currentScale
    let minTy, maxTy
    if (scaledH + padding * 2 < rect.height) {
      minTy = maxTy = padding
    } else {
      minTy = rect.height - scaledH - padding
      maxTy = padding
    }

    return {
      tx: Math.max(minTx, Math.min(maxTx, nextTx)),
      ty: Math.max(minTy, Math.min(maxTy, nextTy)),
    }
  }

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

    // Detect and offset parallel/duplicate connectors
    const edgesByPair = new Map<string, any[]>()
    edgesList.forEach(edge => {
      const key1 = `${edge.source}->${edge.target}`
      const key = edgesByPair.has(key1) ? key1 : key1
      if (!edgesByPair.has(key)) edgesByPair.set(key, [])
      edgesByPair.get(key)!.push(edge)
    })

    // Apply offset to parallel connectors
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
      
      // Find the lane the cursor is over
      const laneIdx = Math.max(0, Math.min(safeDiagram.lanes.length - 1, Math.floor(worldX / laneWidth)))
      const hoveredLaneId = safeDiagram.lanes[laneIdx]?.id
      
      // Clamp strictly inside that lane's column boundaries
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
      try { (ev.target as Element).releasePointerCapture(ev.pointerId) } catch {}
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
      
      // Calculate manual collision because pointer-capture blocks onMouseEnter
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
      try { (ev.target as Element).releasePointerCapture(ev.pointerId) } catch {}
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

    // After scale, scroll so same world point stays under cursor
    requestAnimationFrame(() => {
      el.scrollLeft = worldX * clampedScale - px
      el.scrollTop = worldY * clampedScale - py
    })
  }

  const fit = () => {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    const contentW = Math.max(1, safeDiagram.canvas.width)
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
    dispatch(setScale(0.85))
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
    // Note: expose resetToLeft behavior instead of fit-to-screen reset.
  }), [dispatch, scale, docHeight, safeDiagram.canvas.width])

  return (
    <div className={['relative h-full w-full overflow-hidden', className ?? ''].join(' ')}>
      <div
        ref={viewportRef}
        className={['absolute inset-0 overflow-auto bg-[var(--color-bg-body)]',
          pendingAddType ? 'cursor-crosshair' : (magnifierMode ? 'cursor-zoom-in' : (handMode ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'))].join(' ')}
        style={{ touchAction: 'none' }}
        onScroll={() => {
          // Sync scroll position to Redux for minimap
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
          // Normal wheel: let native scroll handle it
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

            // Hand drag → native scroll
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
        {/* Dot-grid background - fixed behind scroll */}
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
          style={{ width: safeDiagram.canvas.width * scale, height: docHeight * scale, position: 'relative', flexShrink: 0 }}
        >
          <div
            ref={transformLayerRef}
            onClick={(e) => {
              if (handMode) return;
              // If click happened on a known node or lane, let it propagate but do nothing here
              if ((e.target as HTMLElement).closest('[data-node-id]') || (e.target as HTMLElement).closest('[data-lane-id]')) return;
              
              const rect = transformLayerRef.current?.getBoundingClientRect();
              if (!rect) return;
              const px = e.clientX - rect.left;
              const py = e.clientY - rect.top;
              const worldX = px / scale;
              const worldY = py / scale;
              onBackgroundClick?.(worldX, worldY);
            }}
            style={{ transform: `scale(${scale})`, transformOrigin: '0 0', width: safeDiagram.canvas.width, height: docHeight, position: 'absolute', left: 0, top: 0 }}
          >
            {safeDiagram.lanes.map((lane, idx) => (
              <div key={`v-grid-${lane.id}`} className="pointer-events-none absolute top-0 z-0" style={{ left: idx * laneWidth, width: '3px', height: contentHeight, backgroundColor: 'var(--color-border)', opacity: 0.75 }} />
            ))}
            <div className="pointer-events-none absolute top-0 z-0" style={{ left: safeDiagram.lanes.length * laneWidth, width: '3px', height: contentHeight, backgroundColor: 'var(--color-border)', opacity: 0.75 }} />

            <div className="absolute left-0 top-0 z-20" style={{ width: safeDiagram.canvas.width, height: headerH }}>
              {safeDiagram.lanes.map((lane, idx) => {
                const person = lane.personId ? peopleById.get(lane.personId) : undefined
                return (
                  <div key={lane.id} data-person-id={person?.id ?? undefined} data-lane-id={lane.id}
                    onClick={() => !handMode && onLaneClick?.(lane)}
                    className="absolute top-0 flex items-center justify-between bg-gradient-to-b from-card to-card/80 px-4 py-3 text-left cursor-pointer hover:from-card hover:to-card/90 transition-all duration-200 border-b border-border/50"
                    style={{ left: idx * laneWidth, width: laneWidth, height: headerH, borderRight: '3px solid var(--color-border)' }}
                  >
                    <div>
                      <div className="text-xs font-semibold text-text-primary/60 tracking-wide">{lane.title}</div>
                      <div className="mt-1 text-sm font-bold text-primary/80">{person?.name ?? '—'}</div>
                    </div>
                    {person && <Avatar name={person.name} />}
                  </div>
                )
              })}
            </div>

            <svg className="pointer-events-none absolute inset-0 z-0" width={safeDiagram.canvas.width} height={docHeight}>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="var(--color-bg-sap-function)" />
                </marker>
              </defs>
              {drawingEdge && (() => {
                const srcNode = nodesById.get(drawingEdge.sourceId)
                if(!srcNode) return null
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
                    onClick={(ev) => {
                      if (mode === 'edit') {
                        ev.stopPropagation()
                        dispatch(setSelectedEditEdgeId(e.id))
                      }
                    }}
                  >
                    {/* Invisible thicker area for easier clicking */}
                    <path d={`M ${fromPt.x} ${fromPt.y} L ${bendXOffset} ${fromPt.y} L ${bendXOffset} ${toPt.y} L ${toPt.x} ${toPt.y}`}
                      stroke="transparent" strokeWidth={15} fill="none" />
                      
                    {/* Connector path */}
                    <path d={`M ${fromPt.x} ${fromPt.y} L ${bendXOffset} ${fromPt.y} L ${bendXOffset} ${toPt.y} L ${toPt.x} ${toPt.y}`}
                      stroke={strokeColor} strokeWidth={isSelectedEdge ? 3 : 2} fill="none" strokeOpacity={0.85} strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#arrowhead)" />
                    {/* Dot at source */}
                    <circle cx={fromPt.x} cy={fromPt.y} r={3.5} fill={strokeColor} opacity={0.9} />
                    {/* Dot at target */}
                    <circle cx={toPt.x} cy={toPt.y} r={3.5} fill={strokeColor} opacity={0.9} />
                    {/* Label */}
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
          </div>{/* close transform layer */}
        </div>{/* close sizer */}

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
  const safeCanvasW = diagram.canvas?.width || 2000
  const s = Math.min(miniWidth / safeCanvasW, miniHeight / docHeight)
  const [isDragging, setIsDragging] = useState(false)

  // Dragging state for the minimap container itself
  const [customPos, setCustomPos] = useState<{ x: number; y: number } | null>(null)
  const [isDraggingMinimap, setIsDraggingMinimap] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const minimapContainerRef = useRef<HTMLDivElement>(null)

  const updateJump = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    // Convert minimap click to world coordinates, then to scroll position
    const worldX = (e.clientX - rect.left) / s
    const worldY = (e.clientY - rect.top) / s
    const vp = viewportRef.current
    if (!vp) return
    // Center the viewport on the clicked world point
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

  // Derive scroll position from tx/ty (tx = -scrollLeft, ty = -scrollTop)
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
        style={{ width: safeCanvasW * s, height: docHeight * s, cursor: isDragging ? 'grabbing' : 'pointer', pointerEvents: 'auto' }}
        onPointerDown={(e) => { setIsDragging(true); e.currentTarget.setPointerCapture(e.pointerId); updateJump(e); }}
        onPointerMove={(e) => { if (isDragging) updateJump(e); }}
        onPointerUp={(e) => { setIsDragging(false); e.currentTarget.releasePointerCapture(e.pointerId); }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-15 bg-primary/10" />

        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" viewBox={`0 0 ${safeCanvasW} ${docHeight}`}>
            {edges.map((e) => {
              const midX = (e.from.x + e.to.x) / 2
              return (
                <path key={`mini-${e.id}`} d={`M ${e.from.x} ${e.from.y} L ${midX} ${e.from.y} L ${midX} ${e.to.y} L ${e.to.x} ${e.to.y}`}
                  stroke={e.connector} strokeWidth={7} fill="none" opacity={0.6} strokeLinecap="round" strokeLinejoin="round" />
              )
            })}
            {positionedNodes.map(n => (
              <rect key={`mini-${n.id}`} x={n.x} y={n.y} width={n.w} height={n.h} fill={n.style.fill} stroke={n.style.border} strokeWidth={4} rx={10} />
            ))}
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