import { useEffect, useRef, useState } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setHandMode, setMagnifierMode, setMode, setSelectedEditNodeId, setSelectedEditEdgeId } from '../store/canvasSlice'
import { fetchDiagram, addNode, removeNode, removeEdge, updateNodeLabel, undo, redo, addLane, removeLane, updateLane, updateNodeInfo } from '../store/diagramSlice'
import { getNodeDetails, saveRoadmapDiagram } from '../services/roadmapApi'
import type { Person, Lane, NodeDetails, RoadmapDiagram } from '../types/roadmap'
import { Modal } from './Modal'
import { ProcessCanvas, type ProcessCanvasApi } from './ProcessCanvas'
import { layoutRoadmapNodes, type PositionedRoadmapNode } from '../layout/layoutRoadmap'
import { Eye, Edit2, Hand, Search, RotateCcw, Save, Trash2, Maximize, Minus, Plus, Columns } from 'lucide-react'

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
      const approxViewportW = typeof window !== 'undefined' ? window.innerWidth - 80 : 1200;
      const laneWidth = diagram.lanes.length > 0 ? Math.max(180, approxViewportW / diagram.lanes.length) : approxViewportW

      const layoutNodes = layoutRoadmapNodes(diagram, { laneWidth, headerH: 110, rowGap: 90 })

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
        console.error(err)
      }
    }
  }

  const handleDropNode = (typeString: string, worldX: number, worldY: number) => {
    if (mode === 'edit') {
      if (!diagram || diagram.lanes.length === 0) return

      const headerH = 110
      const rowGap = 90

      const approxViewportW = typeof window !== 'undefined' ? window.innerWidth - 80 : 1200;
      const laneWidth = diagram.lanes.length > 0 ? Math.max(180, approxViewportW / diagram.lanes.length) : approxViewportW

      const laneIdx = Math.max(0, Math.min(diagram.lanes.length - 1, Math.floor(worldX / laneWidth)))
      const laneId = diagram.lanes[laneIdx].id

      const level = Math.max(0, Math.round((worldY - headerH) / rowGap))

      let nodeType = typeString;
      let status: any = undefined;

      try {
        const meta = JSON.parse(typeString);
        nodeType = meta.type;
        status = meta.status;
      } catch (e) {
        nodeType = typeString;
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

        {/* SIDEBAR */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-4 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-bg-card)]/90 backdrop-blur-md py-4 px-2 shadow-sm w-16 overflow-y-auto max-h-[90%] no-scrollbar">

          <button
            type="button"
            onClick={() => { dispatch(setMode('view')); dispatch(setSelectedEditNodeId(null)); }}
            className={`grid size-10 place-items-center rounded-full text-sm transition-colors ${mode === 'view' ? 'bg-primary text-primary-foreground shadow-md' : 'text-text-primary hover:bg-btn'}`}
            title="View Mode"
          >
            <Eye size={20} />
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                dispatch(setMode('edit'));
                dispatch(setHandMode(false));
                dispatch(setMagnifierMode(false));
              }}
              className={`grid size-10 place-items-center rounded-full text-sm transition-colors ${mode === 'edit' ? 'bg-primary text-primary-foreground shadow-md' : 'text-text-primary hover:bg-btn'}`}
              title="Edit Mode"
            >
              <Edit2 size={18} />
            </button>
          )}

          <div className="h-[1px] w-8 bg-border my-1" />

          {mode === 'edit' ? (
            <div className="flex flex-col items-center gap-5 w-full">
              {/* Input (2 Hex — Green rect + hexagon) */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'data' }))}
                className="grid place-items-center cursor-grab hover:scale-110 transition-transform"
                title="Add Input (2 Hex)"
              >
                <svg className="w-[28px] h-[22px] pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polygon points="18,2 82,2 98,50 82,98 18,98 2,50" fill="#C8E6C9" stroke="#2E7D32" strokeWidth="6" strokeLinejoin="round" />
                  <rect x="2" y="6" width="72" height="88" rx="8" fill="#C8E6C9" stroke="#2E7D32" strokeWidth="6" strokeLinejoin="round" />
                </svg>
              </button>

              {/* SAP Function — Blue Rect */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'process', status: 'completed' }))}
                className="grid place-items-center cursor-grab hover:scale-110 transition-transform"
                title="Add SAP Function (Blue)"
              >
                <div style={{ backgroundColor: '#DBEAFE', borderColor: '#1E40AF' }} className="w-[24px] h-[18px] border-[2px] rounded-[3px] pointer-events-none"></div>
              </button>

              {/* Legacy Function — Purple Rect */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'process', status: 'in-progress' }))}
                className="grid place-items-center cursor-grab hover:scale-110 transition-transform"
                title="Add Legacy Function (Purple)"
              >
                <div style={{ backgroundColor: '#F3E5F5', borderColor: '#7B1FA2' }} className="w-[24px] h-[18px] border-[2px] rounded-[3px] pointer-events-none"></div>
              </button>

              {/* Manual Function — Red Rect */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'process', status: 'planned' }))}
                className="grid place-items-center cursor-grab hover:scale-110 transition-transform"
                title="Add Manual Function (Red)"
              >
                <div style={{ backgroundColor: '#FFCDD2', borderColor: '#C62828' }} className="w-[24px] h-[18px] border-[2px] rounded-[3px] pointer-events-none"></div>
              </button>

              {/* Technical Term — Gray Rect */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'process' }))}
                className="grid place-items-center cursor-grab hover:scale-110 transition-transform"
                title="Add Technical Term (Gray)"
              >
                <div style={{ backgroundColor: '#E0E0E0', borderColor: '#616161' }} className="w-[24px] h-[18px] border-[2px] rounded-[3px] pointer-events-none"></div>
              </button>

              {/* Decision — Yellow Diamond */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'decision' }))}
                className="grid place-items-center cursor-grab hover:scale-110 transition-transform"
                title="Add Decision (Diamond)"
              >
                <div style={{ backgroundColor: '#FFF9C4', borderColor: '#F9A825' }} className="w-[16px] h-[16px] border-[2px] transform rotate-45 pointer-events-none"></div>
              </button>

              {/* Start / End — Teal Hexagon */}
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/node-type', JSON.stringify({ type: 'terminator' }))}
                className="grid place-items-center cursor-grab hover:scale-110 transition-transform"
                title="Add Start/End (Hexagon)"
              >
                <svg className="w-[26px] h-[18px] pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polygon points="20,2 80,2 98,50 80,98 20,98 2,50" fill="#E0F2F1" stroke="#00695C" strokeWidth="6" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="h-[1px] w-8 bg-border my-1" />

              <button
                onClick={handleAddLane}
                className="grid size-10 place-items-center rounded-xl text-[#2c3e50] hover:bg-btn transition-colors"
                title="Add New Lane"
              >
                <Columns size={20} />
              </button>

              <button
                onClick={handleDeleteNode}
                disabled={!selectedEditNodeId && !selectedEditEdgeId}
                className="grid size-10 place-items-center rounded-xl text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                title="Delete Selected Node/Edge"
              >
                <Trash2 size={20} />
              </button>

              <button
                onClick={handleSave}
                className="grid size-10 place-items-center rounded-xl text-[#2c3e50] hover:bg-btn transition-colors"
                title="Save Diagram"
              >
                <Save size={20} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full">
              <button
                type="button"
                onClick={() => dispatch(setHandMode(!handMode))}
                className={`grid size-10 place-items-center rounded-xl transition-colors ${handMode ? 'bg-primary/10 text-primary' : 'text-[#2c3e50] hover:bg-btn'}`}
                title="Pan Tool"
              >
                <Hand size={20} />
              </button>

              <button
                type="button"
                onClick={() => dispatch(setMagnifierMode(!magnifierMode))}
                className={`grid size-10 place-items-center rounded-xl transition-colors ${magnifierMode ? 'bg-primary/10 text-primary' : 'text-[#2c3e50] hover:bg-btn'}`}
                title="Zoom Tool"
              >
                <Search size={20} />
              </button>

              <button
                type="button"
                onClick={() => canvasRef.current?.reset()}
                className="grid size-10 place-items-center rounded-xl text-[#2c3e50] hover:bg-btn transition-colors"
                title="Reset View"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          )}

          <div className="h-[1px] w-8 bg-border my-1" />

          <button onClick={() => canvasRef.current?.zoomOut()} className="grid size-10 place-items-center rounded-xl text-[#2c3e50] hover:bg-btn transition-colors" title="Zoom Out"><Minus size={20} /></button>
          <button onClick={() => canvasRef.current?.fit()} className="grid size-10 place-items-center rounded-xl text-[#2c3e50] hover:bg-btn transition-colors" title="Fit Screen"><Maximize size={18} /></button>
          <button onClick={() => canvasRef.current?.zoomIn()} className="grid size-10 place-items-center rounded-xl text-[#2c3e50] hover:bg-btn transition-colors" title="Zoom In"><Plus size={20} /></button>
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

      {/* --- VIEW-ONLY PERSON MODAL --- */}
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

      {/* --- VIEW-ONLY NODE MODAL --- */}
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
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {(selectedNode.createPerson || selectedNodeDetails?.CreatePerson) && (
                  <div className="grid grid-cols-3 gap-2 text-xs"><div className="text-slate-500">Created By</div><div className="col-span-2 font-medium">{selectedNode.createPerson || selectedNodeDetails?.CreatePerson}</div></div>
                )}
                {(selectedNode.changePerson || selectedNodeDetails?.ChangePerson) && (
                  <div className="grid grid-cols-3 gap-2 text-xs"><div className="text-slate-500">Changed By</div><div className="col-span-2 font-medium">{selectedNode.changePerson || selectedNodeDetails?.ChangePerson}</div></div>
                )}
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {(selectedNode.tCode || selectedNodeDetails?.TCode) && (
                  <div className="grid grid-cols-3 gap-2 text-xs"><div className="text-slate-500">T-Code</div><div className="col-span-2 font-medium text-blue-600">{selectedNode.tCode || selectedNodeDetails?.TCode}</div></div>
                )}
                {(selectedNode.manual || selectedNodeDetails?.Manual) && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-slate-500">Manual</div>
                    <div className="col-span-2">
                      <a href={selectedNode.manual || selectedNodeDetails?.Manual} target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800">View Manual</a>
                    </div>
                  </div>
                )}
                {(selectedNode.output || selectedNodeDetails?.Output) && (
                  <div className="grid grid-cols-3 gap-2 text-xs"><div className="text-slate-500">Output</div><div className="col-span-2 font-medium">{selectedNode.output || selectedNodeDetails?.Output}</div></div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* --- VIEW-ONLY LANE MODAL --- */}
      <Modal title="Lane Details" open={!!selectedLane} onClose={() => setSelectedLane(null)}>
        {selectedLane && (
          <div className="space-y-3 bg-white p-1 text-slate-900 rounded-md">
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-slate-500">Lane ID</div><div className="col-span-2 font-semibold text-sm">{selectedLane.id}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-slate-500">Name</div><div className="col-span-2 font-semibold">{selectedLane.title}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-slate-500">Assigned To</div><div className="col-span-2 font-semibold">{selectedLane.personId || 'Unassigned'}</div></div>
            <div className="grid grid-cols-3 gap-2"><div className="text-xs text-slate-500">Department</div><div className="col-span-2 font-semibold text-sm text-slate-700">{selectedLane.department || 'General Operations'}</div></div>
          </div>
        )}
      </Modal>

      {/* --- EDITABLE LANE MODAL --- */}
      <Modal title="Edit Lane" open={!!editingLane} onClose={() => setEditingLane(null)}>
        {editingLane && (
          <div className="space-y-4 bg-white p-1 text-slate-900 rounded-md">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lane ID (Read-Only)</label>
              <input type="text" disabled className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500 bg-slate-50" value={editingLane.id} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
              <input type="text" autoFocus className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={editingLane.title} onChange={(e) => setEditingLane({ ...editingLane, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned To</label>
              <input type="text" className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={editingLane.personId || ''} onChange={(e) => setEditingLane({ ...editingLane, personId: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <input type="text" className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={editingLane.department || ''} onChange={(e) => setEditingLane({ ...editingLane, department: e.target.value })} />
            </div>

            <div className="flex justify-between items-center pt-5 mt-2 border-t border-slate-100">
              <button onClick={() => { if (confirm('Delete this lane and all nodes inside it?')) { dispatch(removeLane(editingLane.id)); setEditingLane(null); } }} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">Delete Lane</button>
              <button onClick={() => { dispatch(updateLane({ id: editingLane.id, title: editingLane.title, personId: editingLane.personId, department: editingLane.department })); setEditingLane(null); }} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">Save Changes</button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- EDITABLE NODE MODAL --- */}
      <Modal title="Edit Node Details" open={!!editingNode} onClose={() => setEditingNode(null)}>
        {editingNode && (
          <div className="space-y-4 bg-white p-1 text-slate-900 rounded-md">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ID (Read-Only)</label>
                <input type="text" disabled className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500 bg-slate-50" value={editingNode.id} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type (Read-Only)</label>
                <input type="text" disabled className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500 bg-slate-50 uppercase" value={editingNode.type} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Label / Title</label>
              <input type="text" className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={editingNode.label || ''} onChange={(e) => setEditingNode({ ...editingNode, label: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <textarea rows={3} className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" placeholder="Details about this step..." value={editingNode.description || ''} onChange={(e) => setEditingNode({ ...editingNode, description: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Create Person</label>
                <input type="text" className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={editingNode.createPerson || ''} onChange={(e) => setEditingNode({ ...editingNode, createPerson: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Change Person</label>
                <input type="text" className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={editingNode.changePerson || ''} onChange={(e) => setEditingNode({ ...editingNode, changePerson: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">T-Code</label>
                <input type="text" className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={editingNode.tCode || ''} onChange={(e) => setEditingNode({ ...editingNode, tCode: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Output</label>
                <input type="text" className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={editingNode.output || ''} onChange={(e) => setEditingNode({ ...editingNode, output: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Manual (URL)</label>
              <input type="text" className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={editingNode.manual || ''} onChange={(e) => setEditingNode({ ...editingNode, manual: e.target.value })} />
            </div>

            <div className="flex justify-end pt-5 mt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  dispatch(updateNodeInfo({
                    id: editingNode.id,
                    label: editingNode.label || '',
                    description: editingNode.description,
                    tCode: editingNode.tCode,
                    manual: editingNode.manual,
                    output: editingNode.output,
                    createPerson: editingNode.createPerson,
                    changePerson: editingNode.changePerson
                  }))
                  setEditingNode(null)
                }}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
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