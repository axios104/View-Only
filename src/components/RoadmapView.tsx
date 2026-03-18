import { useEffect, useRef, useState } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setHandMode, setMagnifierMode } from '../store/canvasSlice'
import type { Person, RoadmapDiagram, Lane } from '../types/roadmap'
import { Modal } from './Modal'
import { ProcessCanvas, type ProcessCanvasApi } from './ProcessCanvas'
import { getRoadmapDiagram } from '../services/roadmapApi'
import type { PositionedRoadmapNode } from '../layout/layoutRoadmap'

export function RoadmapView() {
  const dispatch = useAppDispatch()
  const canvasRef = useRef<ProcessCanvasApi | null>(null)
  
  // Modals state
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [selectedNode, setSelectedNode] = useState<PositionedRoadmapNode | null>(null)
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null)
  
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
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1 rounded-md border border-border bg-card p-1 shadow-md">
            <button
              type="button"
              onClick={() => dispatch(setHandMode(!handMode))}
              className={`grid size-7 place-items-center rounded-sm border text-sm font-semibold transition-colors ${handMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-btn text-text-primary border-transparent'}`}
              aria-label="Hand Mode"
              title="Pan Tool"
            >
              ✋
            </button>
            <button
              type="button"
              onClick={() => dispatch(setMagnifierMode(!magnifierMode))}
              className={`grid size-7 place-items-center rounded-sm border text-sm font-semibold transition-colors ${magnifierMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-btn text-text-primary border-transparent'}`}
              aria-label="Magnifier"
              title="Zoom Tool"
            >
              🔍
            </button>
            <div className="w-[1px] h-5 bg-border mx-1" />
            <button
              type="button"
              onClick={() => canvasRef.current?.zoomOut()}
              className="grid size-7 place-items-center rounded-sm border border-transparent bg-btn text-base font-bold text-text-primary hover:bg-border"
              title="Zoom Out"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => canvasRef.current?.reset()}
              className="grid h-7 place-items-center rounded-sm border border-transparent bg-btn text-xs font-bold text-text-primary hover:bg-border px-2 w-auto"
              title="Reset View"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => canvasRef.current?.zoomIn()}
              className="grid size-7 place-items-center rounded-sm border border-transparent bg-btn text-base font-bold text-text-primary hover:bg-border"
              title="Zoom In"
            >
              +
            </button>
          </div>

          {diagram ? (
            <ProcessCanvas
              ref={canvasRef}
              diagram={diagram}
              onPersonClick={(p) => setSelectedPerson(p)}
              onNodeClick={(n) => setSelectedNode(n)}
              onLaneClick={(l) => setSelectedLane(l)}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-text-primary/70">Loading…</div>
          )}
      </section>

      {/* User / Person Modal */}
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

      {/* Node Component Modal */}
      <Modal title="Process Step Details" open={!!selectedNode} onClose={() => setSelectedNode(null)}>
        {selectedNode && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-text-primary/70">Label</div><div className="col-span-2 font-semibold whitespace-pre-wrap">{selectedNode.label}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-text-primary/70">ID</div><div className="col-span-2 font-semibold text-sm">{selectedNode.id}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-text-primary/70">Type</div><div className="col-span-2 font-semibold uppercase text-xs">{selectedNode.workType}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-text-primary/70">Shape</div><div className="col-span-2 font-semibold capitalize text-xs">{selectedNode.shape}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-text-primary/70">Status</div><div className="col-span-2 font-semibold text-green-600 text-sm">Active</div></div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border"><div className="text-xs text-text-primary/70">Description</div><div className="col-span-2 text-sm text-text-primary/80">This process component executes required business logic for the {selectedNode.workType} system. Mock data populated successfully.</div></div>
          </div>
        )}
      </Modal>

      {/* Lane / Grid Header Modal */}
      <Modal title="Lane Details" open={!!selectedLane} onClose={() => setSelectedLane(null)}>
        {selectedLane && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-text-primary/70">Name</div><div className="col-span-2 font-semibold">{selectedLane.title}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-text-primary/70">Lane ID</div><div className="col-span-2 font-semibold text-sm">{selectedLane.id}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-text-primary/70">Assigned To</div><div className="col-span-2 font-semibold">{selectedLane.personId || 'Unassigned'}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-text-primary/70">Department</div><div className="col-span-2 font-semibold text-sm text-text-primary/80">General Operations</div></div>
          </div>
        )}
      </Modal>
    </main>
  )
}