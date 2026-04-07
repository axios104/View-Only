// src/services/roadmapApi.ts
import type { RoadmapDiagram, FlowchartNode, NodeDetails, RoadmapLane, RoadmapNode, RoadmapEdge } from '../types/roadmap';
import type { LegendItem } from '../types/legend';
import { mockRawData } from '../mock/roadmapDiagram';
import { mockRoadmapLegend } from '../mock/roadmapLegend';
import { mockNodeDetails } from '../mock/nodeDetails';

const USE_MOCK = true;

/**
 * Transforms the new Excel-format FlowchartNode[] into RoadmapDiagram.
 * Derives Lanes, Vertical levels via BFS, Visual types, and Edges.
 */
function transformFlowchartNodesToDiagram(nodes: FlowchartNode[]): RoadmapDiagram {
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

  const nodeMap = new Map<string, FlowchartNode>();
  nodes.forEach(n => nodeMap.set(n.L5ID, n));

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

  nodes.forEach(n => {
    if (!levelOf.has(n.L5ID)) levelOf.set(n.L5ID, queue.length);
  });

  const hasAnyEdge = nodes.some(n => n.ToRelationshipY || n.ToRelationshipN);
  if (!hasAnyEdge) {
    nodes.forEach((n, idx) => levelOf.set(n.L5ID, idx));
  }

  const roadmapNodes: RoadmapNode[] = [];
  nodes.forEach(n => {
    const role = n.Role;
    const laneId = roleToLaneId.get(role)!;
    const level = n.Lvl !== undefined ? n.Lvl : (levelOf.get(n.L5ID) ?? 0);

    let nodeType: string = 'process';
    if (n.Level === 'L4') {
      nodeType = 'terminator';
    } else if (n.ToRelationshipY && n.ToRelationshipN) {
      nodeType = 'decision';
    } else if (n.TypeText?.toLowerCase() === 'manual' || n.Type === 'M') {
      nodeType = 'process-red';
    } else {
      nodeType = 'process';
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

  const nodeById = new Map<string, RoadmapNode>();
  roadmapNodes.forEach(n => nodeById.set(n.id, n));

  function getBranchChain(startId: string): string[] {
    const chain: string[] = [];
    let cur = startId;
    const visited = new Set<string>();
    while (cur && nodeMap.has(cur) && !visited.has(cur)) {
      visited.add(cur);
      chain.push(cur);
      const fNode = nodeMap.get(cur)!;
      cur = fNode.ToRelationshipY;
    }
    return chain;
  }

  nodes.forEach(n => {
    if (n.ToRelationshipY && n.ToRelationshipN) {
      const yChain = getBranchChain(n.ToRelationshipY);
      const nChain = getBranchChain(n.ToRelationshipN);

      const ySet = new Set(yChain);
      let mergeIdx = -1;
      for (let i = 0; i < nChain.length; i++) {
        if (ySet.has(nChain[i])) { mergeIdx = i; break; }
      }

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
    await new Promise(resolve => setTimeout(resolve, 500));
    return transformFlowchartNodesToDiagram(mockRawData);
  }

  const response = await fetch('/api/roadmap');
  if (!response.ok) throw new Error('Failed to fetch roadmap diagram');
  return transformFlowchartNodesToDiagram(await response.json());
};

export const saveRoadmapDiagram = async (diagram: RoadmapDiagram): Promise<void> => {
  // --- DIRECT API DB SAVE (UPDATE) IMPLEMENTATION ---

  if (USE_MOCK) {
    // Simulate API delay for local testing
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Mock: Successfully UPDATED diagram with ID ${diagram.id} in DB via API. Payload:`, diagram);
    return;
  }

  try {
    // 1. Notice the URL includes the diagram.id
    // 2. The method is changed to 'PUT' which tells your backend to "Update"
    const response = await fetch(`https://your-api.com/v1/flowchart/${diagram.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${localStorage.getItem('token')}` // Uncomment if you need auth
      },
      // Send the completely updated metadata to replace the old one
      body: JSON.stringify(diagram)
    });

    if (!response.ok) {
      throw new Error(`Failed to update diagram: ${response.statusText}`);
    }

    console.log('Successfully updated diagram in DB via API');
  } catch (error) {
    console.error('Error updating diagram:', error);
    throw error;
  }
};

export const getNodeDetails = async (nodeId: string): Promise<NodeDetails> => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const details = mockNodeDetails[nodeId];
    if (!details) {
      throw new Error(`Node details not found for ${nodeId}`);
    }
    return details;
  }

  const response = await fetch(`/api/node/${nodeId}`);
  if (!response.ok) throw new Error(`Failed to fetch node details for ${nodeId}`);
  return (await response.json()) as NodeDetails;
};

export async function getRoadmapLegend(): Promise<LegendItem[]> {
  if (USE_MOCK) return mockRoadmapLegend;
  const res = await fetch('/api/roadmap-legend');
  if (!res.ok) throw new Error(`Failed to load roadmap legend: ${res.status}`);
  return (await res.json()) as LegendItem[];
}