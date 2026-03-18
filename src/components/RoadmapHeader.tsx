export function RoadmapHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
      <div className="flex items-baseline gap-2">
        <div className="text-sm font-semibold text-text-primary">1.1.1.1 Product Roadmap</div>
      </div>

      <button
        type="button"
        className="rounded-lg border border-border bg-btn px-4 py-2 text-sm font-semibold text-text-primary shadow-sm"
        aria-label="Process information"
      >
        Process Information
      </button>
    </header>
  )
}

