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
      <svg className="absolute inset-0 h-full w-full drop-shadow-sm" preserveAspectRatio="none" viewBox="0 0 100 100">
        <polygon points="50,2 98,50 50,98 2,50" fill={fill} stroke={border} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
    )
  }
  if (shape === 'hexagon') {
    return (
      <svg className="absolute inset-0 h-full w-full drop-shadow-sm" preserveAspectRatio="none" viewBox="0 0 100 100">
        <polygon points="12,2 88,2 98,50 88,98 12,98 2,50" fill={fill} stroke={border} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
    )
  }
  if (shape === 'document') {
    return (
      <svg className="absolute inset-0 h-full w-full drop-shadow-sm" preserveAspectRatio="none" viewBox="0 0 100 100">
        <polygon points="2,2 75,2 98,25 98,98 2,98" fill={fill} stroke={border} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <polyline points="75,2 75,25 98,25" fill="none" stroke={border} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
    )
  }
  if (shape === 'rounded-rect' || shape === 'rect') {
    const rx = shape === 'rounded-rect' ? "12" : "2"
    return (
      <svg className="absolute inset-0 h-full w-full drop-shadow-sm" preserveAspectRatio="none" viewBox="0 0 100 100">
        <rect x="2" y="2" width="96" height="96" rx={rx} fill={fill} stroke={border} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
    )
  }
  if (shape === 'arrow-right') {
    return (
      <svg className="absolute inset-0 h-full w-full drop-shadow-sm" preserveAspectRatio="none" viewBox="0 0 100 100">
        <polygon points="2,2 85,2 98,50 85,98 2,98 15,50" fill={fill} stroke={border} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
    )
  }
  return null
}

function Node({ n }: { n: PositionedRoadmapNode }) {
  // `overflow-hidden` prevents label text from bleeding into neighboring nodes.
  const base = 'absolute grid select-none place-items-center text-center text-[10px] leading-tight overflow-hidden transition-transform duration-150 hover:brightness-105 hover:scale-[1.02] z-10 cursor-pointer'

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
    return safeDiagram.edges.map((e) => {
      const fromN = nodesById.get(e.from || e.source) // Handle adapter 'source/target' mapping safety
      const toN = nodesById.get(e.to || e.target)
      if (!fromN || !toN) return null
      const from = anchorPoint(fromN, e.fromAnchor ?? 'right')
      const to = anchorPoint(toN, e.toAnchor ?? 'left')
      // Use a consistent connector color so all lines match the primary flow color
      const connector = 'var(--color-bg-sap-function)'
      return { id: e.id, from, to, connector, label: e.label ?? null }
    }).filter(Boolean) as any[]
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

  // Reset to an "extreme left" anchored view so the chart is not fit-to-screen.
  // This makes the rest of the flow accessible via pan (drag / wheel).
  const resetToLeft = () => {
    const el = viewportRef.current
    if (!el) return

    const resetScale = 1
    // Force tx to the leftmost allowed value and ty to the topmost allowed value.
    const clamped = getClampedTranslate(-1e9, 1e9, resetScale)

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
          backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--color-border) 95%, transparent) 1px, transparent 1px)',
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${tx}px ${ty}px`,
        }}
      />
      <div className="absolute left-0 top-0"
        style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: '0 0', width: safeDiagram.canvas.width, height: docHeight }}
      >
        {safeDiagram.lanes.map((lane, idx) => (
          <div key={`v-grid-${lane.id}`} className="pointer-events-none absolute top-0 w-[2.5px] bg-border z-0 shadow-sm" style={{ left: idx * laneWidth, height: contentHeight }} />
        ))}
        <div className="pointer-events-none absolute top-0 w-[2.5px] bg-border z-0 shadow-sm" style={{ left: safeDiagram.lanes.length * laneWidth, height: contentHeight }} />

        <div className="absolute left-0 top-0 z-20" style={{ width: safeDiagram.canvas.width, height: headerH }}>
          {safeDiagram.lanes.map((lane, idx) => {
            const person = lane.personId ? peopleById.get(lane.personId) : undefined
            return (
              <div key={lane.id} data-person-id={person?.id ?? undefined} data-lane-id={lane.id}
                onClick={() => !handMode && onLaneClick?.(lane)}
                className="absolute top-0 flex items-center justify-between border-b-4 border-border bg-card px-4 py-3 text-left shadow-md cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ left: idx * laneWidth, width: laneWidth, height: headerH, borderRight: idx === safeDiagram.lanes.length - 1 ? '2.5px solid var(--color-border)' : '2.5px solid var(--color-border)' }}
              >
                <div>
                  <div className="text-xs font-bold text-text-primary/70">{lane.title}</div>
                  <div className="mt-1 text-sm font-semibold text-primary">{person?.name ?? '—'}</div>
                </div>
                {person && <Avatar name={person.name} />}
              </div>
            )
          })}
        </div>

        <svg className="pointer-events-none absolute inset-0 z-0" width={safeDiagram.canvas.width} height={docHeight}>
          {edges.map((e) => {
            const midX = (e.from.x + e.to.x) / 2
            const midY = (e.from.y + e.to.y) / 2
            return (
              <g key={e.id}>
                <path d={`M ${e.from.x} ${e.from.y} L ${midX} ${e.from.y} L ${midX} ${e.to.y} L ${e.to.x} ${e.to.y}`}
                  stroke={e.connector} strokeWidth={3} fill="none" strokeOpacity={0.8} strokeLinejoin="round" />
                <circle cx={e.to.x} cy={e.to.y} r={5} fill={e.connector} />
                {e.label && (
                  <text x={midX} y={midY - 10} textAnchor="middle" fontSize={11} fill="var(--color-text-primary)" fontWeight={700}>
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
    <div className="pointer-events-auto absolute bottom-4 right-4 z-50 rounded-md border-2 border-border bg-card shadow-lg p-2 transition-transform hover:scale-105">
      <div className="text-xs font-semibold mb-2 text-text-primary/70">Mini Map</div>
      <div className="relative overflow-hidden rounded-sm border border-border/50 bg-[var(--color-bg-body)]"
        style={{ width: safeCanvasW * s, height: docHeight * s, cursor: isDragging ? 'grabbing' : 'pointer' }}
        onPointerDown={(e) => { setIsDragging(true); e.currentTarget.setPointerCapture(e.pointerId); updateJump(e); }}
        onPointerMove={(e) => { if (isDragging) updateJump(e); }}
        onPointerUp={(e) => { setIsDragging(false); e.currentTarget.releasePointerCapture(e.pointerId); }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-primary/10" />
        
        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" viewBox={`0 0 ${safeCanvasW} ${docHeight}`}>
            {edges.map((e) => {
              const midX = (e.from.x + e.to.x) / 2
              return (
                <path key={`mini-${e.id}`} d={`M ${e.from.x} ${e.from.y} L ${midX} ${e.from.y} L ${midX} ${e.to.y} L ${e.to.x} ${e.to.y}`}
                  stroke={e.connector} strokeWidth={8} fill="none" opacity={0.6} />
              )
            })}
            {positionedNodes.map(n => (
              <rect key={`mini-${n.id}`} x={n.x} y={n.y} width={n.w} height={n.h} fill={n.style.fill} stroke={n.style.border} strokeWidth={4} rx={10} />
            ))}
          </svg>
        </div>

        {viewportRef.current && (
          <div className="absolute border-[1.5px] border-primary bg-primary/20 pointer-events-none shadow-sm transition-none"
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