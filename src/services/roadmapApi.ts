// src/services/roadmapApi.ts
import type { RoadmapDiagram, RoadmapLane, RoadmapNode, RoadmapEdge, RawFlowchartRow, NodeType } from '../types/roadmap';
import type { LegendItem } from '../types/legend';
import { mockRawData } from '../mock/roadmapDiagram';
import { mockRoadmapLegend } from '../mock/roadmapLegend';

const USE_MOCK = true;

/**
 * Transforms the flat Excel/CSV style data into the structured format required by the Canvas
 */
function transformRawDataToDiagram(rows: RawFlowchartRow[]): RoadmapDiagram {
  const lanesMap = new Map<string, RoadmapLane>();
  const nodes: RoadmapNode[] = [];
  const edges: RoadmapEdge[] = [];

  rows.forEach((row, index) => {
    // 1. Map Swimlanes from "Role"
    const roleName = row.Role || 'Unassigned';
    if (!lanesMap.has(roleName)) {
      lanesMap.set(roleName, {
        id: `lane-${roleName.replace(/\s+/g, '-').toLowerCase()}`,
        title: roleName,
        order: lanesMap.size
      });
    }
    const laneId = lanesMap.get(roleName)!.id;

    // 2. Determine Node Type
    let nodeType: NodeType = 'process';
    const typeStr = (row["Type Text"] || row.Type || '').toLowerCase();
    if (typeStr.includes('decision')) nodeType = 'decision';
    else if (typeStr.includes('start') || typeStr.includes('end') || typeStr.includes('terminator')) nodeType = 'terminator';
    else if (typeStr.includes('document')) nodeType = 'document';
    else if (typeStr.includes('data')) nodeType = 'data';

    // 3. Create Node
    const nodeId = row["internal ID"] || row["Serial ID"] || `fallback-id-${index}`;
    nodes.push({
      id: nodeId,
      title: row["L5 Text"] || 'Untitled Step',
      laneId: laneId,
      level: Number(row.Level) || 1, // Determines X-axis position
      type: nodeType,
      description: row.Description,
      metadata: {
        "L1/L2 Category": [row["L1 Text"], row["L2 Text"]].filter(Boolean).join(' / '),
        "T-code": row["T-code"],
        "Manual URL": row["Manual URL"],
        "Output": row["Output"],
        "Created By": row["Create Person"] ? `${row["Create Person"]} on ${row["Create Date"]}` : undefined,
      }
    });

    // 4. Map Edges (Relationships) - supports comma-separated targets and labels
    if (row["To. Relationship (Y)"]) {
      const yTargets = row["To. Relationship (Y)"].split(',').map(t => t.trim()).filter(Boolean)
      const yLabels = row["To. Relationship (Y) Text"]?.split(',').map(l => l.trim()) || []
      yTargets.forEach((target, idx) => {
        edges.push({
          id: `edge-${nodeId}-to-${target}-Y-${idx}`,
          source: nodeId,
          target: target,
          label: yLabels[idx] || undefined
        })
      })
    }

    if (row["To. Relationship (N)"]) {
      const nTargets = row["To. Relationship (N)"].split(',').map(t => t.trim()).filter(Boolean)
      const nLabels = row["To. Relationship (N) Text"]?.split(',').map(l => l.trim()) || []
      nTargets.forEach((target, idx) => {
        edges.push({
          id: `edge-${nodeId}-to-${target}-N-${idx}`,
          source: nodeId,
          target: target,
          label: nLabels[idx] || undefined
        })
      })
    }
  });

  return {
    id: 'imported-flowchart',
    title: 'Process Flowchart',
    lanes: Array.from(lanesMap.values()),
    nodes,
    edges
  };
}

export const getRoadmapDiagram = async (): Promise<RoadmapDiagram> => {
  if (USE_MOCK) {
    // Simulate network delay to mimic real API
    await new Promise(resolve => setTimeout(resolve, 500));
    // Transform the flat data right before handing it to the app
    return transformRawDataToDiagram(mockRawData);
  }

  const response = await fetch('/api/roadmap');
  if (!response.ok) {
    throw new Error('Failed to fetch roadmap diagram');
  }
  const rawJson = await response.json();
  // If your API returns the flat format, run the transformer here too
  return transformRawDataToDiagram(rawJson);
};

// --- RESTORED LEGEND FUNCTION ---
export async function getRoadmapLegend(): Promise<LegendItem[]> {
  if (USE_MOCK) return mockRoadmapLegend;
  
  const res = await fetch('/api/roadmap-legend');
  if (!res.ok) throw new Error(`Failed to load roadmap legend: ${res.status}`);
  return (await res.json()) as LegendItem[];
}