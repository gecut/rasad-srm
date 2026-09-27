'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import { useState } from 'react'
export function AdvanceSession() {
  const { id } = useDocumentInfo()
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  async function advance() {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/panel/context', { credentials: 'include' })
      if (!response.ok) throw new Error('دریافت اطلاعات مراسم انجام نشد.')
      const data = (await response.json()) as {
        ceremonies: { id: number; sessions: { id: number; status: string }[] }[]
      }
      const ceremony = data.ceremonies.find((c) => c.id === Number(id))
      if (!ceremony)
        throw new Error('ابتدا وضعیت مراسم را زمان‌بندی‌شده یا در حال دعوت انتخاب و ذخیره کنید.')
      const current = ceremony.sessions.find((s) => s.status === 'filling')
      if (
        !window.confirm(
          current
            ? 'سانس فعلی بسته شود و دعوت به سانس بعدی برود؟'
            : 'دعوت برای اولین سانس آماده آغاز شود؟',
        )
      )
        return
      const result = await fetch('/api/panel/ceremony/advance', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ceremonyId: Number(id), expectedSessionId: current?.id ?? null }),
      })
      const body = (await result.json()) as { error?: string; session?: unknown }
      if (!result.ok) throw new Error(body.error || 'عملیات انجام نشد.')
      setMessage(
        body.session
          ? 'سانس بعدی برای دعوت فعال شد.'
          : 'دعوت بسته شد؛ سانس آماده دیگری وجود ندارد.',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'عملیات انجام نشد.')
    } finally {
      setBusy(false)
    }
  }
  return id ? (
    <div>
      <button type="button" disabled={busy} onClick={() => void advance()}>
        آغاز دعوت / پیشروی سانس
      </button>
      <p role="status">{message}</p>
    </div>
  ) : null
}
