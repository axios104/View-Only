// src/mock/roadmapDiagram.ts
import type { FlowchartNode } from '../types/roadmap';

export const mockRawData: FlowchartNode[] = [
  {
    Title: "Customer Initiates Inquiry",
    Level: 1,
    LaneID: 1,
    NodeID: "NODE_1",
    ActivityType: "Start",
    ToRelationship: [
      { Target: "NODE_2", EdgeLabel: "Submit Inquiry" }
    ]
  },
  {
    Title: "Capture Requirements",
    Level: 2,
    LaneID: 2,
    NodeID: "NODE_2",
    ActivityType: "Process",
    ToRelationship: [
      { Target: "NODE_3", EdgeLabel: "" }
    ]
  },
  {
    Title: "Create Quotation",
    Level: 3,
    LaneID: 2,
    NodeID: "NODE_3",
    ActivityType: "Process",
    ToRelationship: [
      { Target: "NODE_4", EdgeLabel: "" }
    ]
  },
  {
    Title: "Customer Reviews Offer",
    Level: 3,
    LaneID: 1,
    NodeID: "NODE_4",
    ActivityType: "Decision",
    ToRelationship: [
      { Target: "NODE_5", EdgeLabel: "Accept" },
      { Target: "NODE_6", EdgeLabel: "Reject / Revise" }
    ]
  },
  {
    Title: "Revise Quotation",
    Level: 4,
    LaneID: 2,
    NodeID: "NODE_6",
    ActivityType: "Process",
    ToRelationship: [
      { Target: "NODE_3", EdgeLabel: "" }
    ]
  },
  {
    Title: "Create Sales Order",
    Level: 4,
    LaneID: 3,
    NodeID: "NODE_5",
    ActivityType: "Process",
    ToRelationship: [
      { Target: "NODE_7", EdgeLabel: "" }
    ]
  },
  {
    Title: "Check Availability (ATP)",
    Level: 5,
    LaneID: 3,
    NodeID: "NODE_7",
    ActivityType: "Decision",
    ToRelationship: [
      { Target: "NODE_8", EdgeLabel: "Available" },
      { Target: "NODE_9", EdgeLabel: "Not Available" },
      { Target: "NODE_11", EdgeLabel: "Escalate" }
    ]
  },
  {
    Title: "Confirm Delivery Date",
    Level: 6,
    LaneID: 3,
    NodeID: "NODE_8",
    ActivityType: "Process",
    ToRelationship: [
      { Target: "NODE_10", EdgeLabel: "" }
    ]
  },
  {
    Title: "Reschedule / Allocation Review",
    Level: 6,
    LaneID: 4,
    NodeID: "NODE_9",
    ActivityType: "Process",
    ToRelationship: [
      { Target: "NODE_7", EdgeLabel: "" }
    ]
  },
  {
    Title: "Complete Order & Archive",
    Level: 7,
    LaneID: 3,
    NodeID: "NODE_10",
    ActivityType: "Terminator",
    ToRelationship: []
  },
  {
    Title: "Escalate to Manager",
    Level: 5,
    LaneID: 3,
    NodeID: "NODE_11",
    ActivityType: "Process",
    ToRelationship: [
      { Target: "NODE_7", EdgeLabel: "" }
    ]
  }
];