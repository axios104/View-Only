import { useEffect, useRef, useState } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setHandMode, setMagnifierMode, setMode, setSelectedEditNodeId, setSelectedEditEdgeId, setPendingAddType } from '../store/canvasSlice'
import { fetchDiagram, addNode, removeNode, removeEdge, updateNodeStyle, updateNodeLabel, undo, redo } from '../store/diagramSlice'
import { getNodeDetails, saveRoadmapDiagram } from '../services/roadmapApi'
import type { Person, Lane, NodeDetails, RoadmapDiagram } from '../types/roadmap'
import { Modal } from './Modal'
import { ProcessCanvas, type ProcessCanvasApi } from './ProcessCanvas'
import { layoutRoadmapNodes, type PositionedRoadmapNode } from '../layout/layoutRoadmap'
import { Eye, Edit2, Hand, Search, RefreshCw, Save, Trash2, Maximize, Minus, Plus } from 'lucide-react'

export function RoadmapView() {
  const dispatch = useAppDispatch()
  const canvasRef = useRef<ProcessCanvasApi | null>(null)

  // Modals state
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [selectedNode, setSelectedNode] = useState<PositionedRoadmapNode | null>(null)
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<NodeDetails | null>(null)
  const [nodeDetailsLoading, setNodeDetailsLoading] = useState(false)
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null)

  const { handMode, magnifierMode, mode, selectedEditNodeId, selectedEditEdgeId, pendingAddType } = useAppSelector((s) => s.canvas)
  const { data: diagram, loading, error } = useAppSelector((s) => s.diagram)

  const isAdmin = diagram?.userRole !== 'user';

  useEffect(() => {
    dispatch(fetchDiagram())
  }, [dispatch])

  // Removed the auto-reset on diagram change that forced scale to 1 and tx/ty to 0.

  // Fetch node details when a node is clicked
  const handleNodeClick = async (node: PositionedRoadmapNode) => {
    if (mode === 'edit') {
      dispatch(setSelectedEditNodeId(node.id))
      return
    }

    if (mode === 'none') return;


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

  const handleSave = async () => {
    if (diagram) {
      const diagramWidth = diagram.canvas?.width || 2000
      const laneWidth = diagram.lanes.length > 0 ? diagramWidth / diagram.lanes.length : diagramWidth
      const layoutNodes = layoutRoadmapNodes(diagram, { laneWidth, headerH: 64, rowGap: 90 })
      
      const updatedNodes = diagram.nodes.map(n => {
        const layoutNode = layoutNodes.find(ln => ln.id === n.id)
        if (layoutNode && (n.posX === undefined || n.posY === undefined)) {
          return { ...n, posX: layoutNode.x, posY: layoutNode.y }
        }
        return n
      })

      const approvedDiagram: RoadmapDiagram = { ...diagram, nodes: updatedNodes, isApproved: true }
      await saveRoadmapDiagram(approvedDiagram)
      dispatch(fetchDiagram())
      alert('Diagram saved successfully!')
    }
  }

  const handleBackgroundClick = (worldX: number, worldY: number) => {
    if (mode === 'edit' && pendingAddType) {
      if (!diagram || diagram.lanes.length === 0) return
      
      const headerH = 64
      const rowGap = 90
      const diagramWidth = diagram.canvas?.width || 2000
      const laneWidth = diagramWidth / Math.max(1, diagram.lanes.length)
      
      const laneIdx = Math.max(0, Math.min(diagram.lanes.length - 1, Math.floor(worldX / laneWidth)))
      const laneId = diagram.lanes[laneIdx].id
      
      const level = Math.max(0, Math.round((worldY - headerH) / rowGap))
      
      const id = `new-node-${Date.now()}`
      dispatch(addNode({ 
        node: { 
          id, 
          title: 'New Node', 
          type: pendingAddType as any, 
          laneId, 
          level,
          label: 'New Node'
        } 
      }))
      dispatch(setPendingAddType(null))
      dispatch(setSelectedEditNodeId(id))
    } else if (mode === 'edit') {
      dispatch(setSelectedEditNodeId(null))
    }
  }

  const handleDeleteNode = () => {
    if (selectedEditNodeId) {
      dispatch(removeNode(selectedEditNodeId))
      dispatch(setSelectedEditNodeId(null))
    } else if (selectedEditEdgeId) {
      dispatch(removeEdge(selectedEditEdgeId))
      dispatch(setSelectedEditEdgeId(null))
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch(undo());
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch(redo());
        return;
      }

      // Deletion
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedEditNodeId || selectedEditEdgeId) {
          e.preventDefault();
          handleDeleteNode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, selectedEditNodeId, selectedEditEdgeId]);


  return (
    <main className="flex h-full flex-col bg-[var(--color-bg-body)]">
      <section className="relative flex-1 flex-col">
        {diagram && (
          <div className="absolute right-8 top-6 z-20 flex items-center gap-2 pointer-events-none">
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold border shadow-md flex items-center gap-1.5 backdrop-blur-sm ${diagram.isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-amber-50 text-amber-700 border-amber-200/60'}`}>
              <span className="text-base leading-none">{diagram.isApproved ? '✓' : '⚠️'}</span>
              {diagram.isApproved ? 'Admin Approved' : 'Not Approved (Excel)'}
            </div>
          </div>
        )}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-bg-card)]/90 backdrop-blur-md p-2 shadow-sm w-12">
          {/* Mode Toggles */}
          <button
            type="button"
            onClick={() => { dispatch(setMode('view')); dispatch(setSelectedEditNodeId(null)); }}
            className={`grid size-8 place-items-center rounded-full text-sm transition-colors ${mode === 'view' ? 'bg-primary text-primary-foreground' : 'text-text-primary hover:bg-btn'}`}
            title="View Mode"
          >
            <Eye size={18} />
          </button>
          
          {isAdmin && (
            <button
              type="button"
              onClick={() => dispatch(setMode('edit'))}
              className={`grid size-8 place-items-center rounded-full text-sm transition-colors ${mode === 'edit' ? 'bg-primary text-primary-foreground' : 'text-text-primary hover:bg-btn'}`}
              title="Edit Mode"
            >
              <Edit2 size={16} />
            </button>
          )}

          <div className="h-[1px] w-6 bg-border my-[2px]" />

          {/* Contextual Tools based on Mode */}
          {mode === 'edit' ? (
            <>
              <button
                onClick={() => dispatch(setPendingAddType(pendingAddType === 'process' ? null : 'process'))}
                className={`grid size-8 place-items-center rounded-md border text-[#2c3e50] hover:border-border hover:bg-btn ${pendingAddType === 'process' ? 'border-border bg-btn text-[var(--color-primary)]' : 'border-transparent'}`}
                title="Add Process Node"
              >
                <div className="w-[18px] h-[14px] border-[2px] border-current rounded-sm"></div>
              </button>
              <button
                onClick={() => dispatch(setPendingAddType(pendingAddType === 'decision' ? null : 'decision'))}
                className={`grid size-8 place-items-center rounded-md border text-[#2c3e50] hover:border-border hover:bg-btn ${pendingAddType === 'decision' ? 'border-border bg-btn text-[var(--color-primary)]' : 'border-transparent'}`}
                title="Add Decision Node"
              >
                <div className="w-[14px] h-[14px] border-[2px] border-current transform rotate-45"></div>
              </button>
              <button
                onClick={() => dispatch(setPendingAddType(pendingAddType === 'terminator' ? null : 'terminator'))}
                className={`grid size-8 place-items-center rounded-md border text-[#2c3e50] hover:border-border hover:bg-btn ${pendingAddType === 'terminator' ? 'border-border bg-btn text-[var(--color-primary)]' : 'border-transparent'}`}
                title="Add Terminator Node"
              >
                <div className="w-[18px] h-[10px] border-[2px] border-current rounded-[10px]"></div>
              </button>
              <div className="h-[1px] w-6 bg-border my-[2px]" />
              <button
                onClick={handleDeleteNode}
                disabled={!selectedEditNodeId && !selectedEditEdgeId}
                className="grid size-8 place-items-center rounded-md border border-transparent text-red-500 hover:border-red-100 hover:bg-red-50 disabled:opacity-40"
                title="Delete Selected"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={handleSave}
                className="grid size-8 place-items-center rounded-md border border-transparent text-[#2c3e50] hover:border-border hover:bg-btn"
                title="Save Diagram"
              >
                <Save size={18} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => dispatch(setHandMode(!handMode))}
                className={`grid size-8 place-items-center rounded-md border transition-colors ${handMode ? 'border-border bg-btn text-[var(--color-primary)]' : 'border-transparent text-[#2c3e50] hover:border-border hover:bg-btn'}`}
                title="Pan Tool"
              >
                <Hand size={18} />
              </button>
              <button
                type="button"
                onClick={() => dispatch(setMagnifierMode(!magnifierMode))}
                className={`grid size-8 place-items-center rounded-md border transition-colors ${magnifierMode ? 'border-border bg-btn text-[var(--color-primary)]' : 'border-transparent text-[#2c3e50] hover:border-border hover:bg-btn'}`}
                title="Zoom Tool"
              >
                <Search size={18} />
              </button>
              <button
                type="button"
                onClick={() => dispatch(fetchDiagram())}
                disabled={loading}
                className="grid size-8 place-items-center rounded-md border border-transparent text-[#2c3e50] hover:border-border hover:bg-btn disabled:opacity-50"
                title="Refresh Diagram"
              >
                <RefreshCw size={18} />
              </button>
            </>
          )}

          <div className="h-[1px] w-6 bg-border my-[2px]" />
          
          {/* Universal Zoom Controls */}
          <button
            onClick={() => canvasRef.current?.zoomOut()}
            className="grid size-8 place-items-center rounded-md border border-transparent text-[#2c3e50] hover:border-border hover:bg-btn"
            title="Zoom Out"
          >
            <Minus size={18} />
          </button>
          <button
            onClick={() => canvasRef.current?.reset()}
            className="grid size-8 place-items-center rounded-md border border-transparent text-[#2c3e50] hover:border-border hover:bg-btn"
            title="Fit Screen"
          >
            <Maximize size={16} />
          </button>
          <button
            onClick={() => canvasRef.current?.zoomIn()}
            className="grid size-8 place-items-center rounded-md border border-transparent text-[#2c3e50] hover:border-border hover:bg-btn"
            title="Zoom In"
          >
            <Plus size={18} />
          </button>
        </div>

        {mode === 'edit' && selectedEditNodeId && diagram?.nodes.find(n => n.id === selectedEditNodeId) && (() => {
              const nd = diagram.nodes.find(n => n.id === selectedEditNodeId)!;
              return (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-md border border-border bg-card p-2 shadow-md">
                  <span className="text-xs font-semibold text-text-primary px-1">Editing:</span>
                  <input 
                    type="text" 
                    value={nd.label || ''} 
                    onChange={(e) => dispatch(updateNodeLabel({ id: selectedEditNodeId, label: e.target.value }))}
                    className="text-xs border border-border bg-[var(--color-bg-body)] text-text-primary rounded px-2 py-1 w-40"
                    placeholder="Node Label"
                  />
                  <select 
                    className="text-xs border border-border bg-[var(--color-bg-body)] text-text-primary rounded px-2 py-1"
                    value={nd.type}
                    onChange={(e) => dispatch(updateNodeStyle({ id: selectedEditNodeId, type: e.target.value as any }))}
                  >
                    <option value="">Change Type...</option>
                    <option value="process">Process (Blue)</option>
                    <option value="process-red">Manual (Red)</option>
                    <option value="process-purple">Legacy (Purple)</option>
                    <option value="decision">Decision</option>
                    <option value="data">Data</option>
                    <option value="terminator">Terminator</option>
                  </select>
                </div>
              )
            })()}

        {diagram ? (
          <ProcessCanvas
            ref={canvasRef}
            diagram={diagram}
            onPersonClick={(p) => setSelectedPerson(p)}
            onNodeClick={handleNodeClick}
            onLaneClick={(l) => setSelectedLane(l)}
            onBackgroundClick={handleBackgroundClick}
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