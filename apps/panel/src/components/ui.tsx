import type { ReactNode } from 'react'
import { Input, Label, TextField } from '@heroui/react'
export function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  name,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'password' | 'tel'
  required?: boolean
  name?: string
}) {
  return (
    <TextField isRequired={required} name={name} value={value} onChange={onChange} type={type}>
      <Label>{label}</Label>
      <Input
        autoComplete={type === 'password' ? 'current-password' : type === 'tel' ? 'tel' : 'off'}
        dir={type === 'tel' ? 'ltr' : undefined}
      />
    </TextField>
  )
}
export function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="notice error">
      {message}
    </p>
  ) : null
}
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
