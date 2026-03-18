import { RoadmapHeader } from './components/RoadmapHeader'
import { RoadmapLegend } from './components/RoadmapLegend'
import { RoadmapTabs } from './components/RoadmapTabs'
import { RoadmapView } from './components/RoadmapView'
import { useAppSelector } from './store/hooks'

function App() {
  const activeTab = useAppSelector((s) => s.ui.activeTab)

  return (
    <div className="flex h-full flex-col">
      <RoadmapHeader />
      <RoadmapTabs />
      <div className="flex-1">
        {activeTab === 'Model' ? (
          <RoadmapView />
        ) : (
          <div className="grid h-full place-items-center bg-[var(--color-bg-body)] px-6">
            <div className="rounded-lg border border-border bg-card px-6 py-5 text-sm text-text-primary">
              <div className="text-base font-semibold">{activeTab}</div>
              <div className="mt-1 text-text-primary/70">
                This starter currently implements the view-only roadmap on the <span className="font-semibold">Model</span> tab.
              </div>
            </div>
          </div>
        )}
      </div>
      <RoadmapLegend />
    </div>
  )
}

export default App
