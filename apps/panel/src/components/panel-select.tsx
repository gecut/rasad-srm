import { Label, ListBox, Select } from '@heroui/react'

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
  placeholder = 'انتخاب کنید...',
  disabled = false,
  onChange,
  className = '',
}: {
  id?: string
  label?: string
  value: string
  options: PanelSelectOption[]
  placeholder?: string
  disabled?: boolean
  onChange: (value: string) => void
  className?: string
}) {
  const selectedKey = value ? value : null

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Select
        id={id}
        selectedKey={selectedKey}
        onSelectionChange={(key) => {
          if (key !== null && key !== undefined) {
            onChange(key === '__empty__' ? '' : String(key))
          }
        }}
        isDisabled={disabled}
        placeholder={placeholder}
        className="w-full"
        variant="secondary"
      >
        {label && <Label className="text-sm font-medium">{label}</Label>}
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox items={options} aria-label={label || 'گزینه‌ها'}>
            {(item) => (
              <ListBox.Item id={item.value || '__empty__'} textValue={item.label}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{item.label}</span>
                  {item.isFilling && (
                    <span className="text-xs text-accent font-medium">★ در حال تکمیل</span>
                  )}
                  {item.secondaryLabel && (
                    <span className="text-xs text-muted">{item.secondaryLabel}</span>
                  )}
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  )
}
