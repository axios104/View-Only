// src/types/roadmap.ts
export type NodeType = 'process' | 'decision' | 'terminator' | 'document' | 'data';

export type Anchor = 'left' | 'right' | 'top' | 'bottom' | 'center';

export type NodeShape =
  | 'decision'
  | 'hexagon'
  | 'document'
  | 'rounded-rect'
  | 'rect'
  | 'arrow-right'
  | 'substrate';

export interface FlowchartNode {
  L5ID: string;
  L5Text: string;
  Level: string;
  Role: string;
  Type: string;
  TypeText: string;
  FromRelationship: string;
  ToRelationshipY: string;
  ToRelationshipYText: string;
  ToRelationshipN: string;
  ToRelationshipNText: string;
  Lvl?: number;
}

export interface RoadmapLane {
  id: string;
  title: string;
  order?: number;
  personId?: string;
  department?: string; // Added to support editing
}

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
  order?: number;
  description?: string;
  status?: 'completed' | 'in-progress' | 'planned';
  assignees?: string[];
  label?: string;
  metadata?: Record<string, string | undefined>;
  posX?: number;
  posY?: number;
  // Added extended details to support dynamic API saving
  tCode?: string;
  manual?: string;
  output?: string;
  createPerson?: string;
  changePerson?: string;
}

export interface RoadmapEdge {
  id: string;
  source: string;
  target: string;
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
  isApproved?: boolean;
  userRole?: 'admin' | 'user';
}

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