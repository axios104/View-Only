import { useEffect, useRef, useState } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setHandMode, setMagnifierMode } from '../store/canvasSlice'
import { fetchDiagram } from '../store/diagramSlice'
import { getNodeDetails } from '../services/roadmapApi'
import type { Person, Lane, NodeDetails } from '../types/roadmap'
import { Modal } from './Modal'
import { ProcessCanvas, type ProcessCanvasApi } from './ProcessCanvas'
import type { PositionedRoadmapNode } from '../layout/layoutRoadmap'

export function RoadmapView() {
  const dispatch = useAppDispatch()
  const canvasRef = useRef<ProcessCanvasApi | null>(null)

  // Modals state
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [selectedNode, setSelectedNode] = useState<PositionedRoadmapNode | null>(null)
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<NodeDetails | null>(null)
  const [nodeDetailsLoading, setNodeDetailsLoading] = useState(false)
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null)

  const { handMode, magnifierMode } = useAppSelector((s) => s.canvas)
  const { data: diagram, loading, error } = useAppSelector((s) => s.diagram)

  useEffect(() => {
    dispatch(fetchDiagram())
  }, [dispatch])

  useEffect(() => {
    if (diagram) window.setTimeout(() => canvasRef.current?.reset(), 0)
  }, [diagram])

  // Fetch node details when a node is clicked
  const handleNodeClick = async (node: PositionedRoadmapNode) => {
    setSelectedNode(node)
    setNodeDetailsLoading(true)
    try {
      const details = await getNodeDetails(node.id)
      setSelectedNodeDetails(details)
    } catch (err) {
      console.error('Failed to fetch node details:', err)
      setSelectedNodeDetails(null)
    } finally {
      setNodeDetailsLoading(false)
    }
  }

  const closeNodeModal = () => {
    setSelectedNode(null)
    setSelectedNodeDetails(null)
  }

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
          <button
            type="button"
            onClick={() => dispatch(fetchDiagram())}
            disabled={loading}
            className="grid size-7 place-items-center rounded-sm border border-transparent bg-btn text-base font-bold text-text-primary hover:bg-border disabled:opacity-50"
            aria-label="Refresh"
            title="Refresh Diagram"
          >
            🔄
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
            onNodeClick={handleNodeClick}
            onLaneClick={(l) => setSelectedLane(l)}
          />
        ) : loading ? (
          <div className="grid h-full place-items-center text-sm text-text-primary/70">Loading…</div>
        ) : error ? (
          <div className="grid h-full place-items-center">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-6 py-5 text-sm text-red-600">
              <div className="font-semibold">Error loading diagram</div>
              <div className="mt-1">{error}</div>
              <button
                onClick={() => dispatch(fetchDiagram())}
                className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center text-sm text-text-primary/70">No diagram available</div>
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
      <Modal title="Process Step Details" open={!!selectedNode} onClose={closeNodeModal}>
        {nodeDetailsLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="text-sm text-text-primary/70">Loading node details…</div>
          </div>
        ) : selectedNodeDetails ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-text-primary/70">Node ID</div>
              <div className="col-span-2 font-semibold text-sm">{selectedNodeDetails.NodeID}</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-text-primary/70">Type</div>
              <div className="col-span-2">
                <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold uppercase">
                  {selectedNodeDetails.Type}
                </span>
              </div>
            </div>
            {selectedNodeDetails.Description && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                <div className="text-xs text-text-primary/70">Description</div>
                <div className="col-span-2 text-sm text-text-primary/80 whitespace-pre-wrap">
                  {selectedNodeDetails.Description}
                </div>
              </div>
            )}
            <div className="pt-2 border-t border-border space-y-2">
              {selectedNodeDetails.CreateDate && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-text-primary/70">Created</div>
                  <div className="col-span-2 font-medium">{selectedNodeDetails.CreateDate}</div>
                </div>
              )}
              {selectedNodeDetails.ChangeDate && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-text-primary/70">Changed</div>
                  <div className="col-span-2 font-medium">{selectedNodeDetails.ChangeDate}</div>
                </div>
              )}
              {selectedNodeDetails.CreatePerson && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-text-primary/70">Created By</div>
                  <div className="col-span-2 font-medium">{selectedNodeDetails.CreatePerson}</div>
                </div>
              )}
              {selectedNodeDetails.ChangePerson && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-text-primary/70">Changed By</div>
                  <div className="col-span-2 font-medium">{selectedNodeDetails.ChangePerson}</div>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-border space-y-2">
              {selectedNodeDetails.TCode && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-text-primary/70">T-Code</div>
                  <div className="col-span-2 font-medium text-primary">{selectedNodeDetails.TCode}</div>
                </div>
              )}
              {selectedNodeDetails.Manual && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-text-primary/70">Manual</div>
                  <div className="col-span-2">
                    <a href={selectedNodeDetails.Manual} target="_blank" rel="noreferrer" className="text-primary underline hover:text-primary/80">
                      View Manual
                    </a>
                  </div>
                </div>
              )}
              {selectedNodeDetails.Output && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-text-primary/70">Output</div>
                  <div className="col-span-2 font-medium">{selectedNodeDetails.Output}</div>
                </div>
              )}
            </div>
          </div>
        ) : selectedNode ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-text-primary/70">ID</div>
              <div className="col-span-2 font-semibold text-sm">{selectedNode.id}</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-text-primary/70">Label</div>
              <div className="col-span-2 font-semibold whitespace-pre-wrap">{selectedNode.label}</div>
            </div>
            <div className="text-xs text-text-primary/70 pt-2">
              <em>Detailed information not available</em>
            </div>
          </div>
        ) : null}
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