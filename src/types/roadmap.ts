// src/types/roadmap.ts
export type NodeType = 'process' | 'decision' | 'terminator' | 'document' | 'data';

// Connector anchor points used by the canvas renderer.
export type Anchor = 'left' | 'right' | 'top' | 'bottom' | 'center';

// Visual footprint shapes used by the canvas renderer.
export type NodeShape =
  | 'decision'
  | 'hexagon'
  | 'document'
  | 'rounded-rect'
  | 'rect'
  | 'arrow-right'
  | 'substrate';

// Data format matching the Excel export (L5 ID → To Relationship (N) Text)
export interface FlowchartNode {
  L5ID: string;               // Unique node identifier, e.g. "5.4.5.14.01"
  L5Text: string;             // Node label, e.g. "판매반입Pegging실행"
  Level: string;              // "L4" (section header) or "L5" (process step)
  Role: string;               // Responsible role → used as Lane, e.g. "영업담당"
  Type: string;               // "E" (SAP) | "M" (Manual) | ""
  TypeText: string;           // "SAP" | "Manual" | ""
  FromRelationship: string;   // L5 ID of incoming connection
  ToRelationshipY: string;    // L5 ID of Yes/default outgoing target
  ToRelationshipYText: string;// Edge label for Y path
  ToRelationshipN: string;    // L5 ID of No/reject outgoing target
  ToRelationshipNText: string;// Edge label for N path
  Lvl?: number;               // Explicit node placement level
}

export interface RoadmapLane {
  id: string;
  title: string;
  order?: number;
  // Canvas lane can optionally be assigned to a "person" for header rendering.
  personId?: string;
}

// Backwards-compatible alias used across the UI components.
export type Lane = RoadmapLane;

export interface Person {
  id: string;
  name: string;
  role?: string;
  email?: string;
  team?: string;
  location?: string;
}

export interface RoadmapCanvas {
  width: number;
  height: number;
}

export interface RoadmapNode {
  id: string;
  title: string;
  type: NodeType;
  laneId: string;
  level: number;
  // Optional ordering (used by layout when shifting nodes inside a row).
  order?: number;
  description?: string;
  status?: 'completed' | 'in-progress' | 'planned';
  assignees?: string[];
  // Label shown inside the node (canvas uses `label`, not `title`).
  label?: string;
  // Added metadata to hold the extra flat-file columns
  metadata?: Record<string, string | undefined>;
}

export interface RoadmapEdge {
  id: string;
  source: string;
  target: string;
  // Optional alternate fields supported by the canvas renderer.
  from?: string;
  to?: string;
  fromAnchor?: Anchor;
  toAnchor?: Anchor;
  label?: string | null;
  type?: 'solid' | 'dashed';
}

export interface RoadmapDiagram {
  id: string;
  title: string;
  lanes: RoadmapLane[];
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  people?: Person[];
  canvas?: RoadmapCanvas;
}

// Node details fetched on-demand when node is clicked
export interface NodeDetails {
  NodeID: string;
  Type: string;
  Description: string;
  CreateDate: string;
  ChangeDate: string;
  TCode: string;
  Manual: string;
  Output: string;
  CreatePerson: string;
  ChangePerson: string;
}