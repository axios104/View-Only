import { setActiveTab } from '../store/uiSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import type { RoadmapTabKey } from '../types/ui'

const tabs: RoadmapTabKey[] = ['Activities', 'Model', 'Process Overview', 'Matrix']

export function RoadmapTabs() {
  const dispatch = useAppDispatch()
  const activeTab = useAppSelector((s) => s.ui.activeTab)

  return (
    <nav className="flex items-center gap-6 border-b border-border bg-card px-5">
      {tabs.map((t) => {
        const isActive = t === activeTab
        return (
          <button
            key={t}
            type="button"
            onClick={() => dispatch(setActiveTab(t))}
            className={[
              'relative py-3 text-sm font-semibold',
              isActive ? 'text-primary' : 'text-text-primary/80',
            ].join(' ')}
          >
            {t}
            {isActive ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

