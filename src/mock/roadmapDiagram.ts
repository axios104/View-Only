import type { RoadmapDiagram } from '../types/roadmap'

// Rich mock data set that exercises:
// - All work types (sap, legacy, manual, neutral)
// - Multiple lanes and people
// - Rectangular and decision shapes
// - Cross-lane dependencies and mixed anchors
// - Long, multi-line labels and varying node sizes
export const mockRoadmapDiagram: RoadmapDiagram = {
  canvas: { width: 2200, height: 1200 },
  people: [
    {
      id: 'p1',
      name: 'Abhinav',
      role: 'Global Process Owner – Order to Cash',
      email: 'abhinav.gupta@example.com',
      location: 'Bengaluru, IN',
      team: 'Enterprise Process Excellence',
    },
    {
      id: 'p2',
      name: 'Pathanjali',
      role: 'Solution Architect – SAP SD',
      email: 'pathanjali.kr@example.com',
      location: 'Singapore, SG',
      team: 'Digital Architecture',
    },
    {
      id: 'p3',
      name: 'Kubra',
      role: 'Business Analyst – Commercial Operations',
      email: 'kubra.ali@example.com',
      location: 'Seoul, KR',
      team: 'Business Process',
    },
    {
      id: 'p4',
      name: 'Diego',
      role: 'Regional Process Lead – EMEA',
      email: 'diego.martinez@example.com',
      location: 'Madrid, ES',
      team: 'Regional Operations',
    },
    {
      id: 'p5',
      name: 'Sofia',
      role: 'Reporting & Analytics Lead',
      email: 'sofia.lee@example.com',
      location: 'New York, US',
      team: 'Data & Insights',
    },
  ],
  lanes: [
    { id: 'l1', title: 'Carries out & Supports by', personId: 'p1' },
    { id: 'l2', title: 'Carries out & Supports by', personId: 'p2' },
    { id: 'l3', title: 'Carries out & Supports by', personId: 'p3' },
    { id: 'l4', title: 'Approves / Governs by', personId: 'p4' },
    { id: 'l5', title: 'Monitors & Reports by', personId: 'p5' },
  ],
  nodes: [
    // Level 0 – Opportunity & quotation
    {
      id: 'n1',
      laneId: 'l1',
      label: 'Capture opportunity\n(from CRM or partner portal)',
      level: 0,
      order: 0,
      shape: 'rect',
      workType: 'manual',
      w: 220,
      h: 64,
      style: {
        connector: 'var(--color-bg-manual-function)',
      },
    },
    {
      id: 'n2',
      laneId: 'l2',
      label: 'Create quotation in SAP\nwith configured pricing & terms',
      level: 1,
      order: 0,
      shape: 'rect',
      workType: 'sap',
      w: 260,
      h: 72,
      style: {
        connector: 'var(--color-bg-sap-function)',
      },
    },
    {
      id: 'n3',
      laneId: 'l3',
      label: 'Validate commercial\nconditions with business\nowner (discounts, bundles)',
      level: 2,
      order: 0,
      shape: 'rect',
      workType: 'manual',
      w: 260,
      h: 88,
      style: {
        connector: 'var(--color-bg-manual-function)',
      },
    },

    // Decision – approval needed?
    {
      id: 'n4',
      laneId: 'l4',
      label: 'Is approval\nrequired?',
      level: 3,
      order: 1,
      shape: 'decision',
      workType: 'neutral',
      w: 180,
      h: 96,
      style: {
        connector: 'color-mix(in srgb, var(--color-bg-neutral-node) 55%, var(--color-primary) 45%)',
      },
    },

    // Approval branch
    {
      id: 'n5',
      laneId: 'l4',
      label: 'Review and approve\nhigh-value quotation',
      level: 4,
      order: 0,
      shape: 'rect',
      workType: 'manual',
      w: 220,
      h: 64,
      style: {
        connector: 'var(--color-bg-manual-function)',
      },
    },
    {
      id: 'n6',
      laneId: 'l2',
      label: 'Apply approved\nconditions in SAP',
      level: 5,
      order: 0,
      shape: 'rect',
      workType: 'sap',
      w: 210,
      h: 56,
      style: {
        connector: 'var(--color-bg-sap-function)',
      },
    },

    // Rejection branch
    {
      id: 'n7',
      laneId: 'l3',
      label: 'Communicate rejection\nand capture reason code',
      level: 4,
      order: 2,
      shape: 'rect',
      workType: 'manual',
      w: 230,
      h: 64,
      style: {
        connector: 'var(--color-bg-manual-function)',
      },
    },

    // Order creation
    {
      id: 'n8',
      laneId: 'l2',
      label: 'Convert quotation to\nsales order in SAP',
      level: 6,
      order: 1,
      shape: 'rect',
      workType: 'sap',
      w: 220,
      h: 56,
      style: {
        connector: 'var(--color-bg-sap-function)',
      },
    },
    {
      id: 'n9',
      laneId: 'l1',
      label: 'Confirm order\nwith customer',
      level: 7,
      order: 1,
      shape: 'rect',
      workType: 'manual',
      w: 190,
      h: 56,
      style: {
        connector: 'var(--color-bg-manual-function)',
      },
    },

    // Delivery & billing
    {
      id: 'n10',
      laneId: 'l2',
      label: 'Create delivery\nand post goods issue',
      level: 8,
      order: 1,
      shape: 'rect',
      workType: 'sap',
      w: 220,
      h: 64,
      style: {
        connector: 'var(--color-bg-sap-function)',
      },
    },
    {
      id: 'n11',
      laneId: 'l2',
      label: 'Create billing\ndocument in SAP',
      level: 9,
      order: 1,
      shape: 'rect',
      workType: 'sap',
      w: 210,
      h: 56,
      style: {
        connector: 'var(--color-bg-sap-function)',
      },
    },
    {
      id: 'n12',
      laneId: 'l5',
      label: 'Post billing to\nfinance and update\nreporting cubes',
      level: 10,
      order: 1,
      shape: 'rect',
      workType: 'legacy',
      w: 260,
      h: 80,
      style: {
        connector: 'var(--color-bg-legacy-function)',
      },
    },

    // Monitoring & analytics
    {
      id: 'n13',
      laneId: 'l5',
      label: 'Monitor order-to-cash\ncycle time and\naging KPIs',
      level: 11,
      order: 2,
      shape: 'arrow-right',
      workType: 'neutral',
      w: 280,
      h: 72,
      style: {
        connector: 'color-mix(in srgb, var(--color-bg-neutral-node) 55%, var(--color-primary) 45%)',
      },
    },
    {
      id: 'n14',
      laneId: 'l5',
      label: 'Trigger continuous\nimprovement backlog item\nfor bottlenecks',
      level: 12,
      order: 2,
      shape: 'arrow-right',
      workType: 'manual',
      w: 280,
      h: 72,
      style: {
        connector: 'var(--color-bg-manual-function)',
      },
    },

    // Example neutral node with default styling only (kept rectangular)
    {
      id: 'n15',
      laneId: 'l1',
      label: 'Periodic health check\nand design authority\nreview (quarterly)',
      level: 13,
      order: 3,
      shape: 'rect',
      workType: 'neutral',
      w: 260,
      h: 96,
    },
  ],
  edges: [
    // Core flow
    {
      id: 'e1',
      from: 'n1',
      to: 'n2',
      fromAnchor: 'right',
      toAnchor: 'left',
      label: 'Opportunity qualified',
    },
    {
      id: 'e2',
      from: 'n2',
      to: 'n3',
      fromAnchor: 'right',
      toAnchor: 'left',
      label: null,
    },
    {
      id: 'e3',
      from: 'n3',
      to: 'n4',
      fromAnchor: 'right',
      toAnchor: 'left',
      label: 'Approval check required',
    },

    // Decision branches
    {
      id: 'e4',
      from: 'n4',
      to: 'n5',
      fromAnchor: 'bottom',
      toAnchor: 'top',
      label: 'If Yes',
    },
    {
      id: 'e5',
      from: 'n4',
      to: 'n7',
      fromAnchor: 'right',
      toAnchor: 'left',
      label: 'If No / Reject',
    },

    // Approval path back into SAP
    {
      id: 'e6',
      from: 'n5',
      to: 'n6',
      fromAnchor: 'bottom',
      toAnchor: 'top',
      label: 'Approved',
    },
    { id: 'e7', from: 'n6', to: 'n8', fromAnchor: 'bottom', toAnchor: 'top' },

    // Rejection rejoins monitoring
    { id: 'e8', from: 'n7', to: 'n13', fromAnchor: 'bottom', toAnchor: 'left', label: 'Feed KPI' },

    // Downstream fulfillment
    {
      id: 'e9',
      from: 'n8',
      to: 'n9',
      fromAnchor: 'bottom',
      toAnchor: 'top',
      label: 'Order created',
    },
    { id: 'e10', from: 'n9', to: 'n10', fromAnchor: 'right', toAnchor: 'left' },
    { id: 'e11', from: 'n10', to: 'n11', fromAnchor: 'bottom', toAnchor: 'top' },
    { id: 'e12', from: 'n11', to: 'n12', fromAnchor: 'right', toAnchor: 'left' },

    // Monitoring and improvement loop
    { id: 'e13', from: 'n12', to: 'n13', fromAnchor: 'bottom', toAnchor: 'top', label: null },
    { id: 'e14', from: 'n13', to: 'n14', fromAnchor: 'bottom', toAnchor: 'top', label: 'Insights' },
    { id: 'e15', from: 'n14', to: 'n15', fromAnchor: 'bottom', toAnchor: 'top', label: null },
  ],
}

