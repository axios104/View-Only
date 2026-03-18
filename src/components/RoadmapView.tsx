import { useEffect, useRef, useState } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setHandMode, setMagnifierMode } from '../store/canvasSlice'
import type { Person, RoadmapDiagram } from '../types/roadmap'
import { Modal } from './Modal'
import { ProcessCanvas, type ProcessCanvasApi } from './ProcessCanvas'
import { getRoadmapDiagram } from '../services/roadmapApi'

export function RoadmapView() {
  const dispatch = useAppDispatch()
  const canvasRef = useRef<ProcessCanvasApi | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  
  const { handMode, magnifierMode } = useAppSelector((s) => s.canvas)
  const [diagram, setDiagram] = useState<RoadmapDiagram | null>(null)

  useEffect(() => {
    let cancelled = false
    void getRoadmapDiagram().then((data) => {
      if (!cancelled) setDiagram(data)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (diagram) window.setTimeout(() => canvasRef.current?.fit(), 0)
  }, [diagram])

  return (
    <main className="flex h-full flex-col bg-[var(--color-bg-body)]">
      <section className="relative flex-1 flex-col">
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-lg border-2 border-border bg-card p-2 shadow-lg">
            <button
              type="button"
              onClick={() => dispatch(setHandMode(!handMode))}
              className={`grid size-9 place-items-center rounded-md border text-lg font-semibold transition-colors ${handMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-btn text-text-primary border-transparent'}`}
              aria-label="Hand Mode"
            >
              ✋
            </button>
            <button
              type="button"
              onClick={() => dispatch(setMagnifierMode(!magnifierMode))}
              className={`grid size-9 place-items-center rounded-md border text-lg font-semibold transition-colors ${magnifierMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-btn text-text-primary border-transparent'}`}
              aria-label="Magnifier"
            >
              🔍
            </button>
            <div className="w-[1px] h-6 bg-border mx-1" />
            <button
              type="button"
              onClick={() => canvasRef.current?.zoomOut()}
              className="grid size-9 place-items-center rounded-md border border-transparent bg-btn text-lg font-bold text-text-primary hover:bg-border"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => canvasRef.current?.reset()}
              className="grid size-9 place-items-center rounded-md border border-transparent bg-btn text-sm font-bold text-text-primary hover:bg-border px-3 w-auto"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => canvasRef.current?.zoomIn()}
              className="grid size-9 place-items-center rounded-md border border-transparent bg-btn text-lg font-bold text-text-primary hover:bg-border"
            >
              +
            </button>
          </div>

          {diagram ? (
            <ProcessCanvas
              ref={canvasRef}
              diagram={diagram}
              onPersonClick={(p) => setSelectedPerson(p)}
              onNodeClick={(n) => window.alert(`Clicked node: ${n.id}\nLane: ${n.laneId}\n\n${n.label}`)}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-text-primary/70">Loading…</div>
          )}
      </section>

      <Modal title={selectedPerson?.name ?? 'User details'} open={!!selectedPerson} onClose={() => setSelectedPerson(null)}>
        {selectedPerson && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-text-primary/70">Role</div><div className="col-span-2 font-semibold">{selectedPerson.role}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-text-primary/70">Email</div><div className="col-span-2 font-semibold">{selectedPerson.email}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-text-primary/70">Team</div><div className="col-span-2 font-semibold">{selectedPerson.team}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-text-primary/70">Location</div><div className="col-span-2 font-semibold">{selectedPerson.location}</div></div>
          </div>
        )}
      </Modal>
    </main>
  )
}