'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'
import { jalaliParts } from '../lib/jalali'

interface SessionTelemetry {
  id: number
  title?: string | null
  startsAt: string
  endsAt?: string | null
  status: 'draft' | 'queued' | 'filling' | 'sealed' | 'active' | 'completed' | 'cancelled'
  capacity?: number | null
  acceptedCount?: number
  checkedInCount?: number
}

interface CeremonyTelemetry {
  id: number
  title: string
  attendancePolicy?: 'single' | 'multiple'
  sessions: SessionTelemetry[]
}

const statusLabels: Record<string, { label: string; bg: string; color: string; border: string }> = {
  filling: {
    label: 'در حال دعوت (Filling)',
    bg: '#ecfdf5',
    color: '#065f46',
    border: '#a7f3d0',
  },
  queued: {
    label: 'در صف آماده‌سازی (Queued)',
    bg: '#eff6ff',
    color: '#1e40af',
    border: '#bfdbfe',
  },
  sealed: {
    label: 'بسته‌شده (Sealed)',
    bg: '#fffbeb',
    color: '#92400e',
    border: '#fde68a',
  },
  active: {
    label: 'در حال اجرا (Active)',
    bg: '#f5f3ff',
    color: '#5b21b6',
    border: '#ddd6fe',
  },
  completed: {
    label: 'پایان‌یافته (Completed)',
    bg: '#f3f4f6',
    color: '#374151',
    border: '#e5e7eb',
  },
  draft: {
    label: 'پیش‌نویس',
    bg: '#f9fafb',
    color: '#6b7280',
    border: '#e5e7eb',
  },
  cancelled: {
    label: 'لغوشده',
    bg: '#fef2f2',
    color: '#991b1b',
    border: '#fecaca',
  },
}

