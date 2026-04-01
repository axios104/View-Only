// src/services/roadmapApi.ts
import type { RoadmapDiagram, FlowchartNode, NodeDetails, RoadmapLane, RoadmapNode, RoadmapEdge } from '../types/roadmap';
import type { LegendItem } from '../types/legend';
import { mockRawData } from '../mock/roadmapDiagram';
import { mockRoadmapLegend } from '../mock/roadmapLegend';
import { mockNodeDetails } from '../mock/nodeDetails';

const USE_MOCK = true;

/**
 * Transforms the new Excel-format FlowchartNode[] into RoadmapDiagram.
 * 
 * Derives:
 *   - Lanes from unique `Role` values
 *   - Vertical levels via topological sort (BFS)
 *   - Node visual type from `Type`/`TypeText` and relationship structure
 *   - Edges from `ToRelationshipY` and `ToRelationshipN`
 */
function transformFlowchartNodesToDiagram(nodes: FlowchartNode[]): RoadmapDiagram {
  // --- 1. Build lanes from unique Role values ---
  const roleSet = new Set<string>();
  nodes.forEach(n => roleSet.add(n.Role));
  const roleToLaneId = new Map<string, string>();
  const lanes: RoadmapLane[] = [];
  let laneOrder = 1;
  for (const role of roleSet) {
    const id = `lane-${laneOrder}`;
    roleToLaneId.set(role, id);
    lanes.push({ id, title: role, order: laneOrder });
    laneOrder++;
  }

  // --- 2. Compute vertical levels via topological sort (BFS from roots) ---
  const nodeMap = new Map<string, FlowchartNode>();
  nodes.forEach(n => nodeMap.set(n.L5ID, n));

  // Build adjacency and in-degree
  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  nodes.forEach(n => {
    inDegree.set(n.L5ID, 0);
    children.set(n.L5ID, []);
  });
  nodes.forEach(n => {
    const targets: string[] = [];
    if (n.ToRelationshipY && nodeMap.has(n.ToRelationshipY)) targets.push(n.ToRelationshipY);
    if (n.ToRelationshipN && nodeMap.has(n.ToRelationshipN)) targets.push(n.ToRelationshipN);
    children.set(n.L5ID, targets);
    targets.forEach(t => inDegree.set(t, (inDegree.get(t) ?? 0) + 1));
  });

  // BFS to assign levels
  const levelOf = new Map<string, number>();
  const queue: string[] = [];
  nodes.forEach(n => {
    if ((inDegree.get(n.L5ID) ?? 0) === 0) {
      queue.push(n.L5ID);
      levelOf.set(n.L5ID, 0);
    }
  });
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const curLevel = levelOf.get(cur) ?? 0;
    for (const child of (children.get(cur) ?? [])) {
      const existingLevel = levelOf.get(child) ?? -1;
      if (curLevel + 1 > existingLevel) {
        levelOf.set(child, curLevel + 1);
      }
      inDegree.set(child, (inDegree.get(child) ?? 1) - 1);
      if ((inDegree.get(child) ?? 0) <= 0) {
        queue.push(child);
      }
    }
  }
  // Any nodes not reached (cycles/orphans) get a fallback level
  nodes.forEach(n => {
    if (!levelOf.has(n.L5ID)) levelOf.set(n.L5ID, queue.length);
  });

  // Fallback: if NO edges exist at all, use array index so nodes spread vertically
  const hasAnyEdge = nodes.some(n => n.ToRelationshipY || n.ToRelationshipN);
  if (!hasAnyEdge) {
    nodes.forEach((n, idx) => levelOf.set(n.L5ID, idx));
  }

  // --- 3. Build RoadmapNodes ---
  const roadmapNodes: RoadmapNode[] = [];
  nodes.forEach(n => {
    const role = n.Role;
    const laneId = roleToLaneId.get(role)!;
    const level = levelOf.get(n.L5ID) ?? 0;

    // Determine visual type
    let nodeType: string = 'process';
    if (n.Level === 'L4') {
      nodeType = 'terminator'; // Section header → rounded-rect
    } else if (n.ToRelationshipY && n.ToRelationshipN) {
      nodeType = 'decision'; // Has both Y and N branches
    } else if (n.TypeText?.toLowerCase() === 'manual' || n.Type === 'M') {
      nodeType = 'process-red'; // Manual step
    } else {
      nodeType = 'process'; // SAP step (default blue)
    }

    roadmapNodes.push({
      id: n.L5ID,
      title: n.L5Text,
      laneId,
      level,
      type: nodeType as any,
      label: n.L5Text,
      metadata: {
        role: n.Role,
        type: n.Type,
        typeText: n.TypeText,
        originalLevel: n.Level,
      }
    });
  });

  // --- 3b. Bifurcation: spread Y/N branches horizontally ---
  // For each decision node, propagate `order` offsets down each branch
  // until the branches merge at a common node.
  const nodeById = new Map<string, RoadmapNode>();
  roadmapNodes.forEach(n => nodeById.set(n.id, n));

  // Find all nodes reachable from a start node following only Y-links (single chain)
  function getBranchChain(startId: string): string[] {
    const chain: string[] = [];
    let cur = startId;
    const visited = new Set<string>();
    while (cur && nodeMap.has(cur) && !visited.has(cur)) {
      visited.add(cur);
      chain.push(cur);
      const fNode = nodeMap.get(cur)!;
      // Follow only the Y-link (main chain) unless it's also a decision with N
      cur = fNode.ToRelationshipY;
    }
    return chain;
  }

  nodes.forEach(n => {
    if (n.ToRelationshipY && n.ToRelationshipN) {
      // This is a decision node — get the chains for each branch
      const yChain = getBranchChain(n.ToRelationshipY);
      const nChain = getBranchChain(n.ToRelationshipN);

      // Find where the chains merge (first common node)
      const ySet = new Set(yChain);
      let mergeIdx = -1;
      for (let i = 0; i < nChain.length; i++) {
        if (ySet.has(nChain[i])) { mergeIdx = i; break; }
      }

      // Assign order=-1 to Y branch, order=1 to N branch (stop before merge)
      const yEnd = mergeIdx >= 0 ? yChain.indexOf(nChain[mergeIdx]) : yChain.length;
      for (let i = 0; i < yEnd; i++) {
        const rn = nodeById.get(yChain[i]);
        if (rn) rn.order = -1;
      }
      for (let i = 0; i < (mergeIdx >= 0 ? mergeIdx : nChain.length); i++) {
        const rn = nodeById.get(nChain[i]);
        if (rn) rn.order = 1;
      }
    }
  });

  // --- 4. Build edges from Y/N relationships ---
  const edges: RoadmapEdge[] = [];
  nodes.forEach(n => {
    if (n.ToRelationshipY && nodeMap.has(n.ToRelationshipY)) {
      edges.push({
        id: `edge-${n.L5ID}-Y`,
        source: n.L5ID,
        target: n.ToRelationshipY,
        label: n.ToRelationshipYText || undefined,
      });
    }
    if (n.ToRelationshipN && nodeMap.has(n.ToRelationshipN)) {
      edges.push({
        id: `edge-${n.L5ID}-N`,
        source: n.L5ID,
        target: n.ToRelationshipN,
        label: n.ToRelationshipNText || undefined,
      });
    }
  });

  return {
    id: 'imported-flowchart',
    title: 'Process Flowchart',
    lanes,
    nodes: roadmapNodes,
    edges,
    canvas: { width: 2000, height: 1000 }
  };
}

