// src/services/roadmapApi.ts
import type { RoadmapDiagram, FlowchartNode, NodeDetails, RoadmapLane, RoadmapNode, RoadmapEdge } from '../types/roadmap';
import type { LegendItem } from '../types/legend';
import { mockRawData } from '../mock/roadmapDiagram';
import { mockRoadmapLegend } from '../mock/roadmapLegend';
import { mockNodeDetails } from '../mock/nodeDetails';

const USE_MOCK = true;

/**
 * Transforms the new FlowchartNode[] format into RoadmapDiagram
 */
function transformFlowchartNodesToDiagram(nodes: FlowchartNode[]): RoadmapDiagram {
  const lanesMapByLaneId = new Map<number, RoadmapLane>();
  const roadmapNodes: RoadmapNode[] = [];
  const edges: RoadmapEdge[] = [];

  nodes.forEach((node) => {
    // Create lane if not exists using numeric LaneID
    if (!lanesMapByLaneId.has(node.LaneID)) {
      lanesMapByLaneId.set(node.LaneID, {
        id: `lane-${node.LaneID}`,
        title: `Lane ${node.LaneID}`,
        order: node.LaneID
      });
    }
    const laneId = lanesMapByLaneId.get(node.LaneID)!.id;

    // Determine node type from ActivityType
    let nodeType = 'process';
    const typeStr = (node.ActivityType || '').toLowerCase();
    if (typeStr.includes('decision')) nodeType = 'decision';
    else if (typeStr.includes('start') || typeStr.includes('terminator')) nodeType = 'terminator';

    // Create node
    roadmapNodes.push({
      id: node.NodeID,
      title: node.Title,
      laneId: laneId,
      level: node.Level,
      type: nodeType as any,
      label: node.Title
    });

    // Create edges from ToRelationship array
    node.ToRelationship.forEach((rel, idx) => {
      edges.push({
        id: `edge-${node.NodeID}-to-${rel.Target}-${idx}`,
        source: node.NodeID,
        target: rel.Target,
        label: rel.EdgeLabel || undefined
      });
    });
  });

  return {
    id: 'imported-flowchart',
    title: 'Process Flowchart',
    lanes: Array.from(lanesMapByLaneId.values()),
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