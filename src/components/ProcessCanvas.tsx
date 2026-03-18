import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { Anchor, Person, RoadmapDiagram, WorkType } from '../types/roadmap'
import { setHandMode, setScale, setTranslate } from '../store/canvasSlice'
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
  toggleHand: () => void
}

const workTypeClass: Record<WorkType, string> = {
  sap: 'bg-sap text-text-secondary',
  legacy: 'bg-legacy text-text-secondary',
  manual: 'bg-manual text-text-secondary',
  neutral: 'bg-node-neutral text-text-primary',
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
    case 'left':
      return { x: n.x, y: n.y + n.h / 2 }
    case 'right':
      return { x: n.x + n.w, y: n.y + n.h / 2 }
    case 'top':
      return { x: n.x + n.w / 2, y: n.y }
    case 'bottom':
      return { x: n.x + n.w / 2, y: n.y + n.h }
    case 'center':
    default:
      return { x: n.x + n.w / 2, y: n.y + n.h / 2 }
  }
}

function Node({ n }: { n: PositionedRoadmapNode }) {
  const base =
    'absolute grid select-none place-items-center text-center text-[11px] font-semibold leading-tight shadow-sm ring-1 ring-black/5 transition-[box-shadow,transform] duration-150 hover:shadow-md hover:ring-2 hover:ring-primary hover:brightness-105'

  const cls = [base, workTypeClass[n.workType]].join(' ')
  const fill = n.style?.fill ?? workTypeFill[n.workType]
  const text = n.style?.text ?? workTypeText[n.workType]
  const border = n.style?.border ?? 'color-mix(in srgb, black 10%, transparent)'

  if (n.shape === 'decision') {
    return (
      <div
        className={cls}
        data-node-id={n.id}
        role="button"
        tabIndex={0}
        style={{
          left: n.x,
          top: n.y,
          width: n.w,
          height: n.h,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          borderRadius: 2,
          backgroundColor: fill,
          color: text,
          border: `1px solid ${border}`,
        }}
      >
        <div style={{ width: '90%' }}>
          {n.label.split('\n').map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      </div>
    )
  }

  if (n.shape === 'arrow-right') {
    return (
      <div
        className={cls}
        data-node-id={n.id}
        role="button"
        tabIndex={0}
        style={{
          left: n.x,
          top: n.y,
          width: n.w,
          height: n.h,
          // Arrow pointing to the right, similar to the green steps on the reference UI.
          clipPath: 'polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%, 15% 50%)',
          backgroundColor: fill,
          color: text,
          border: `1px solid ${border}`,
        }}
      >
        <div style={{ width: '82%' }}>
          {n.label.split('\n').map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={[
        cls,
        'rounded-lg',
      ].join(' ')}
      data-node-id={n.id}
      role="button"
      tabIndex={0}
      style={{
        left: n.x,
        top: n.y,
          width: n.w,
          height: n.h,
        backgroundColor: fill,
        color: text,
        border: `1px solid ${border}`,
      }}
    >
      <div className="px-2.5">
        {n.label.split('\n').map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>
    </div>
  )
}

export const ProcessCanvas = forwardRef<ProcessCanvasApi, ProcessCanvasProps>(function ProcessCanvas(
  { diagram, className, onPersonClick, onNodeClick },
  ref,
) {
  const dispatch = useAppDispatch()
  const { scale, tx, ty, handMode } = useAppSelector((s) => s.canvas)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const clickCandidateRef = useRef<{
    personId: string | null
    nodeId: string | null
    x: number
    y: number
    moved: boolean
  }>({
    personId: null,
    nodeId: null,
    x: 0,
    y: 0,
    moved: false,
  })

  const peopleById = useMemo(() => {
    const m = new Map<string, Person>()
    diagram.people.forEach((p) => m.set(p.id, p))
    return m
  }, [diagram.people])

  const laneWidth = diagram.lanes.length > 0 ? diagram.canvas.width / diagram.lanes.length : diagram.canvas.width
  const headerH = 64

  const positionedNodes = useMemo(() => {
    // New model: x/y are derived, not stored.
    // We still clamp inside lane in the layout function via lane padding.
    return layoutRoadmapNodes(diagram, { laneWidth, headerH })
  }, [diagram, laneWidth])

  const nodesById = useMemo(() => {
    const m = new Map<string, PositionedRoadmapNode>()
    for (const n of positionedNodes) m.set(n.id, n)
    return m
  }, [positionedNodes])

  const edges = useMemo(() => {
    return diagram.edges
      .map((e) => {
        const fromN = nodesById.get(e.from)
        const toN = nodesById.get(e.to)
        if (!fromN || !toN) return null
        const from = anchorPoint(fromN, e.fromAnchor ?? 'right')
        const to = anchorPoint(toN, e.toAnchor ?? 'left')
        const connector = fromN.style?.connector ?? fromN.style?.fill ?? workTypeFill[fromN.workType]
        return { id: e.id, from, to, connector, label: e.label ?? null }
      })
      .filter(Boolean) as Array<{
      id: string
      from: { x: number; y: number }
      to: { x: number; y: number }
      connector: string
      label: string | null
    }>
  }, [diagram.edges, nodesById])

  const zoomAround = (nextScale: number, clientX: number, clientY: number) => {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top

    const worldX = (px - tx) / scale
    const worldY = (py - ty) / scale

    const clamped = Math.max(0.25, Math.min(2.5, nextScale))
    // Keep the graph anchored to the extreme-left unless the user pans with the hand tool.
    // We still preserve Y focus around the pointer to avoid "jumping" vertically.
    const nextTx = px - worldX * clamped
    const nextTy = py - worldY * clamped
    dispatch(setScale(clamped))
    dispatch(setTranslate({ tx: nextTx, ty: nextTy }))
  }

  const panBy = (dx: number, dy: number) => {
    dispatch(setTranslate({ tx: tx + dx, ty: ty + dy }))
  }

  const zoomAtViewportCenter = (nextScale: number) => {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const fallbackX = rect.left + rect.width / 2
    const fallbackY = rect.top + rect.height / 2
    const p = lastPointerRef.current ?? { x: fallbackX, y: fallbackY }
    zoomAround(nextScale, p.x, p.y)
  }

  const fit = () => {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    // No extra padding: align exactly to the (0,0) of the isometric sheet.
    const padding = 0
    // Always include lane header row + full lane width.
    let minX = 0
    let minY = 0
    let maxX = diagram.canvas.width
    let maxY = headerH
    for (const n of positionedNodes) {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + n.w)
      maxY = Math.max(maxY, n.y + n.h)
    }
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding

    const contentW = Math.max(1, maxX - minX)
    const contentH = Math.max(1, maxY - minY)
    const targetScale = Math.max(0.25, Math.min(2.5, Math.min(rect.width / contentW, rect.height / contentH)))
    // Anchor to exact top-left (0,0) of the sheet.
    const nextTx = 0
    const nextTy = 0
    dispatch(setScale(targetScale))
    dispatch(setTranslate({ tx: nextTx, ty: nextTy }))
  }

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => zoomAtViewportCenter(scale * 1.12),
      zoomOut: () => zoomAtViewportCenter(scale * 0.88),
      reset: fit,
      fit,
      toggleHand: () => dispatch(setHandMode(!handMode)),
    }),
    [dispatch, handMode, scale],
  )

  return (
    <div
      ref={viewportRef}
      className={[
        'relative h-full w-full overflow-hidden bg-[var(--color-bg-body)]',
        handMode ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
        className ?? '',
      ].join(' ')}
      style={{ touchAction: 'none' }}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          const delta = -e.deltaY
          const factor = delta > 0 ? 1.08 : 0.92
          zoomAround(scale * factor, e.clientX, e.clientY)
          return
        }
        // Trackpad/wheel pan
        panBy(-e.deltaX, -e.deltaY)
      }}
      onPointerDown={(e) => {
        const isMiddle = e.button === 1
        if (!handMode && !isMiddle) return
        lastPointerRef.current = { x: e.clientX, y: e.clientY }
        setDragging(true)

        const el = e.target instanceof Element ? e.target : null
        const nodeId = el?.closest('[data-node-id]')?.getAttribute('data-node-id') ?? null
        const personId = el?.closest('[data-person-id]')?.getAttribute('data-person-id') ?? null
        clickCandidateRef.current = { personId, nodeId, x: e.clientX, y: e.clientY, moved: false }

        e.currentTarget.setPointerCapture(e.pointerId)
        const startX = e.clientX
        const startY = e.clientY
        const startTx = tx
        const startTy = ty

        let raf: number | null = null
        let latestX = startX
        let latestY = startY

        const flush = () => {
          raf = null
          dispatch(
            setTranslate({
              tx: startTx + (latestX - startX),
              ty: startTy + (latestY - startY),
            }),
          )
        }

        const onMove = (ev: PointerEvent) => {
          lastPointerRef.current = { x: ev.clientX, y: ev.clientY }
          latestX = ev.clientX
          latestY = ev.clientY
          const dx = latestX - clickCandidateRef.current.x
          const dy = latestY - clickCandidateRef.current.y
          if (!clickCandidateRef.current.moved && dx * dx + dy * dy > 16) {
            clickCandidateRef.current.moved = true
          }
          if (raf == null) raf = window.requestAnimationFrame(flush)
        }
        const onUp = (ev: PointerEvent) => {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
          window.removeEventListener('pointercancel', onUp)
          if (raf != null) {
            window.cancelAnimationFrame(raf)
            raf = null
          }
          setDragging(false)
          try {
            e.currentTarget.releasePointerCapture(e.pointerId)
          } catch {
            // ignore
          }
          if (ev.type === 'pointerup') {
            const { personId, nodeId, moved } = clickCandidateRef.current
            if (!moved && nodeId) {
              const node = nodesById.get(nodeId)
              if (node) onNodeClick?.(node)
            } else if (!moved && personId) {
              const person = peopleById.get(personId)
              if (person) onPersonClick?.(person)
            }
          }
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
      }}
    >
      {/* grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            // Isometric (triangular) dot lattice
            'radial-gradient(circle, color-mix(in srgb, var(--color-border) 95%, transparent) 1.25px, transparent 1.35px)',
            'radial-gradient(circle, color-mix(in srgb, var(--color-border) 70%, transparent) 1.1px, transparent 1.2px)',
          ].join(','),
          // 18px spacing, 18*sqrt(3)/2 ≈ 15.588px vertical spacing
          backgroundSize: '18px 15.588px, 18px 15.588px',
          // Second layer offset by half-step to create the triangular lattice
          backgroundPosition: `${tx}px ${ty}px, ${tx + 9}px ${ty + 7.794}px`,
        }}
      />

      {/* content */}
      <div
        className="absolute left-0 top-0"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: '0 0',
          width: diagram.canvas.width,
          height: diagram.canvas.height,
        }}
      >
        {/* lane headers (part of zoom/pan) */}
        <div className="absolute left-0 top-0" style={{ width: diagram.canvas.width, height: headerH }}>
          {diagram.lanes.map((lane, idx) => {
            const person = lane.personId ? peopleById.get(lane.personId) : undefined
            return (
              <div
                key={lane.id}
                data-person-id={person?.id ?? undefined}
                className="absolute top-0 flex items-center justify-between border-b border-border bg-card px-4 py-3 text-left hover:bg-[color-mix(in_srgb,var(--color-bg-card)_85%,var(--color-primary)_15%)]"
                style={{
                  left: idx * laneWidth,
                  width: laneWidth,
                  height: headerH,
                  borderRight: idx === diagram.lanes.length - 1 ? 'none' : '1px solid var(--color-border)',
                }}
                role="button"
                tabIndex={0}
                aria-label={person ? `Open details for ${person.name}` : 'Lane (no approver)'}
              >
                <div>
                  <div className="text-xs text-text-primary/70">{lane.title}</div>
                  <div className="mt-1 text-sm font-semibold text-primary">{person?.name ?? '—'}</div>
                </div>
                <Avatar name={person?.name ?? '—'} />
              </div>
            )
          })}
        </div>

        {/* lane dividers */}
        {diagram.lanes.map((lane, idx) => {
          if (idx === 0) return null
          return (
            <div
              key={lane.id}
              className="pointer-events-none absolute top-0 bg-border"
              style={{
                left: idx * laneWidth,
                width: 1,
                height: diagram.canvas.height,
                backgroundColor: 'color-mix(in srgb, var(--color-border) 85%, var(--color-text-primary) 15%)',
              }}
            />
          )
        })}

        <svg
          className="pointer-events-none absolute inset-0"
          width={diagram.canvas.width}
          height={diagram.canvas.height}
          viewBox={`0 0 ${diagram.canvas.width} ${diagram.canvas.height}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {edges.map((e) => {
            const stroke = e.connector
            // Orthogonal connector: horizontal -> vertical -> horizontal
            const midX = (e.from.x + e.to.x) / 2
            const midY = (e.from.y + e.to.y) / 2
            const hasLabel = !!e.label
            return (
              <g key={e.id}>
                <path
                  d={`M ${e.from.x} ${e.from.y} L ${midX} ${e.from.y} L ${midX} ${e.to.y} L ${e.to.x} ${e.to.y}`}
                  stroke={stroke}
                  strokeOpacity={0.38}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <circle
                  cx={e.from.x}
                  cy={e.from.y}
                  r={3.2}
                  fill={stroke}
                  fillOpacity={0.55}
                />
                <circle
                  cx={e.to.x}
                  cy={e.to.y}
                  r={3.2}
                  fill={stroke}
                  fillOpacity={0.55}
                />
                {hasLabel ? (
                  <text
                    x={midX}
                    y={midY - 6}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--color-text-primary)"
                  >
                    {e.label}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>

        {positionedNodes.map((n) => (
          <Node key={n.id} n={n} />
        ))}
      </div>

      {/* overlay controls (used by parent too) */}
      <div className="pointer-events-none absolute inset-0" />

      <MiniMap
        diagram={diagram}
        viewportRef={viewportRef}
        scale={scale}
        tx={tx}
        ty={ty}
        onJump={(next) => dispatch(setTranslate(next))}
      />
    </div>
  )
})

type MiniMapProps = {
  diagram: RoadmapDiagram
  viewportRef: React.RefObject<HTMLDivElement>
  scale: number
  tx: number
  ty: number
  onJump: (pos: { tx: number; ty: number }) => void
}

function MiniMap({ diagram, viewportRef, scale, tx, ty, onJump }: MiniMapProps) {
  const miniWidth = 180
  const miniHeight = 120
  const canvasW = diagram.canvas.width
  const canvasH = diagram.canvas.height
  const s = Math.min(miniWidth / canvasW, miniHeight / canvasH)

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const worldX = mx / s
    const worldY = my / s

    const viewport = viewportRef.current
    if (!viewport) return
    const vRect = viewport.getBoundingClientRect()
    const centerX = vRect.width / 2
    const centerY = vRect.height / 2

    const nextTx = centerX - worldX * scale
    const nextTy = centerY - worldY * scale
    onJump({ tx: nextTx, ty: nextTy })
  }

  const viewport = viewportRef.current
  let viewRect = { x: 0, y: 0, w: 0, h: 0 }
  if (viewport) {
    const vRect = viewport.getBoundingClientRect()
    const worldX0 = -tx / scale
    const worldY0 = -ty / scale
    const worldW = vRect.width / scale
    const worldH = vRect.height / scale
    viewRect = {
      x: worldX0 * s,
      y: worldY0 * s,
      w: worldW * s,
      h: worldH * s,
    }
  }

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 rounded-md border border-border bg-card/95 p-2 shadow-sm">
      <div
        className="relative overflow-hidden rounded-sm bg-[var(--color-bg-body)]"
        style={{ width: miniWidth, height: miniHeight, cursor: 'pointer' }}
        onClick={handleClick}
      >
        <div
          className="absolute left-0 top-0 border border-border/70 bg-border/10"
          style={{ width: canvasW * s, height: canvasH * s }}
        />
        <div
          className="absolute border border-primary/80 bg-primary/10"
          style={{
            left: viewRect.x,
            top: viewRect.y,
            width: viewRect.w,
            height: viewRect.h,
          }}
        />
      </div>
    </div>
  )
}


