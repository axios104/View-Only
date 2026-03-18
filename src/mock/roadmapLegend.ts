import type { LegendItem } from '../types/legend'

export const mockRoadmapLegend: LegendItem[] = [
  { id: 'sap', label: 'SAP Function: Work by SAP', colorClass: 'bg-sap' },
  { id: 'legacy', label: 'Legacy Function: Work by Non-SAP', colorClass: 'bg-legacy' },
  { id: 'manual', label: 'Manual Function: Manual Work', colorClass: 'bg-manual' },
  {
    id: 'neutral',
    label: 'Neutral / Supporting Function',
    colorClass: 'bg-node-neutral',
  },
  {
    id: 'cross-lane',
    label: 'Cross-lane dependency / Handover',
    colorClass: 'bg-primary/60',
  },
]

