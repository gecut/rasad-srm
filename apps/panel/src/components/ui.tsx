import { Alert, Chip, Input, Label, TextArea, TextField } from '@heroui/react'

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  name,
  placeholder,
  dir,
  inputMode,
  autoFocus,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'password' | 'tel' | 'number'
  required?: boolean
  name?: string
  placeholder?: string
  dir?: 'ltr' | 'rtl'
  inputMode?: 'text' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
  autoFocus?: boolean
}) {
  return (
    <TextField
      isRequired={required}
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      className="w-full"
    >
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <Input
        autoFocus={autoFocus}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'current-password' : type === 'tel' ? 'tel' : 'off'}
        dir={dir || (type === 'tel' ? 'ltr' : undefined)}
        inputMode={inputMode || (type === 'tel' ? 'numeric' : undefined)}
      />
    </TextField>
  )
}

export function TextareaField({
  label,
  value,
  onChange,
  required = false,
  name,
  placeholder,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  name?: string
  placeholder?: string
  rows?: number
}) {
  return (
    <TextField
      isRequired={required}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full"
    >
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <TextArea rows={rows} placeholder={placeholder} />
    </TextField>
  )
}

export function ErrorNotice({ message, title = 'خطا' }: { message?: string; title?: string }) {
  if (!message) return null
  return (
    <Alert status="danger" role="alert" className="my-2">
      <Alert.Indicator />
      <Alert.Content>
        {title && <Alert.Title>{title}</Alert.Title>}
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  )
}

export function SuccessNotice({
  message,
  title = 'موفقیت‌آمیز',
}: {
  message?: string
  title?: string
}) {
  if (!message) return null
  return (
    <Alert status="success" role="status" className="my-2">
      <Alert.Indicator />
      <Alert.Content>
        {title && <Alert.Title>{title}</Alert.Title>}
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  )
}

export function StatusChip({
  status,
  label,
}: {
  status: 'accepted' | 'absorbed' | 'referred' | 'removed' | 'warning' | 'filling' | 'default'
  label: string
}) {
  const colorMap = {
    accepted: 'success',
    absorbed: 'success',
    filling: 'accent',
    referred: 'accent',
    warning: 'warning',
    removed: 'danger',
    default: 'default',
  } as const

  return (
    <Chip color={colorMap[status] || 'default'} variant="soft">
      {label}
    </Chip>
  )
}
