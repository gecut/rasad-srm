import { useEffect, useRef, useState } from 'react'
import { Button } from '@heroui/react'
import type { PanelContext, ReceptionSearch, ReceptionStudent } from '@rasad/contracts'
import { APIError, errorMessage, normalizePhone, request } from '../lib/api'
import { ErrorNotice, Field, Section } from '../components/ui'
import { formatDate } from '../lib/date'
const emptyForm = {
  firstName: '',
  lastName: '',
  grade: '',
  mobile: '',
  motherMobile: '',
  fatherMobile: '',
}
export function Reception() {
  const [context, setContext] = useState<PanelContext>()
  const [ceremony, setCeremony] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [query, setQuery] = useState('')
  const [students, setStudents] = useState<ReceptionStudent[]>([])
  const [searched, setSearched] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    let active = true
    request<PanelContext>('/panel/context')
      .then((data) => {
        if (active) setContext(data)
      })
      .catch((error) => {
        if (active) setError(errorMessage(error))
      })
    return () => {
      active = false
    }
  }, [])
  const sessions = context?.ceremonies.find((item) => String(item.id) === ceremony)?.sessions || []
  function resetSearch() {
    setStudents([])
    setSearched(false)
    setSuccess('')
    setError('')
  }
  async function search() {
    if (busy || !sessionId || !query.trim()) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const data = await request<ReceptionSearch>(
        `/panel/reception/search?${new URLSearchParams({ ceremonyId: ceremony, sessionId, q: query.trim() })}`,
      )
      setStudents(data.students)
      setSearched(true)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  function completed() {
    setQuery('')
    setStudents([])
    setSearched(false)
    setForm(emptyForm)
    setCreating(false)
    setSuccess('حضور دانش‌آموز ثبت شد.')
    requestAnimationFrame(() => searchRef.current?.focus())
  }
  async function checkIn(studentId: number) {
    if (busy) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await request('/panel/reception/checkin', { studentId, sessionId: Number(sessionId) })
      completed()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  async function create() {
    if (busy) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await request('/panel/reception/walkin', {
        sessionId: Number(sessionId),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        ...(form.grade ? { grade: Number(form.grade) } : {}),
        ...Object.fromEntries(
          (['mobile', 'motherMobile', 'fatherMobile'] as const)
            .filter((key) => form[key].trim())
            .map((key) => [key, normalizePhone(form[key])]),
        ),
      })
      completed()
    } catch (error) {
      setError(errorMessage(error))
      if (
        error instanceof APIError &&
        error.status === 409 &&
        error.details &&
        typeof error.details === 'object' &&
        'candidates' in error.details &&
        Array.isArray(error.details.candidates)
      ) {
        setStudents(error.details.candidates as ReceptionStudent[])
        setSearched(true)
      }
    } finally {
      setBusy(false)
    }
  }
  return (
    <main>
      <h1>پذیرش مراسم</h1>
      <div className="sticky grid">
        <label>
          مراسم
          <select
            disabled={busy}
            value={ceremony}
            onChange={(event) => {
              setCeremony(event.target.value)
              setSessionId('')
              resetSearch()
            }}
          >
            <option value="">مراسم را انتخاب کنید</option>
            {context?.ceremonies.map((item) => (
              <option value={item.id} key={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          سانس پذیرش
          <select
            disabled={busy}
            value={sessionId}
            onChange={(event) => {
              setSessionId(event.target.value)
              resetSearch()
            }}
          >
            <option value="">سانس را انتخاب کنید</option>
            {sessions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title || 'سانس'} — {formatDate(item.startsAt)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorNotice message={error} />
      {success && (
        <p role="status" className="notice">
          {success}
        </p>
      )}
      <form
        className="surface stack"
        onSubmit={(event) => {
          event.preventDefault()
          void search()
        }}
      >
        <label>
          نام یا شماره موبایل دانش‌آموز
          <input
            className="input"
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            required
            placeholder="نام دانش‌آموز را بنویسید"
          />
        </label>
        <div className="row">
          <Button type="submit" isDisabled={busy || !sessionId || !query.trim()}>
            جست‌وجو
          </Button>
          <Button
            variant="secondary"
            isDisabled={busy || !sessionId}
            onPress={() => setCreating(true)}
          >
            دانش‌آموز جدید
          </Button>
        </div>
      </form>
      {searched && students.length === 0 && (
        <p>دانش‌آموزی پیدا نشد. می‌توانید دانش‌آموز جدید ثبت کنید.</p>
      )}
      {students.map((student) => (
        <div className="surface" key={student.id}>
          <div className="row spread">
            <div>
              <strong>
                {student.firstName} {student.lastName}
              </strong>
              <p>
                {student.grade ? `پایه ${student.grade}` : 'پایه ثبت نشده'}{' '}
                {student.phone && (
                  <>
                    — <bdi>{student.phone}</bdi>
                  </>
                )}
              </p>
            </div>
            <Button
              isDisabled={busy || student.checkedIn || !sessionId}
              onPress={() => checkIn(student.id)}
            >
              {student.checkedIn ? 'قبلاً پذیرش شده' : 'ثبت حضور'}
            </Button>
          </div>
          {student.assignedSessionId && student.assignedSessionId !== Number(sessionId) && (
            <p className="notice">
              دعوت این دانش‌آموز برای {student.assignedSessionTitle || 'سانس دیگری'} است. ثبت حضور،
              سانس دعوت را تغییر نمی‌دهد.
            </p>
          )}
        </div>
      ))}
      {creating && (
        <Section title="ثبت دانش‌آموز جدید و حضور">
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault()
              void create()
            }}
          >
            <div className="grid">
              <Field
                required
                label="نام"
                value={form.firstName}
                onChange={(value) => setForm({ ...form, firstName: value })}
              />
              <Field
                required
                label="نام خانوادگی"
                value={form.lastName}
                onChange={(value) => setForm({ ...form, lastName: value })}
              />
              <label>
                پایه (اختیاری)
                <select
                  value={form.grade}
                  onChange={(event) => setForm({ ...form, grade: event.target.value })}
                >
                  <option value="">نامشخص</option>
                  {[1, 2, 3, 4, 5, 6].map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </label>
              {(
                [
                  ['mobile', 'موبایل دانش‌آموز'],
                  ['motherMobile', 'موبایل مادر'],
                  ['fatherMobile', 'موبایل پدر'],
                ] as const
              ).map(([key, label]) => (
                <Field
                  key={key}
                  type="tel"
                  label={`${label} (اختیاری)`}
                  value={form[key]}
                  onChange={(value) => setForm({ ...form, [key]: value })}
                />
              ))}
            </div>
            <div className="row">
              <Button
                type="submit"
                isDisabled={busy || !sessionId || !form.firstName.trim() || !form.lastName.trim()}
              >
                ثبت دانش‌آموز و حضور
              </Button>
              <Button variant="secondary" isDisabled={busy} onPress={() => setCreating(false)}>
                بستن
              </Button>
            </div>
          </form>
        </Section>
      )}
    </main>
  )
}
