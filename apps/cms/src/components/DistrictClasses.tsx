'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

interface ClassItem {
  id: number
  title: string
  status: string
  capacity?: number | null
  primaryTeacher?: { id: number; firstName: string; lastName: string } | number | null
}

const statusLabels: Record<string, { label: string; bg: string; color: string; border: string }> = {
  active: { label: 'فعال', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  planned: { label: 'برنامه‌ریزی‌شده', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  admissions_paused: { label: 'توقف پذیرش', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  transition_to_preliminaries: { label: 'انتقال به مقدمات', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  suspended: { label: 'معلق', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  ended: { label: 'پایان‌یافته', bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb' },
  cancelled: { label: 'لغوشده', bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
}

export function DistrictClasses() {
  const { id } = useDocumentInfo()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/classes?where[neighborhood][equals]=${id}&limit=100&depth=1`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('بارگذاری لیست کلاس‌های ناحیه انجام نشد.')
      const data = await res.json()
      setClasses(data.docs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری کلاس‌های این ناحیه.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (!id) return null

  return (
    <div
      dir="rtl"
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '20px',
        marginBottom: '20px',
        backgroundColor: '#fafafa',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          paddingBottom: '14px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
            کلاس‌های مستقر در این ناحیه شهری
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
            لیست کلاس‌هایی که محدوده برگزاری آن‌ها این ناحیه شهری تعیین شده است.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.8rem',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontWeight: 700,
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
            }}
          >
            {classes.length} کلاس
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadData()}
            style={{
              fontSize: '0.8rem',
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#374151',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
          >
            {loading ? 'در حال دریافت…' : 'بروزرسانی'}
          </button>
        </div>
      </div>

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
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: '14px', overflowX: 'auto' }}>
        {classes.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
            هیچ کلاسی در این ناحیه شهری ثبت نشده است.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', color: '#374151', textAlign: 'right' }}>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>#</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>عنوان کلاس</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>مدرس اصلی</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>وضعیت</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>ظرفیت</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls, idx) => {
                const badge = statusLabels[cls.status] || { label: cls.status, bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' }
                const teacherName =
                  typeof cls.primaryTeacher === 'object' && cls.primaryTeacher !== null
                    ? `${cls.primaryTeacher.firstName || ''} ${cls.primaryTeacher.lastName || ''}`.trim()
                    : '—'

                return (
                  <tr
                    key={cls.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                    }}
                  >
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>{cls.title}</td>
                    <td style={{ padding: '10px 12px', color: '#374151' }}>{teacherName}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#4b5563' }}>{cls.capacity ? `${cls.capacity} نفر` : '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <a
                        href={`/admin/collections/classes/${cls.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          fontWeight: 600,
                          textDecoration: 'none',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        مشاهده کلاس ↗
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
