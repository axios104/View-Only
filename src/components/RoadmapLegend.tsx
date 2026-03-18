import { useEffect, useState } from 'react'
import type { LegendItem } from '../types/legend'
import { getRoadmapLegend } from '../services/roadmapApi'

export function RoadmapLegend() {
  const [items, setItems] = useState<LegendItem[]>([])

  useEffect(() => {
    let cancelled = false
    void getRoadmapLegend().then((data) => {
      if (!cancelled) setItems(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-6 border-t border-border bg-card px-5 py-2 text-xs text-text-primary/80">
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-2">
          <span className={['size-2 rounded-full', it.colorClass].join(' ')} />
          <span>{it.label}</span>
        </div>
      ))}

      <div className="ml-auto hidden items-center gap-2 text-text-primary/70 md:flex">
        <span className="size-2 rounded-sm border border-border bg-btn" />
        <span>Technical Term: Input/ Output value for process</span>
      </div>
    </div>
  )
}