export const getRoadmapDiagram = async (): Promise<RoadmapDiagram> => {
  if (USE_MOCK) {
    // Simulate network delay to mimic real API
    await new Promise(resolve => setTimeout(resolve, 500));
    // Transform the new format to diagram
    return transformFlowchartNodesToDiagram(mockRawData);
  }

  const response = await fetch('/api/roadmap');
  if (!response.ok) {
    throw new Error('Failed to fetch roadmap diagram');
  }
  const nodes = await response.json();
  return transformFlowchartNodesToDiagram(nodes);
};

/**
 * Fetch node details on demand (when node is clicked)
 */
export const getNodeDetails = async (nodeId: string): Promise<NodeDetails> => {
  if (USE_MOCK) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    const details = mockNodeDetails[nodeId];
    if (!details) {
      throw new Error(`Node details not found for ${nodeId}`);
    }
    return details;
  }

  const response = await fetch(`/api/node/${nodeId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch node details for ${nodeId}`);
  }
  return (await response.json()) as NodeDetails;
};

// --- RESTORED LEGEND FUNCTION ---
export async function getRoadmapLegend(): Promise<LegendItem[]> {
  if (USE_MOCK) return mockRoadmapLegend;
  
  const res = await fetch('/api/roadmap-legend');
  if (!res.ok) throw new Error(`Failed to load roadmap legend: ${res.status}`);
  return (await res.json()) as LegendItem[];
}