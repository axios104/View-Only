import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { Anchor, Person, RoadmapDiagram, WorkType, NodeShape } from '../types/roadmap'
import { setTranslate, setScale } from '../store/canvasSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { Avatar } from './Avatar'
import { layoutRoadmapNodes, type PositionedRoadmapNode } from '../layout/layoutRoadmap'

type ProcessCanvasProps = {
  diagram: RoadmapDiagram
  className?: string
  onPersonClick?: (person: Person) => void
  onNodeClick?: (node: PositionedRoadmapNode) => void
}

export type ProcessCanvasApi = {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  fit: () => void
}

const workTypeFill: Record<WorkType, string> = {
  sap: 'var(--color-bg-sap-function)',
  legacy: 'var(--color-bg-legacy-function)',
  manual: 'var(--color-bg-manual-function)',
  neutral: 'var(--color-bg-neutral-node)',
}

const workTypeText: Record<WorkType, string> = {
  sap: 'var(--color-text-secondary)',
  legacy: 'var(--color-text-secondary)',
  manual: 'var(--color-text-secondary)',
  neutral: 'var(--color-text-primary)',
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
    const rx = shape === 'rounded-rect' ? "16" : "2"
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
  const base = 'absolute grid select-none place-items-center text-center text-[11.5px] leading-tight transition-transform duration-150 hover:brightness-105 hover:scale-105 z-10'
  const fill = n.style?.fill ?? workTypeFill[n.workType]
  const text = n.style?.text ?? workTypeText[n.workType]
  const border = n.style?.border ?? 'rgba(0,0,0,0.1)'

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
        color: text,
        fontWeight: 600
      }}
    >
      <NodeBg shape={n.shape} fill={fill} border={border} />
      <div className="relative z-10 flex h-full w-full items-center justify-center p-3 text-center">
        <div>
          {n.label.split('\n').map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const ProcessCanvas = forwardRef<ProcessCanvasApi, ProcessCanvasProps>(function ProcessCanvas(
  { diagram, className, onPersonClick, onNodeClick },
  ref,
) {
  const dispatch = useAppDispatch()
  const { scale, tx, ty, handMode, magnifierMode } = useAppSelector((s) => s.canvas)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  
  const [dragging, setDragging] = useState(false)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const clickCandidateRef = useRef<{ personId: string | null; nodeId: string | null; x: number; y: number; moved: boolean }>({ personId: null, nodeId: null, x: 0, y: 0, moved: false })

  const peopleById = useMemo(() => {
    const m = new Map<string, Person>()
    diagram.people.forEach((p) => m.set(p.id, p))
    return m
  }, [diagram.people])

  const laneWidth = diagram.lanes.length > 0 ? diagram.canvas.width / diagram.lanes.length : diagram.canvas.width
  const headerH = 64
  const rowGap = 120

  const positionedNodes = useMemo(() => {
    return layoutRoadmapNodes(diagram, { laneWidth, headerH, rowGap })
  }, [diagram, laneWidth])

  // Figure out the max grid extent so empty boxes enclose out-of-bound nodes properly.
  const maxLevel = positionedNodes.reduce((acc, n) => Math.max(acc, n.level), 0)
  const contentHeight = headerH + (maxLevel + 1) * rowGap
  const docHeight = Math.max(diagram.canvas.height, contentHeight + 50)

  const nodesById = useMemo(() => {
    const m = new Map<string, PositionedRoadmapNode>()
    for (const n of positionedNodes) m.set(n.id, n)
    return m
  }, [positionedNodes])

  const edges = useMemo(() => {
    return diagram.edges.map((e) => {
      const fromN = nodesById.get(e.from)
      const toN = nodesById.get(e.to)
      if (!fromN || !toN) return null
      const from = anchorPoint(fromN, e.fromAnchor ?? 'right')
      const to = anchorPoint(toN, e.toAnchor ?? 'left')
      const connector = fromN.style?.border ?? fromN.style?.connector ?? '#666'
      return { id: e.id, from, to, connector, label: e.label ?? null }
    }).filter(Boolean) as any[]
  }, [diagram.edges, nodesById])

  const zoomAround = (nextScale: number, clientX: number, clientY: number) => {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top

    const worldX = (px - tx) / scale
    const worldY = (py - ty) / scale

    const clamped = Math.max(0.25, Math.min(4.0, nextScale))
    const nextTx = px - worldX * clamped
    const nextTy = py - worldY * clamped
    dispatch(setScale(clamped))
    dispatch(setTranslate({ tx: nextTx, ty: nextTy }))
  }

  const fit = () => {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    
    let minX = 0, minY = 0, maxX = diagram.canvas.width, maxY = contentHeight
    const contentW = Math.max(1, maxX - minX)
    const contentH = Math.max(1, maxY - minY)
    const targetScale = Math.max(0.25, Math.min(2.5, Math.min((rect.width - 100) / contentW, (rect.height - 100) / contentH)))
    
    dispatch(setScale(targetScale))
    dispatch(setTranslate({ tx: (rect.width - contentW * targetScale) / 2, ty: 50 }))
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
    reset: fit,
    fit,
  }), [dispatch, scale, contentHeight])

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
          dispatch(setTranslate({ tx: tx - e.deltaX, ty: ty - e.deltaY }))
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
          x: e.clientX, y: e.clientY, moved: false
        }

        let raf: number | null = null
        let currentTx = tx
        let currentTy = ty

        const onMove = (ev: PointerEvent) => {
          const dx = ev.clientX - lastPointerRef.current!.x
          const dy = ev.clientY - lastPointerRef.current!.y
          lastPointerRef.current = { x: ev.clientX, y: ev.clientY }
          currentTx += dx
          currentTy += dy

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
            const { personId, nodeId } = clickCandidateRef.current
            if (nodeId) onNodeClick?.(nodesById.get(nodeId)!)
            else if (personId) onPersonClick?.(peopleById.get(personId)!)
          }
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
      }}
    >
      {/* Bold Isometric dots background */}
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(circle at center, var(--color-text-secondary) 2px, transparent 2.5px),
            radial-gradient(circle at center, var(--color-text-secondary) 2px, transparent 2.5px)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: `${tx}px ${ty}px, ${tx + 20}px ${ty + 20}px`,
        }}
      />
      <div className="absolute left-0 top-0"
        style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: '0 0', width: diagram.canvas.width, height: docHeight }}
      >
        {/* Horizontal bold grids */}
        {Array.from({ length: maxLevel + 2 }).map((_, r) => (
          <div key={`h-grid-${r}`} className="pointer-events-none absolute left-0 h-[2.5px] bg-border z-0 shadow-sm" style={{ top: headerH + r * rowGap, width: diagram.canvas.width }} />
        ))}
        
        {/* Vertical bold grids */}
        {diagram.lanes.map((lane, idx) => (
          <div key={`v-grid-${lane.id}`} className="pointer-events-none absolute top-0 w-[2.5px] bg-border z-0 shadow-sm" style={{ left: idx * laneWidth, height: contentHeight }} />
        ))}
        {/* End vertical cap */}
        <div className="pointer-events-none absolute top-0 w-[2.5px] bg-border z-0 shadow-sm" style={{ left: diagram.lanes.length * laneWidth, height: contentHeight }} />

        <div className="absolute left-0 top-0 z-20" style={{ width: diagram.canvas.width, height: headerH }}>
          {diagram.lanes.map((lane, idx) => {
            const person = lane.personId ? peopleById.get(lane.personId) : undefined
            return (
              <div key={lane.id} data-person-id={person?.id ?? undefined}
                className="absolute top-0 flex items-center justify-between border-b-4 border-border bg-card px-4 py-3 text-left shadow-md"
                style={{ left: idx * laneWidth, width: laneWidth, height: headerH, borderRight: idx === diagram.lanes.length - 1 ? '2.5px solid var(--color-border)' : '2.5px solid var(--color-border)' }}
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

        <svg className="pointer-events-none absolute inset-0 z-0" width={diagram.canvas.width} height={docHeight}>
          {edges.map((e) => {
            const midX = (e.from.x + e.to.x) / 2
            const midY = (e.from.y + e.to.y) / 2
            return (
              <g key={e.id}>
                <path d={`M ${e.from.x} ${e.from.y} L ${midX} ${e.from.y} L ${midX} ${e.to.y} L ${e.to.x} ${e.to.y}`}
                  stroke={e.connector} strokeWidth={3} fill="none" strokeOpacity={0.8} strokeLinejoin="round" />
                <circle cx={e.to.x} cy={e.to.y} r={5} fill={e.connector} />
                {e.label && (
                  <text x={midX} y={midY - 10} textAnchor="middle" fontSize={13} fill="var(--color-text-primary)" fontWeight={700}>
                    {e.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        {positionedNodes.map((n) => <Node key={n.id} n={n} />)}
      </div>
      <MiniMap diagram={diagram} viewportRef={viewportRef} scale={scale} tx={tx} ty={ty} onJump={(next) => dispatch(setTranslate(next))} docHeight={docHeight} />
    </div>
  )
})

type MiniMapProps = {
  diagram: RoadmapDiagram
  docHeight: number
  viewportRef: React.RefObject<HTMLDivElement>
  scale: number
  tx: number
  ty: number
  onJump: (pos: { tx: number; ty: number }) => void
}

function MiniMap({ diagram, docHeight, viewportRef, scale, tx, ty, onJump }: MiniMapProps) {
  const miniWidth = 220
  const miniHeight = 160
  const s = Math.min(miniWidth / diagram.canvas.width, miniHeight / docHeight)
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
        style={{ width: diagram.canvas.width * s, height: docHeight * s, cursor: isDragging ? 'grabbing' : 'pointer' }}
        onPointerDown={(e) => { setIsDragging(true); e.currentTarget.setPointerCapture(e.pointerId); updateJump(e); }}
        onPointerMove={(e) => { if (isDragging) updateJump(e); }}
        onPointerUp={(e) => { setIsDragging(false); e.currentTarget.releasePointerCapture(e.pointerId); }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-primary/10" />
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