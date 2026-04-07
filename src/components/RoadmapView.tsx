import { useEffect, useRef, useState } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setHandMode, setMagnifierMode, setMode, setSelectedEditNodeId, setSelectedEditEdgeId } from '../store/canvasSlice'
import { fetchDiagram, addNode, removeNode, removeEdge, updateNodeLabel, undo, redo, addLane, removeLane, updateLane, updateNodeInfo } from '../store/diagramSlice'
import { getNodeDetails, saveRoadmapDiagram } from '../services/roadmapApi'
import type { Person, Lane, NodeDetails, RoadmapDiagram } from '../types/roadmap'
import { Modal } from './Modal'
import { ProcessCanvas, type ProcessCanvasApi } from './ProcessCanvas'
import { layoutRoadmapNodes, type PositionedRoadmapNode } from '../layout/layoutRoadmap'
import { Eye, Edit2, Hand, Search, RefreshCw, Save, Trash2, Maximize, Minus, Plus, Columns, FileText, Database } from 'lucide-react'

export function RoadmapView() {
  const dispatch = useAppDispatch()
  const canvasRef = useRef<ProcessCanvasApi | null>(null)

  // Modals state
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [selectedNode, setSelectedNode] = useState<PositionedRoadmapNode | null>(null)
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<NodeDetails | null>(null)
  const [nodeDetailsLoading, setNodeDetailsLoading] = useState(false)
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null)

  // Editable modals state
  const [editingLane, setEditingLane] = useState<Lane | null>(null)
  const [editingNode, setEditingNode] = useState<PositionedRoadmapNode | null>(null)

  const { activeTab } = useAppSelector((s) => s.ui)
  const { handMode, magnifierMode, mode, selectedEditNodeId, selectedEditEdgeId } = useAppSelector((s) => s.canvas)
  const { data: diagram, loading, error } = useAppSelector((s) => s.diagram)

  const isAdmin = activeTab === 'Model Edit';

  useEffect(() => {
    dispatch(fetchDiagram())
  }, [dispatch])

  useEffect(() => {
    if (isAdmin) {
      dispatch(setMode('edit'))
      dispatch(setHandMode(false))
      dispatch(setMagnifierMode(false))
    } else {
      dispatch(setMode('view'))
      dispatch(setSelectedEditNodeId(null))
      dispatch(setSelectedEditEdgeId(null))
    }
  }, [isAdmin, dispatch])

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

  const handleLaneClick = (lane: Lane) => {
    if (mode === 'edit') {
      setEditingLane(lane)
    } else {
      setSelectedLane(lane)
    }
  }

  const closeNodeModal = () => {
    setSelectedNode(null)
    setSelectedNodeDetails(null)
  }

  const handleAddLane = () => {
    if (!diagram) return;
    const newLaneId = `lane-${Date.now()}`
    dispatch(addLane({
      lane: { id: newLaneId, title: 'New Lane', order: diagram.lanes.length }
    }))
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

      try {
        await saveRoadmapDiagram(approvedDiagram)
        dispatch(fetchDiagram())
        alert('Diagram saved successfully!')
      } catch (err) {
        alert('Error saving diagram!')
      }
    }
  }

  const handleDropNode = (type: string, worldX: number, worldY: number) => {
    if (mode === 'edit') {
      if (!diagram || diagram.lanes.length === 0) return

      const headerH = 64
      const rowGap = 90
      const diagramWidth = diagram.canvas?.width || 2000
      const laneWidth = diagramWidth / Math.max(1, diagram.lanes.length)

      const laneIdx = Math.max(0, Math.min(diagram.lanes.length - 1, Math.floor(worldX / laneWidth)))
      const laneId = diagram.lanes[laneIdx].id
      const level = Math.max(0, Math.round((worldY - headerH) / rowGap))

      // We parse metadata if it was passed as JSON
      let nodeType = type;
      let status: any = undefined;

      try {
        const meta = JSON.parse(type);
        nodeType = meta.type;
        status = meta.status;
      } catch (e) {
        nodeType = type;
      }

      const id = `new-node-${Date.now()}`
      dispatch(addNode({
        node: {
          id,
          title: 'New Node',
          type: nodeType as any,
          status: status,
          laneId,
          level,
          label: 'New Node',
          posX: worldX,
          posY: worldY
        }
      }))
      dispatch(setSelectedEditNodeId(id))
    }
  }

  const handleBackgroundClick = () => {
    if (mode === 'edit') {
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
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (isAdmin && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); dispatch(undo()); return; }
      if (isAdmin && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); dispatch(redo()); return; }
      if (isAdmin && (e.key === 'Backspace' || e.key === 'Delete')) {
        if (selectedEditNodeId || selectedEditEdgeId) { e.preventDefault(); handleDeleteNode(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, selectedEditNodeId, selectedEditEdgeId, isAdmin]);


  return (
    <main className="flex h-full flex-col bg-[var(--color-bg-body)]">
      <section className="relative flex-1 flex-col">
        {diagram && (
          <div className="absolute right-8 top-6 z-20 flex items-center gap-4 pointer-events-none">
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold border shadow-md flex items-center gap-1.5 backdrop-blur-sm ${diagram.isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-amber-50 text-amber-700 border-amber-200/60'}`}>
              <span className="text-base leading-none">{diagram.isApproved ? '✓' : '⚠️'}</span>
              {diagram.isApproved ? 'Admin Approved' : 'Not Approved'}
            </div>
          </div>
        )}

        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-bg-card)]/90 backdrop-blur-md p-2 shadow-sm w-14 overflow-y-auto max-h-[85%] no-scrollbar">

          <button
            type="button"
            onClick={() => { dispatch(setMode('view')); dispatch(setSelectedEditNodeId(null)); }}
            className={`grid size-9 place-items-center rounded-full text-sm transition-colors ${mode === 'view' ? 'bg-primary text-primary-foreground' : 'text-text-primary hover:bg-btn'}`}
            title="View Mode"
          >
            <Eye size={18} />
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                dispatch(setMode('edit'));
                dispatch(setHandMode(false));
                dispatch(setMagnifierMode(false));
              }}
              className={`grid size-9 place-items-center rounded-full text-sm transition-colors ${mode === 'edit' ? 'bg-primary text-primary-foreground' : 'text-text-primary hover:bg-btn'}`}
              title="Edit Mode"
            >
              <Edit2 size={16} />
            </button>
          )}

          <div className="h-[1px] w-6 bg-border my-[2px]" />

          {mode === 'edit' ? (
            <>
              {/* SAP Process (Blue) */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'process', status: 'completed' }))}
                className="grid size-9 place-items-center rounded-md border border-transparent hover:border-border hover:bg-btn cursor-grab text-sap"
                title="Add SAP Process (Blue)"
              >
                <div className="w-[20px] h-[16px] border-[2px] border-current bg-sap/20 rounded-sm pointer-events-none"></div>
              </button>

              {/* Legacy Process (Orange) */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'process', status: 'in-progress' }))}
                className="grid size-9 place-items-center rounded-md border border-transparent hover:border-border hover:bg-btn cursor-grab text-legacy"
                title="Add Legacy Process (Orange)"
              >
                <div className="w-[20px] h-[16px] border-[2px] border-current bg-legacy/20 rounded-sm pointer-events-none"></div>
              </button>

              {/* Manual Process (Green) */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'process', status: 'planned' }))}
                className="grid size-9 place-items-center rounded-md border border-transparent hover:border-border hover:bg-btn cursor-grab text-manual"
                title="Add Manual Process (Green)"
              >
                <div className="w-[20px] h-[16px] border-[2px] border-current bg-manual/20 rounded-sm pointer-events-none"></div>
              </button>

              {/* Decision (Diamond) */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'decision' }))}
                className="grid size-9 place-items-center rounded-md border border-transparent hover:border-border hover:bg-btn cursor-grab text-slate-600"
                title="Add Decision Node"
              >
                <div className="w-[14px] h-[14px] border-[2px] border-current transform rotate-45 pointer-events-none bg-white"></div>
              </button>

              {/* Terminator (Capsule) */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'terminator' }))}
                className="grid size-9 place-items-center rounded-md border border-transparent hover:border-border hover:bg-btn cursor-grab text-slate-600"
                title="Add Terminator Node"
              >
                <div className="w-[20px] h-[12px] border-[2px] border-current rounded-[10px] pointer-events-none bg-white"></div>
              </button>

              {/* Document */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'document' }))}
                className="grid size-9 place-items-center rounded-md border border-transparent hover:border-border hover:bg-btn cursor-grab text-slate-600"
                title="Add Document Node"
              >
                <FileText size={20} />
              </button>

              {/* Data / Database */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'data' }))}
                className="grid size-9 place-items-center rounded-md border border-transparent hover:border-border hover:bg-btn cursor-grab text-slate-600"
                title="Add Data Node"
              >
                <Database size={20} />
              </button>

              <div className="h-[1px] w-6 bg-border my-[2px]" />
              <button
                onClick={handleAddLane}
                className="grid size-9 place-items-center rounded-md border border-transparent text-[#2c3e50] hover:border-border hover:bg-btn"
                title="Add New Lane"
              >
                <Columns size={18} />
              </button>
              <button
                onClick={handleDeleteNode}
                disabled={!selectedEditNodeId && !selectedEditEdgeId}
                className="grid size-9 place-items-center rounded-md border border-transparent text-red-500 hover:border-red-100 hover:bg-red-50 disabled:opacity-40"
                title="Delete Selected Node/Edge"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={handleSave}
                className="grid size-9 place-items-center rounded-md border border-transparent text-[#2c3e50] hover:border-border hover:bg-btn"
                title="Save Diagram"
              >
                <Save size={20} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => dispatch(setHandMode(!handMode))}
                className={`grid size-9 place-items-center rounded-md border transition-colors ${handMode ? 'border-border bg-btn text-[var(--color-primary)]' : 'border-transparent text-[#2c3e50] hover:border-border hover:bg-btn'}`}
                title="Pan Tool"
              >
                <Hand size={20} />
              </button>
              <button
                type="button"
                onClick={() => dispatch(setMagnifierMode(!magnifierMode))}
                className={`grid size-9 place-items-center rounded-md border transition-colors ${magnifierMode ? 'border-border bg-btn text-[var(--color-primary)]' : 'border-transparent text-[#2c3e50] hover:border-border hover:bg-btn'}`}
                title="Zoom Tool"
              >
                <Search size={20} />
              </button>
              <button
                type="button"
                onClick={() => dispatch(fetchDiagram())}
                disabled={loading}
                className="grid size-9 place-items-center rounded-md border border-transparent text-[#2c3e50] hover:border-border hover:bg-btn disabled:opacity-50"
                title="Refresh Diagram"
              >
                <RefreshCw size={20} />
              </button>
            </>
          )}

          <div className="h-[1px] w-6 bg-border my-[2px]" />
          <button onClick={() => canvasRef.current?.zoomOut()} className="grid size-9 place-items-center rounded-md border border-transparent text-[#2c3e50] hover:border-border hover:bg-btn" title="Zoom Out"><Minus size={20} /></button>
          <button onClick={() => canvasRef.current?.reset()} className="grid size-9 place-items-center rounded-md border border-transparent text-[#2c3e50] hover:border-border hover:bg-btn" title="Fit Screen"><Maximize size={18} /></button>
          <button onClick={() => canvasRef.current?.zoomIn()} className="grid size-9 place-items-center rounded-md border border-transparent text-[#2c3e50] hover:border-border hover:bg-btn" title="Zoom In"><Plus size={20} /></button>
        </div>

        {mode === 'edit' && selectedEditNodeId && diagram?.nodes.find(n => n.id === selectedEditNodeId) && (() => {
          const nd = diagram.nodes.find(n => n.id === selectedEditNodeId)!;
          return (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-md border border-border bg-white p-2 shadow-lg">
              <span className="text-xs font-semibold text-text-primary px-1">Editing:</span>
              <input
                type="text"
                value={nd.label || ''}
                onChange={(e) => dispatch(updateNodeLabel({ id: selectedEditNodeId, label: e.target.value }))}
                className="text-sm border border-slate-200 bg-slate-50 text-slate-800 rounded px-2 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Node Label"
              />
              <button
                onClick={() => setEditingNode(nd as PositionedRoadmapNode)}
                className="ml-2 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded px-3 py-1.5 transition-colors"
              >
                Edit Full Details
              </button>
            </div>
          )
        })()}

        {diagram ? (
          <ProcessCanvas
            ref={canvasRef}
            diagram={diagram}
            onPersonClick={(p) => setSelectedPerson(p)}
            onNodeClick={handleNodeClick}
            onLaneClick={handleLaneClick}
            onBackgroundClick={handleBackgroundClick}
            onDropNode={handleDropNode}
          />
        ) : loading ? (
          <div className="grid h-full place-items-center text-sm text-text-primary/70">Loading…</div>
        ) : error ? (
          <div className="grid h-full place-items-center">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-6 py-5 text-sm text-red-600">
              <div className="font-semibold">Error loading diagram</div>
              <div className="mt-1">{error}</div>
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center text-sm text-text-primary/70">No diagram available</div>
        )}
      </section>

      {/* --- MODALS REMAIN UNCHANGED --- */}
      <Modal title={selectedPerson?.name ?? 'User details'} open={!!selectedPerson} onClose={() => setSelectedPerson(null)}>
        {selectedPerson && (
          <div className="space-y-3 bg-white p-1 text-slate-900 rounded-md">
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-slate-500">Role</div><div className="col-span-2 font-semibold">{selectedPerson.role || '—'}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-slate-500">Email</div><div className="col-span-2 font-semibold">{selectedPerson.email || '—'}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-slate-500">Team</div><div className="col-span-2 font-semibold">{selectedPerson.team || '—'}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-slate-500">Location</div><div className="col-span-2 font-semibold">{selectedPerson.location || '—'}</div></div>
          </div>
        )}
      </Modal>

      <Modal title="Process Step Details" open={!!selectedNode} onClose={closeNodeModal}>
        <div className="bg-white p-1 text-slate-900 rounded-md">
          {nodeDetailsLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="text-sm text-slate-500">Loading node details…</div>
            </div>
          ) : selectedNode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-xs text-slate-500">ID</div>
                <div className="col-span-2 font-semibold text-sm">{selectedNode.id}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-xs text-slate-500">Type</div>
                <div className="col-span-2"><span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold uppercase">{selectedNode.type || selectedNodeDetails?.Type || 'PROCESS'}</span></div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500">Label</div>
                <div className="col-span-2 font-semibold whitespace-pre-wrap">{selectedNode.label}</div>
              </div>
              {(selectedNode.description || selectedNodeDetails?.Description) && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-500">Description</div>
                  <div className="col-span-2 text-sm text-slate-700 whitespace-pre-wrap">{selectedNode.description || selectedNodeDetails?.Description}</div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal title="Edit Lane" open={!!editingLane} onClose={() => setEditingLane(null)}>
        {editingLane && (
          <div className="space-y-4 bg-white p-1 text-slate-900 rounded-md">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
              <input type="text" autoFocus className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-500" value={editingLane.title} onChange={(e) => setEditingLane({ ...editingLane, title: e.target.value })} />
            </div>
            <div className="flex justify-between items-center pt-5 mt-2 border-t border-slate-100">
              <button onClick={() => { if (confirm('Delete this lane?')) { dispatch(removeLane(editingLane.id)); setEditingLane(null); } }} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">Delete Lane</button>
              <button onClick={() => { dispatch(updateLane({ id: editingLane.id, title: editingLane.title })); setEditingLane(null); }} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Save Changes</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal title="Edit Node Details" open={!!editingNode} onClose={() => setEditingNode(null)}>
        {editingNode && (
          <div className="space-y-4 bg-white p-1 text-slate-900 rounded-md">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Label / Title</label>
              <input type="text" className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white" value={editingNode.label || ''} onChange={(e) => setEditingNode({ ...editingNode, label: e.target.value })} />
            </div>
            <div className="flex justify-end pt-5 mt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  dispatch(updateNodeInfo({ id: editingNode.id, label: editingNode.label || '' }))
                  setEditingNode(null)
                }}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg"
              >
                Save Details
              </button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  )
}