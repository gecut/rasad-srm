'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'
import { jalaliParts } from '../lib/jalali'

interface StudentItem {
  id: number
  firstName: string
  lastName: string
  grade?: number | null
  status: 'unknown' | 'waitlisted' | 'class_seeker' | 'referred_to_teacher' | 'absorbed' | 'stabilized' | 'removed'
  referredAt?: string | null
  mobile?: string | null
  fatherMobile?: string | null
  motherMobile?: string | null
  neighborhood?: { id: number; name: string } | number | null
}

const statusBadges: Record<string, { label: string; bg: string; color: string; border: string }> = {
  unknown: { label: 'نامعلوم', bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
  waitlisted: { label: 'پشت‌خطی', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  class_seeker: { label: 'خواهان کلاس', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  referred_to_teacher: { label: 'به مدرس معرفی شده', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  absorbed: { label: 'جذب شده', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  stabilized: { label: 'تثبیت‌شده', bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  removed: { label: 'حذف شده', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
}

export function ClassStudents() {
  const { id } = useDocumentInfo()
  const [students, setStudents] = useState<StudentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/students?where[currentClass][equals]=${id}&limit=200&depth=1`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('بارگذاری لیست دانش‌آموزان انجام نشد.')
      const data = await res.json()
      setStudents(data.docs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری دانش‌آموزان کلاس.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (!id) return null

  const filtered = students.filter((s) => {
    if (!search.trim()) return true
    const term = search.trim().toLowerCase()
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase()
    const phone = `${s.mobile || ''} ${s.fatherMobile || ''} ${s.motherMobile || ''}`
    return name.includes(term) || phone.includes(term)
  })

  return (
    <div
      dir="rtl"
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '20px',
        marginBottom: '24px',
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
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
            دانش‌آموزان عضو این کلاس
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
            مشاهده پرونده و اطلاعات دانش‌آموزانی که در حال حاضر عضو این کلاس هستند.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.8rem',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontWeight: 700,
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
            }}
          >
            {students.length} دانش‌آموز
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadData()}
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#374151',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
          >
            {loading ? 'در حال بارگذاری…' : 'بروزرسانی لیست'}
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

      {students.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جست‌وجو در نام یا شماره تماس دانش‌آموزان این کلاس…"
            style={{
              width: '100%',
              maxWidth: '360px',
              padding: '8px 12px',
              fontSize: '0.85rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      <div style={{ marginTop: '16px', overflowX: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
            {students.length === 0
              ? 'هنوز دانش‌آموزی به این کلاس منتسب نشده است.'
              : 'دانش‌آموزی با این مشخصات در این کلاس یافت نشد.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', color: '#374151', textAlign: 'right' }}>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>#</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>نام و نام خانوادگی</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>پایه</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>وضعیت</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>تاریخ ارجاع</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>شماره تماس</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>ناحیه شهری</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student, idx) => {
                const badge = statusBadges[student.status] || statusBadges.unknown
                const referredDate = student.referredAt ? jalaliParts(student.referredAt).date : '—'
                const neighborhoodName =
                  typeof student.neighborhood === 'object' && student.neighborhood !== null
                    ? student.neighborhood.name
                    : '—'
                const phone = student.mobile || student.fatherMobile || student.motherMobile || '—'

                return (
                  <tr
                    key={student.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                    }}
                  >
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>
                      {student.firstName} {student.lastName}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{student.grade ? `پایه ${student.grade}` : '—'}</td>
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
                    <td style={{ padding: '10px 12px', color: '#4b5563' }}>{referredDate}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', direction: 'ltr', textAlign: 'right' }}>
                      {phone}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#4b5563' }}>{neighborhoodName}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <a
                        href={`/admin/collections/students/${student.id}`}
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
                        مشاهده پرونده ↗
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
