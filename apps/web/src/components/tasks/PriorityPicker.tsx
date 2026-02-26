// components/tasks/PriorityPicker.tsx
'use client'

import { TaskPriority } from '@devvault/db'

const PRIORITIES: { value: TaskPriority; label: string; className: string }[] = [
  { value: 'P1', label: 'P1 Critical', className: 'badge-p1' },
  { value: 'P2', label: 'P2 High',     className: 'badge-p2' },
  { value: 'P3', label: 'P3 Medium',   className: 'badge-p3' },
  { value: 'P4', label: 'P4 Low',      className: 'badge-p4' },
]

interface PriorityPickerProps {
  value: TaskPriority | null
  onChange: (priority: TaskPriority | null) => void
}

export function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  return (
    <div className="flex gap-2">
      {PRIORITIES.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(value === p.value ? null : p.value)}
          className={`
            ${p.className} px-3 py-1 rounded text-xs font-medium transition-opacity cursor-pointer
            ${value && value !== p.value ? 'opacity-30' : 'opacity-100'}
          `}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}