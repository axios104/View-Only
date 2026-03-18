import type { RoadmapDiagram } from '../types/roadmap'

export const mockRoadmapDiagram: RoadmapDiagram = {
  canvas: { width: 1400, height: 1600 },
  people: [
    { id: 'p1', name: 'Sales Person', role: 'Sales', email: 'sales@example.com', location: 'Seoul', team: 'Sales' }
  ],
  lanes: [
    { id: 'l1', title: 'Organization...', personId: null },
    { id: 'l2', title: 'Carries out & Supports', personId: 'p1' },
    { id: 'l3', title: 'Carries out & Supports', personId: null },
  ],
  nodes: [
    // Lane 1
    {
      id: 'n2', laneId: 'l1', label: '5.1.1.81. Customer\nGroup\nManagement.Substrate', level: 2, order: 0,
      shape: 'hexagon', workType: 'neutral', w: 160, h: 75,
      style: { fill: '#ccffcc', border: '#006600', text: '#000' }
    },
    {
      id: 'n3', laneId: 'l1', label: '5.4.1.11. Normal\nselling price\nregistration.Substrate', level: 3, order: 0,
      shape: 'hexagon', workType: 'neutral', w: 160, h: 75,
      style: { fill: '#ccffcc', border: '#006600', text: '#000' }
    },

    // Lane 2
    {
      id: 'n1', laneId: 'l2', label: 'Normal order\ncreation start', level: 0, order: -0.5,
      shape: 'rounded-rect', workType: 'neutral', w: 130, h: 55,
      style: { fill: '#ffcccc', border: '#cc0000', text: '#000' }
    },
    {
      id: 'n4', laneId: 'l2', label: 'Get the PO of the\ncustomer', level: 1, order: 0.5,
      shape: 'rect', workType: 'neutral', w: 130, h: 55,
      style: { fill: '#ffcccc', border: '#cc0000', text: '#000' }
    },
    {
      id: 'n5', laneId: 'l2', label: '거래선PO입력\n(KO)', level: 2.5, order: 0.5,
      shape: 'rect', workType: 'neutral', w: 130, h: 55,
      style: { fill: '#cce5ff', border: '#000066', text: '#000' }
    },
    {
      id: 'n6', laneId: 'l2', label: 'SalesPrice', level: 3.5, order: -0.5,
      shape: 'document', workType: 'neutral', w: 110, h: 45,
      style: { fill: '#e6e6e6', border: '#666666', text: '#000' }
    },
    {
      id: 'n7', laneId: 'l2', label: 'OI Master', level: 4.5, order: -0.5,
      shape: 'document', workType: 'neutral', w: 110, h: 45,
      style: { fill: '#e6e6e6', border: '#666666', text: '#000' }
    },
    {
      id: 'n8', laneId: 'l2', label: 'Request Proposal', level: 4, order: 0.5,
      shape: 'rect', workType: 'neutral', w: 130, h: 55,
      style: { fill: '#cce5ff', border: '#000066', text: '#000' }
    },
    {
      id: 'n9', laneId: 'l2', label: 'ATP allocation', level: 5.5, order: 0.5,
      shape: 'decision', workType: 'neutral', w: 140, h: 70,
      style: { fill: '#ffffcc', border: '#cccc00', text: '#000' }
    },
    {
      id: 'n10', laneId: 'l2', label: 'Create SalesOrder', level: 7.5, order: 0.5,
      shape: 'rect', workType: 'neutral', w: 130, h: 55,
      style: { fill: '#cce5ff', border: '#000066', text: '#000' }
    },
    {
      id: 'n11', laneId: 'l2', label: 'SalesOrder', level: 8.5, order: 1.2,
      shape: 'document', workType: 'neutral', w: 110, h: 45,
      style: { fill: '#e6e6e6', border: '#666666', text: '#000' }
    },
    {
      id: 'n18', laneId: 'l2', label: 'Normal order\ncreation finish', level: 12, order: 0.5,
      shape: 'rounded-rect', workType: 'neutral', w: 130, h: 55,
      style: { fill: '#ccffcc', border: '#006600', text: '#000' }
    },

    // Lane 3
    {
      id: 'n12', laneId: 'l3', label: '5.4.3.20.Move Allocat\nion', level: 5.5, order: 0,
      shape: 'hexagon', workType: 'neutral', w: 160, h: 75,
      style: { fill: '#ccffcc', border: '#006600', text: '#000' }
    },
    {
      id: 'n13', laneId: 'l3', label: '5.4.8.30.Order\ndelivery\nconsent.Substrate', level: 6.5, order: 0,
      shape: 'hexagon', workType: 'neutral', w: 160, h: 75,
      style: { fill: '#ccffcc', border: '#006600', text: '#000' }
    },
    {
      id: 'n14', laneId: 'l3', label: '5.4.2.81. Create PO\nbetween\nplant.Substrate', level: 7.5, order: 0,
      shape: 'hexagon', workType: 'neutral', w: 160, h: 75,
      style: { fill: '#ccffcc', border: '#006600', text: '#000' }
    },
    {
      id: 'n15', laneId: 'l3', label: '5.4.2.90.OEM order\nchange.Substrate', level: 8.5, order: 0,
      shape: 'hexagon', workType: 'neutral', w: 160, h: 75,
      style: { fill: '#ccffcc', border: '#006600', text: '#000' }
    },
    {
      id: 'n16', laneId: 'l3', label: '8.2.1.22. Product\nprogression\nstop.Substrate', level: 9.5, order: 0,
      shape: 'hexagon', workType: 'neutral', w: 160, h: 75,
      style: { fill: '#ccffcc', border: '#006600', text: '#000' }
    },
    {
      id: 'n17', laneId: 'l3', label: '8.2.3.20.MASSLAM\nMngt. Substrate', level: 10.5, order: 0,
      shape: 'hexagon', workType: 'neutral', w: 160, h: 75,
      style: { fill: '#ccffcc', border: '#006600', text: '#000' }
    },
  ],
  edges: [
    { id: 'e1', from: 'n1', to: 'n4', fromAnchor: 'right', toAnchor: 'top' },
    { id: 'e2', from: 'n4', to: 'n5', fromAnchor: 'bottom', toAnchor: 'top' },
    { id: 'e3', from: 'n2', to: 'n5', fromAnchor: 'right', toAnchor: 'left' },
    { id: 'e4', from: 'n3', to: 'n5', fromAnchor: 'right', toAnchor: 'left' },
    { id: 'e5', from: 'n5', to: 'n6', fromAnchor: 'bottom', toAnchor: 'top' },
    { id: 'e6', from: 'n5', to: 'n8', fromAnchor: 'bottom', toAnchor: 'top' },
    { id: 'e7', from: 'n7', to: 'n8', fromAnchor: 'right', toAnchor: 'left' },
    { id: 'e8', from: 'n8', to: 'n9', fromAnchor: 'bottom', toAnchor: 'top' },
    { id: 'e9', from: 'n9', to: 'n12', fromAnchor: 'right', toAnchor: 'left', label: 'N' },
    { id: 'e10', from: 'n9', to: 'n10', fromAnchor: 'bottom', toAnchor: 'top', label: 'Y' },
    { id: 'e11', from: 'n10', to: 'n11', fromAnchor: 'right', toAnchor: 'left' },
    { id: 'e12', from: 'n10', to: 'n13', fromAnchor: 'right', toAnchor: 'left' },
    { id: 'e13', from: 'n10', to: 'n14', fromAnchor: 'right', toAnchor: 'left' },
    { id: 'e14', from: 'n10', to: 'n15', fromAnchor: 'right', toAnchor: 'left' },
    { id: 'e15', from: 'n10', to: 'n16', fromAnchor: 'right', toAnchor: 'left' },
    { id: 'e16', from: 'n10', to: 'n17', fromAnchor: 'right', toAnchor: 'left' },
    { id: 'e17', from: 'n10', to: 'n18', fromAnchor: 'bottom', toAnchor: 'top' },
  ],
}