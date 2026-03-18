import type { RoadmapDiagram } from '../types/roadmap'
import type { LegendItem } from '../types/legend'
import { mockRoadmapDiagram } from '../mock/roadmapDiagram'
import { mockRoadmapLegend } from '../mock/roadmapLegend'

// One-line swap: set this to false to use real HTTP APIs.
const USE_MOCK = true

export async function getRoadmapDiagram(): Promise<RoadmapDiagram> {
  if (USE_MOCK) return mockRoadmapDiagram
  const res = await fetch('/api/roadmap-diagram')
  if (!res.ok) throw new Error(`Failed to load roadmap diagram: ${res.status}`)
  return (await res.json()) as RoadmapDiagram
}

export async function getRoadmapLegend(): Promise<LegendItem[]> {
  if (USE_MOCK) return mockRoadmapLegend
  const res = await fetch('/api/roadmap-legend')
  if (!res.ok) throw new Error(`Failed to load roadmap legend: ${res.status}`)
  return (await res.json()) as LegendItem[]
}

