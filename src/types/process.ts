export type LanePerson = {
  name: string
  subtitle: string
}

export type FlowNodeVariant = 'pill' | 'rect' | 'diamond'

export type FlowNode = {
  id: string
  label: string
  variant: FlowNodeVariant
  x: number
  y: number
  w: number
  h: number
  className?: string
}

export type FlowEdge = {
  id: string
  from: { x: number; y: number }
  to: { x: number; y: number }
  color: string
  width?: number
}

