import { Avatar } from './Avatar'

type SwimlaneHeaderProps = {
  subtitle: string
  name: string
  onClick?: () => void
}

export function SwimlaneHeader({ subtitle, name, onClick }: SwimlaneHeaderProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between border-r border-border px-4 py-3 text-left hover:bg-[color-mix(in_srgb,var(--color-bg-card)_85%,var(--color-primary)_15%)]"
      aria-label={`Open details for ${name}`}
    >
      <div>
        <div className="text-xs text-text-primary/70">{subtitle}</div>
        <div className="mt-1 text-sm font-semibold text-primary">{name}</div>
      </div>
      <Avatar name={name} />
    </button>
  )
}

