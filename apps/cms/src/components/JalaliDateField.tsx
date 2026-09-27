'use client'
import { useField } from '@payloadcms/ui'
import type { DateFieldClientComponent } from 'payload'
import { useState } from 'react'
import { jalaliInstant, jalaliParts } from '../lib/jalali'
export const JalaliDateField: DateFieldClientComponent = ({ path, field, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<string>({ path })
  const initial = jalaliParts(value)
  const [date, setDate] = useState(initial.date),
    [time, setTime] = useState(initial.time),
    [error, setError] = useState('')
  function change(nextDate: string, nextTime: string) {
    setDate(nextDate)
    setTime(nextTime)
    if (!nextDate && !field.required) {
      setValue(null)
      setError('')
      return
    }
    try {
      setValue(jalaliInstant(nextDate, nextTime))
      setError('')
    } catch {
      setError('تاریخ شمسی و ساعت را کامل و معتبر وارد کنید.')
      setValue(null)
    }
  }
  const label = typeof field.label === 'string' ? field.label : 'تاریخ و ساعت'
  return (
    <fieldset className="field-type" dir="rtl" style={{ border: 0, padding: 0, marginBottom: 20 }}>
      <legend>
        {label}
        {field.required ? ' *' : ''} — به وقت تهران
      </legend>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <label>
          تاریخ شمسی
          <input
            aria-label={`${label} تاریخ شمسی`}
            dir="ltr"
            placeholder="۱۴۰۵/۰۷/۰۲"
            value={date}
            disabled={readOnly}
            onChange={(e) => change(e.target.value, time)}
            required={field.required}
          />
        </label>
        <label>
          ساعت
          <input
            aria-label={`${label} ساعت`}
            type="time"
            value={time}
            disabled={readOnly}
            onChange={(e) => change(date, e.target.value)}
            required={field.required}
          />
        </label>
      </div>
      {(error || showError) && <p role="alert">{error || errorMessage}</p>}
    </fieldset>
  )
}
