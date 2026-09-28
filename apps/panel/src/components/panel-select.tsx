import type { ChangeEvent } from 'react'
import { ChevronDownIcon } from './icons'

export interface PanelSelectOption {
  value: string
  label: string
  isFilling?: boolean
  secondaryLabel?: string
}

export function PanelSelect({
  id,
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
  className = '',
}: {
  id: string
  label?: string
  value: string
  options: PanelSelectOption[]
  placeholder?: string
  disabled?: boolean
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
          className="w-full appearance-none rounded-lg border border-border bg-surface pr-3 pl-9 py-2 text-sm text-foreground focus:outline-2 focus:outline-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.isFilling ? ' ★ (در حال تکمیل)' : ''}
              {opt.secondaryLabel ? ` — ${opt.secondaryLabel}` : ''}
            </option>
          ))}
        </select>
        <div className="absolute left-3 pointer-events-none flex items-center text-muted">
          <ChevronDownIcon className="size-4" />
        </div>
      </div>
    </div>
  )
}
