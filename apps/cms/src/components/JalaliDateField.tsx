'use client'
import { useField } from '@payloadcms/ui'
import type { DateFieldClientComponent } from 'payload'
import { useState } from 'react'
import { jalaliInstant, jalaliParts } from '../lib/jalali'

export const JalaliDateField: DateFieldClientComponent = ({ path, field, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<string>({ path })
  const [prevValue, setPrevValue] = useState(value)
  const initial = jalaliParts(value)
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [error, setError] = useState('')

  if (value !== prevValue) {
    setPrevValue(value)
    const parts = jalaliParts(value)
    setDate(parts.date)
    setTime(parts.time)
  }

  function change(nextDate: string, nextTime: string) {
    setDate(nextDate)
    setTime(nextTime)
    if (!nextDate && !field.required) {
      setValue(null)
      setError('')
      return
    }
    try {
      const effectiveTime = nextTime && nextTime.trim() !== '' ? nextTime : '12:00'
      setValue(jalaliInstant(nextDate, effectiveTime))
      setError('')
    } catch {
      setError('تاریخ شمسی معتبر وارد کنید (مثال: ۱۴۰۴/۰۷/۰۲).')
      setValue(null)
    }
  }

  const label = typeof field.label === 'string' ? field.label : 'تاریخ و ساعت'
  return (
    <fieldset className="field-type" dir="rtl" style={{ border: 0, padding: 0, marginBottom: 20 }}>
      <legend style={{ marginBottom: 8, fontWeight: 500 }}>
        {label}
        {field.required ? ' *' : ''}
        <span style={{ fontSize: '0.8em', opacity: 0.7, marginRight: 6 }}>(به وقت تهران)</span>
      </legend>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85em' }}>
          <span>تاریخ شمسی</span>
          <input
            aria-label={`${label} تاریخ شمسی`}
            dir="ltr"
            placeholder="۱۴۰۴/۰۷/۰۲"
            value={date}
            disabled={readOnly}
            onChange={(e) => change(e.target.value, time)}
            required={field.required}
            style={{
              padding: '6px 10px',
              borderRadius: 4,
              border: '1px solid var(--theme-elevation-200, #ccc)',
              backgroundColor: readOnly ? 'var(--theme-elevation-100, #f5f5f5)' : 'transparent',
              textAlign: 'center',
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85em' }}>
          <span>ساعت</span>
          <input
            aria-label={`${label} ساعت`}
            type="time"
            value={time}
            disabled={readOnly}
            onChange={(e) => change(date, e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 4,
              border: '1px solid var(--theme-elevation-200, #ccc)',
              backgroundColor: readOnly ? 'var(--theme-elevation-100, #f5f5f5)' : 'transparent',
            }}
          />
        </label>
      </div>
      {(error || showError) && (
        <p
          role="alert"
          style={{ color: 'var(--theme-error-500, #e53e3e)', fontSize: '0.85em', marginTop: 4 }}
        >
          {error || errorMessage}
        </p>
      )}
    </fieldset>
  )
}
