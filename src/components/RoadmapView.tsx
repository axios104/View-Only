import { useEffect, useRef, useState } from 'react'
import { useAppSelector } from '../store/hooks'
import type { Person, RoadmapDiagram } from '../types/roadmap'
import { Modal } from './Modal'
import { ProcessCanvas, type ProcessCanvasApi } from './ProcessCanvas'
import { getRoadmapDiagram } from '../services/roadmapApi'

export function RoadmapView() {
  const canvasRef = useRef<ProcessCanvasApi | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const handMode = useAppSelector((s) => s.canvas.handMode)

  const [diagram, setDiagram] = useState<RoadmapDiagram | null>(null)

  useEffect(() => {
    let cancelled = false
    void getRoadmapDiagram().then((data) => {
      if (!cancelled) setDiagram(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!diagram) return
    // Fit once diagram is present (and after it mounts).
    const id = window.setTimeout(() => canvasRef.current?.fit(), 0)
    return () => window.clearTimeout(id)
  }, [diagram])

  useEffect(() => {
    const onResize = () => canvasRef.current?.fit()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <main className="flex h-full flex-col bg-[var(--color-bg-body)]">
      <section className="flex flex-1 flex-col">
        <div className="relative flex-1">
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => canvasRef.current?.toggleHand()}
              className={[
                'grid size-8 place-items-center rounded-md border border-border text-sm font-semibold shadow-sm',
                handMode ? 'bg-primary text-primary-foreground' : 'bg-btn text-text-primary',
              ].join(' ')}
              aria-label="Hand tool"
            >
              ✋
            </button>
            <button
              type="button"
              onClick={() => canvasRef.current?.reset()}
              className="grid size-8 place-items-center rounded-md border border-border bg-btn text-sm font-semibold text-text-primary shadow-sm"
              aria-label="Reset"
            >
              ↺
            </button>
            <button
              type="button"
              onClick={() => canvasRef.current?.zoomIn()}
              className="grid size-8 place-items-center rounded-md border border-border bg-btn text-sm font-semibold text-text-primary shadow-sm"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => canvasRef.current?.zoomOut()}
              className="grid size-8 place-items-center rounded-md border border-border bg-btn text-sm font-semibold text-text-primary shadow-sm"
              aria-label="Zoom out"
            >
              −
            </button>
          </div>

          {diagram ? (
            <ProcessCanvas
              ref={canvasRef}
              diagram={diagram}
              onPersonClick={(p) => setSelectedPerson(p)}
              onNodeClick={(n) => {
                window.alert(`Clicked node: ${n.id}\nLane: ${n.laneId}\n\n${n.label}`)
              }}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-text-primary/70">
              Loading…
            </div>
          )}
        </div>
      </section>

      <Modal
        title={selectedPerson ? selectedPerson.name : 'User details'}
        open={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
      >
        {selectedPerson ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-text-primary/70">Role</div>
              <div className="col-span-2 font-semibold">{selectedPerson.role}</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-text-primary/70">Email</div>
              <div className="col-span-2 font-semibold">{selectedPerson.email}</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-text-primary/70">Team</div>
              <div className="col-span-2 font-semibold">{selectedPerson.team}</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-text-primary/70">Location</div>
              <div className="col-span-2 font-semibold">{selectedPerson.location}</div>
            </div>
          </div>
        ) : null}
      </Modal>
    </main>
  )
}

