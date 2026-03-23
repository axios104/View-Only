import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { Anchor, Person, RoadmapDiagram, NodeShape, Lane } from '../types/roadmap'
import { setTranslate, setScale } from '../store/canvasSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { Avatar } from './Avatar'
import { layoutRoadmapNodes, type PositionedRoadmapNode } from '../layout/layoutRoadmap'

type ProcessCanvasProps = {
  diagram: RoadmapDiagram
  className?: string
  onPersonClick?: (person: Person) => void
  onNodeClick?: (node: PositionedRoadmapNode) => void
  onLaneClick?: (lane: Lane) => void
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

function Node({ n }: { n: PositionedRoadmapNode }) {
  // `overflow-hidden` prevents label text from bleeding into neighboring nodes.
  const base = 'absolute grid select-none place-items-center text-center text-[11px] leading-snug overflow-hidden transition-all duration-200 hover:brightness-110 hover:scale-105 z-10 cursor-pointer'

  return (
    <div
      className={base}
      data-node-id={n.id}
      role="button"
      tabIndex={0}
      style={{
        left: n.x,
        top: n.y,
        width: n.w,
        height: n.h,
        color: n.style.text,
        fontWeight: 600
      }}
    >
      <NodeBg shape={n.shape} fill={n.style.fill} border={n.style.border} />
      <div className="relative z-10 flex h-full w-full items-center justify-center p-2 text-center overflow-hidden">
        <div>
          {(n.label ?? '').split('\n').map((line: string, idx: number) => (
            <div key={idx} className="break-words">{line}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const ProcessCanvas = forwardRef<ProcessCanvasApi, ProcessCanvasProps>(function ProcessCanvas(
  { diagram, className, onPersonClick, onNodeClick, onLaneClick },
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
  const { scale, tx, ty, handMode, magnifierMode } = useAppSelector((s) => s.canvas)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  
  const [dragging, setDragging] = useState(false)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const clickCandidateRef = useRef<{ personId: string | null; nodeId: string | null; laneId: string | null; x: number; y: number; moved: boolean }>({ personId: null, nodeId: null, laneId: null, x: 0, y: 0, moved: false })

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

  const zoomAround = (nextScale: number, clientX: number, clientY: number) => {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top

    const worldX = (px - tx) / scale
    const worldY = (py - ty) / scale

    const clampedScale = Math.max(0.25, Math.min(4.0, nextScale))
    const nextTx = px - worldX * clampedScale
    const nextTy = py - worldY * clampedScale
    dispatch(setScale(clampedScale))
    dispatch(setTranslate(getClampedTranslate(nextTx, nextTy, clampedScale)))
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
    const targetScale = Math.max(0.25, Math.min(2.5, Math.min(targetScaleW, targetScaleH)))

    // Center the full diagram in the viewport.
    const nextTx = (rect.width - contentW * targetScale) / 2
    const nextTy = (rect.height - contentH * targetScale) / 2

    dispatch(setScale(targetScale))
    dispatch(setTranslate(getClampedTranslate(nextTx, nextTy, targetScale)))
  }

  // Reset to top-left view so the chart starts from the beginning.
  // This makes the rest of the flow accessible via pan (drag / wheel).
  const resetToLeft = () => {
    const el = viewportRef.current
    if (!el) return

    const resetScale = 1
    // Reset to (0, 0) which gets clamped to the topmost-leftmost allowed position.
    const clamped = getClampedTranslate(0, 0, resetScale)

    dispatch(setScale(resetScale))
    dispatch(setTranslate(clamped))
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
    <div
      ref={viewportRef}
      className={['relative h-full w-full overflow-hidden bg-[var(--color-bg-body)]', 
        magnifierMode ? 'cursor-zoom-in' : (handMode ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'),
        className ?? ''].join(' ')}
      style={{ touchAction: 'none' }}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          zoomAround(scale * (e.deltaY > 0 ? 0.92 : 1.08), e.clientX, e.clientY)
        } else {
          dispatch(setTranslate(getClampedTranslate(tx - e.deltaX, ty - e.deltaY, scale)))
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

        let raf: number | null = null
        let currentTx = tx
        let currentTy = ty

        const onMove = (ev: PointerEvent) => {
          const dx = ev.clientX - lastPointerRef.current!.x
          const dy = ev.clientY - lastPointerRef.current!.y
          lastPointerRef.current = { x: ev.clientX, y: ev.clientY }
          
          const clamped = getClampedTranslate(currentTx + dx, currentTy + dy, scale)
          currentTx = clamped.tx
          currentTy = clamped.ty

          if (!clickCandidateRef.current.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
            clickCandidateRef.current.moved = true
          }

          if (raf == null) {
            raf = window.requestAnimationFrame(() => {
              dispatch(setTranslate({ tx: currentTx, ty: currentTy }))
              raf = null
            })
          }
        }

        const onUp = (ev: PointerEvent) => {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
          if (raf) window.cancelAnimationFrame(raf)
          setDragging(false)

          try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}

          if (ev.type === 'pointerup' && !clickCandidateRef.current.moved) {
            const { personId, nodeId, laneId } = clickCandidateRef.current
            if (nodeId) onNodeClick?.(nodesById.get(nodeId)!)
            else if (personId) onPersonClick?.(peopleById.get(personId)!)
            else if (laneId) onLaneClick?.(lanesById.get(laneId)!)
          }
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
      }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(100, 116, 139, 0.5) 1.5px, transparent 1.5px),
            radial-gradient(circle at 20px 20px, rgba(100, 116, 139, 0.5) 1.5px, transparent 1.5px)
          `,
          backgroundSize: `40px 40px`,
          backgroundPosition: `0 0, 20px 20px`,
        }}
      />
      <div className="absolute left-0 top-0"
        style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: '0 0', width: safeDiagram.canvas.width, height: docHeight }}
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
          {edges.map((e) => {
            const midX = (e.from.x + e.to.x) / 2
            const vGap = Math.abs(e.to.y - e.from.y)
            const bendY = e.from.y + vGap / 2
            const isGoingRight = e.to.x >= e.from.x
            const labelX = isGoingRight ? midX + 40 : midX - 40
            const labelY = bendY - 15
            const offset = (e.offset || 0)
            const bendXOffset = midX + offset
            
            return (
              <g key={e.id}>
                {/* Connector path with offset for parallel edges */}
                <path d={`M ${e.from.x} ${e.from.y} L ${bendXOffset} ${e.from.y} L ${bendXOffset} ${e.to.y} L ${e.to.x} ${e.to.y}`}
                  stroke={e.connector} strokeWidth={2} fill="none" strokeOpacity={0.85} strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#arrowhead)" />
                <circle cx={e.to.x} cy={e.to.y} r={3.5} fill={e.connector} opacity={0.9} />
                {/* Label positioned to the SIDE based on connector direction */}
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
        {positionedNodes.map((n) => <Node key={n.id} n={n} />)}
      </div>
      <MiniMap 
        diagram={safeDiagram} 
        docHeight={docHeight} 
        viewportRef={viewportRef} 
        scale={scale} 
        tx={tx} 
        ty={ty} 
        onJump={(next) => dispatch(setTranslate(getClampedTranslate(next.tx, next.ty, scale)))}
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
  // Handle case where width could be 0 safely
  const safeCanvasW = diagram.canvas?.width || 2000
  const s = Math.min(miniWidth / safeCanvasW, miniHeight / docHeight)
  const [isDragging, setIsDragging] = useState(false)

  const updateJump = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const worldX = (e.clientX - rect.left) / s
    const worldY = (e.clientY - rect.top) / s
    const vRect = viewportRef.current!.getBoundingClientRect()
    onJump({ tx: vRect.width / 2 - worldX * scale, ty: vRect.height / 2 - worldY * scale })
  }

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-50 rounded-md border border-border bg-card shadow-md p-2 transition-transform hover:scale-105">
      <div className="text-xs font-semibold mb-2 text-text-primary/70">Mini Map</div>
      <div className="relative overflow-hidden rounded-sm border border-border/50 bg-[var(--color-bg-body)]"
        style={{ width: safeCanvasW * s, height: docHeight * s, cursor: isDragging ? 'grabbing' : 'pointer' }}
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
              left: (-tx / scale) * s,
              top: (-ty / scale) * s,
              width: (viewportRef.current.clientWidth / scale) * s,
              height: (viewportRef.current.clientHeight / scale) * s,
            }}
          />
        )}
      </div>
    </div>
  )
}