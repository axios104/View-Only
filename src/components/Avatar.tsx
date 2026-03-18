type AvatarProps = {
  name: string
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('')
}

export function Avatar({ name }: AvatarProps) {
  return (
    <div className="grid size-9 place-items-center rounded-full bg-icon text-sm font-bold text-text-tertiary">
      {initials(name)}
    </div>
  )
}