export function AdvanceSession() {
  const { id } = useDocumentInfo()
  const [ceremony, setCeremony] = useState<CeremonyTelemetry | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const response = await fetch('/api/panel/context', { credentials: 'include' })
      if (!response.ok) throw new Error('دریافت اطلاعات پایش مراسم انجام نشد.')
      const data = (await response.json()) as { ceremonies: CeremonyTelemetry[] }
      const current = data.ceremonies.find((c) => c.id === Number(id))
      setCeremony(current || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری اطلاعات پایش.')
    }
  }, [id])

  useEffect(() => {
    let ignore = false
    void (async () => {
      if (!id) return
      try {
        const response = await fetch('/api/panel/context', { credentials: 'include' })
        if (!response.ok) return
        const data = (await response.json()) as { ceremonies: CeremonyTelemetry[] }
        const current = data.ceremonies.find((c) => c.id === Number(id))
        if (!ignore) setCeremony(current || null)
      } catch {
        if (!ignore) setError('خطا در بارگذاری اطلاعات پایش.')
      }
    })()
    return () => {
      ignore = true
    }
  }, [id])

  async function handleAdvance(expectedSessionId: number | null) {
    if (!id || busy) return
    const confirmMsg = expectedSessionId
      ? 'آیا از بستن سانس فعلی و پیشروی به سانس بعدی مطمئن هستید؟ اپراتورهای دعوت به سانس بعد هدایت خواهند شد.'
      : 'آیا می‌خواهید دعوت برای اولین سانس آماده آغاز شود؟'

    if (!window.confirm(confirmMsg)) return

    setBusy(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/panel/ceremony/advance', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ceremonyId: Number(id), expectedSessionId }),
      })
      const body = (await response.json()) as { error?: string; session?: { title?: string } }
      if (!response.ok) throw new Error(body.error || 'عملیات پیشروی سانس انجام نشد.')

      setMessage(
        body.session
          ? `پیشروی انجام شد: سانس «${body.session.title || ''}» اکنون در حال دعوت است.`
          : 'دعوت این مراسم بسته شد؛ سانس آماده دیگری وجود ندارد.',
      )
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در پیشروی سانس.')
    } finally {
      setBusy(false)
    }
  }

  async function handleReopen(sessionId: number, sessionTitle?: string | null) {
    if (!id || busy) return
    const confirmMsg = `آیا مطمئن هستید که می‌خواهید سانس «${sessionTitle || 'انتخابی'}» را مجدداً بازگشایی کنید؟ سانس فعال فعلی بسته خواهد شد.`
    if (!window.confirm(confirmMsg)) return

    setBusy(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/panel/ceremony/reopen', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ceremonyId: Number(id), sessionId }),
      })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(body.error || 'بازگشایی سانس انجام نشد.')

      setMessage(`سانس «${sessionTitle || ''}» با موفقیت مجدداً بازگشایی شد.`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بازگشایی سانس.')
    } finally {
      setBusy(false)
    }
  }

  if (!id) return null

  const sessions = ceremony?.sessions || []
  const fillingSession = sessions.find((s) => s.status === 'filling')

  return (
    <div
      dir="rtl"
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        backgroundColor: '#fafafa',
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <h3
            style={{
              margin: '0 0 4px 0',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#111827',
            }}
          >
            پایش و مدیریت زنده سانس‌های مراسم
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
            مشاهده ظرفیت و تعداد دعوت‌های پذیرفته‌شده به همراه کنترل فرآیند پیشروی متوالی
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {ceremony?.attendancePolicy && (
            <span
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 600,
                backgroundColor: ceremony.attendancePolicy === 'single' ? '#eff6ff' : '#f3f4f6',
                color: ceremony.attendancePolicy === 'single' ? '#1d4ed8' : '#374151',
                border: '1px solid #dbeafe',
              }}
            >
              {ceremony.attendancePolicy === 'single'
                ? 'سیاست: تک‌حضوری (Single)'
                : 'سیاست: چندحضوری (Multiple)'}
            </span>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void loadData()}
            style={{
              fontSize: '0.8rem',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#374151',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
          >
            {busy ? 'در حال بارگذاری…' : 'بروزرسانی داده‌ها'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* Operational Primary Action */}
      <div
        style={{
          marginTop: '16px',
          padding: '14px',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div>
          <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>وضعیت جاری دعوت: </span>
          <strong style={{ fontSize: '0.9rem', color: fillingSession ? '#059669' : '#dc2626' }}>
            {fillingSession
              ? `سانس «${fillingSession.title || 'سانس'}» در حال تکمیل است`
              : 'هیچ سانسی در حال تکمیل نیست'}
          </strong>
        </div>

        <button
          type="button"
          disabled={busy || (!fillingSession && sessions.length === 0)}
          onClick={() => void handleAdvance(fillingSession ? fillingSession.id : null)}
          style={{
            fontSize: '0.85rem',
            padding: '8px 18px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: fillingSession ? '#2563eb' : '#059669',
            color: '#ffffff',
            cursor: busy ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
        >
          {busy
            ? 'در حال انجام…'
            : fillingSession
              ? 'پیشروی به سانس بعدی (Advance)'
              : 'آغاز دعوت اولین سانس'}
        </button>
      </div>

      {/* Sessions Cards Grid */}
      <div
        style={{
          marginTop: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '12px',
        }}
      >
        {sessions.map((session) => {
          const cfg = statusLabels[session.status] || statusLabels.draft
          const startParts = jalaliParts(session.startsAt)
          const fillPercent = session.capacity
            ? Math.min(100, Math.round(((session.acceptedCount ?? 0) / session.capacity) * 100))
            : null

          return (
            <div
              key={session.id}
              style={{
                border: session.status === 'filling' ? '2px solid #059669' : '1px solid #e5e7eb',
                borderRadius: '10px',
                padding: '14px',
                backgroundColor: '#ffffff',
                boxShadow:
                  session.status === 'filling' ? '0 4px 6px -1px rgba(5, 150, 105, 0.1)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Card Title & Status Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <strong style={{ fontSize: '0.95rem', color: '#111827' }}>
                  {session.title || `سانس #${session.id}`}
                </strong>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    backgroundColor: cfg.bg,
                    color: cfg.color,
                    border: `1px solid ${cfg.border}`,
                  }}
                >
                  {cfg.label}
                </span>
              </div>

              {/* Start Time */}
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                شروع: {startParts.date} ساعت {startParts.time}
              </div>

              {/* Telemetry Numbers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  backgroundColor: '#f9fafb',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                }}
              >
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '0.7rem' }}>
                    دعوت‌های پذیرفته
                  </span>
                  <strong style={{ color: '#111827' }}>{session.acceptedCount ?? 0} نفر</strong>
                </div>

                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '0.7rem' }}>
                    پذیرش فیزیکی
                  </span>
                  <strong style={{ color: '#111827' }}>{session.checkedInCount ?? 0} نفر</strong>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    marginBottom: '4px',
                    color: '#4b5563',
                  }}
                >
                  <span>
                    ظرفیت اسمی: {session.capacity ? `${session.capacity} نفر` : 'تعیین‌نشده'}
                  </span>
                  {fillPercent !== null && <span>{fillPercent}٪</span>}
                </div>

                {fillPercent !== null && (
                  <div
                    style={{
                      height: '6px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${fillPercent}%`,
                        backgroundColor:
                          fillPercent >= 100
                            ? '#dc2626'
                            : fillPercent >= 80
                              ? '#d97706'
                              : '#059669',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
                {session.status === 'sealed' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleReopen(session.id, session.title)}
                    style={{
                      width: '100%',
                      fontSize: '0.75rem',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #d97706',
                      backgroundColor: '#fffbeb',
                      color: '#92400e',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    بازگشایی مجدد جهت دعوت (Reopen)
                  </button>
                )}

                {session.status === 'queued' && !fillingSession && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleAdvance(null)}
                    style={{
                      width: '100%',
                      fontSize: '0.75rem',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #2563eb',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    شروع دعوت از این سانس
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {sessions.length === 0 && (
        <p
          style={{ marginTop: '16px', fontSize: '0.85rem', color: '#6b7280', textAlign: 'center' }}
        >
          هنوز سانسی برای این مراسم ایجاد نشده است یا وضعیت مراسم پیش‌نویس است.
        </p>
      )}
    </div>
  )
}
