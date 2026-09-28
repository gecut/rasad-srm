import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Chip, Modal } from '@heroui/react'
import type { PanelContext, ReceptionSearch, ReceptionStudent } from '@rasad/contracts'
import { APIError, errorMessage, normalizePhone, request } from '../lib/api'
import { ErrorNotice, Field, SuccessNotice } from '../components/ui'
import { formatDate } from '../lib/date'
import { DangerCircleIcon, MagnifierIcon, UserCheckIcon, UserPlusIcon } from '../components/icons'
import { ReceptionRow } from './_reception-row'

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
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searched, setSearched] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [candidates, setCandidates] = useState<ReceptionStudent[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [modalError, setModalError] = useState('')
  const [success, setSuccess] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    request<PanelContext>('/panel/context')
      .then((data) => {
        if (active) setContext(data)
      })
      .catch((err) => {
        if (active) setError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [])

  // Auto-focus search input with '/' or 'F2' (guarded when modal is open or typing in form controls)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (creating) return
      if (event.key === '/' || event.key === 'F2') {
        const target = event.target as HTMLElement | null
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.tagName === 'BUTTON' ||
            target.isContentEditable)
        ) {
          return
        }
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [creating])

  const sessions = context?.ceremonies.find((item) => String(item.id) === ceremony)?.sessions || []
  const activeSession = sessions.find((item) => String(item.id) === sessionId)

  function resetSearch() {
    setStudents([])
    setSelectedIndex(0)
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
        `/panel/reception/search?${new URLSearchParams({
          ceremonyId: ceremony,
          sessionId,
          q: query.trim(),
        })}`,
      )
      setStudents(data.students)
      setSelectedIndex(0)
      setSearched(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function completed() {
    setQuery('')
    setStudents([])
    setSelectedIndex(0)
    setSearched(false)
    setForm(emptyForm)
    setCreating(false)
    setCandidates([])
    setModalError('')
    setSuccess('حضور دانش‌آموز با موفقیت ثبت شد.')
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
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function createWalkIn() {
    if (busy) return
    setBusy(true)
    setModalError('')
    setCandidates([])
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
    } catch (err) {
      if (
        err instanceof APIError &&
        err.status === 409 &&
        err.details &&
        typeof err.details === 'object' &&
        'candidates' in err.details &&
        Array.isArray(err.details.candidates)
      ) {
        setCandidates(err.details.candidates as ReceptionStudent[])
        setModalError('دانش‌آموز مشابه یافت شد. لطفاً بررسی کنید.')
      } else {
        setModalError(errorMessage(err))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Reception Context Bar */}
      <Card className="border border-border bg-surface shadow-xs">
        <Card.Header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <Card.Title className="text-xl font-bold">پذیرش و ورود به مراسم</Card.Title>
            <Card.Description className="text-sm text-muted">
              جست‌وجوی سریع مهمانان و ثبت حضور فیزیکی در سانس
            </Card.Description>
          </div>

          {activeSession && (
            <div className="flex items-center gap-2 bg-surface/80 border border-border px-3 py-1 rounded-lg text-sm">
              <span className="text-muted">سانس ورودی:</span>
              <strong className="text-foreground">{activeSession.title || 'سانس'}</strong>
              <Chip color="accent" variant="soft">
                {formatDate(activeSession.startsAt)}
              </Chip>
            </div>
          )}
        </Card.Header>

        <Card.Content className="pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reception-ceremony" className="text-sm font-medium text-foreground">
                انتخاب مراسم
              </label>
              <select
                id="reception-ceremony"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-2 focus:outline-accent"
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
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reception-session" className="text-sm font-medium text-foreground">
                سانس پذیرش فیزیکی
              </label>
              <select
                id="reception-session"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-2 focus:outline-accent"
                disabled={busy || !ceremony}
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
            </div>
          </div>
        </Card.Content>
      </Card>

      <ErrorNotice message={error} />
      <SuccessNotice message={success} />

      {/* Command Search Bar */}
      <Card className="border border-border bg-surface">
        <Card.Content className="pt-5">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void search()
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reception-search-input" className="text-sm font-medium text-foreground">
                نام یا شماره موبایل دانش‌آموز
              </label>
              <div className="relative flex items-center">
                <div className="absolute right-3 pointer-events-none flex items-center text-muted">
                  <MagnifierIcon className="size-5" />
                </div>
                <input
                  id="reception-search-input"
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    if (searched) setSearched(false)
                  }}
                  onKeyDown={(event) => {
                    if (searched && students.length > 0) {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault()
                        setSelectedIndex((prev) => (prev + 1) % students.length)
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault()
                        setSelectedIndex((prev) => (prev - 1 + students.length) % students.length)
                      } else if (event.key === 'Enter') {
                        event.preventDefault()
                        const targetStudent = students[selectedIndex] ?? students[0]
                        if (targetStudent && !targetStudent.checkedIn) {
                          void checkIn(targetStudent.id)
                        }
                      }
                    }
                  }}
                  placeholder="نام دانش‌آموز یا شماره موبایل را وارد کنید... (کلید / برای جست‌وجو)"
                  className="w-full rounded-lg border border-border bg-surface pr-10 pl-4 py-2.5 text-base text-foreground focus:outline-2 focus:outline-accent"
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isDisabled={busy || !sessionId || !query.trim()}
              >
                {busy ? 'در حال جست‌وجو…' : 'جست‌وجو'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                isDisabled={busy || !sessionId}
                onPress={() => {
                  setCandidates([])
                  setModalError('')
                  setCreating(true)
                }}
                className="flex items-center gap-1.5"
              >
                <UserPlusIcon className="size-4" />
                <span>دانش‌آموز جدید (مهمان)</span>
              </Button>

              {!sessionId && (
                <span className="text-xs text-muted">
                  برای جست‌وجو یا ثبت دانش‌آموز جدید، ابتدا سانس را انتخاب کنید.
                </span>
              )}
            </div>
          </form>
        </Card.Content>
      </Card>

      {/* Search Results */}
      {searched && students.length === 0 && (
        <Alert status="default" className="my-2">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>دانش‌آموزی یافت نشد</Alert.Title>
            <Alert.Description>
              دانش‌آموزی با این مشخصات پیدا نشد. می‌توانید با دکمه «دانش‌آموز جدید (مهمان)» او را سریعاً ثبت کنید.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {students.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>نتایج جست‌وجو ({students.length} مورد)</span>
            <span className="hidden sm:inline font-normal">
              با کلیدهای ↑ و ↓ جابه‌جا شوید و با Enter حضور را ثبت کنید
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {students.map((student, index) => (
              <ReceptionRow
                key={student.id}
                student={student}
                currentSessionId={sessionId}
                isSelected={index === selectedIndex}
                busy={busy}
                onCheckIn={checkIn}
              />
            ))}
          </div>
        </div>
      )}

      {/* Walk-in Registration Modal */}
      <Modal.Backdrop isOpen={creating} onOpenChange={setCreating}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>ثبت دانش‌آموز جدید و پذیرش</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-4">
              <p className="text-xs text-muted">
                مشخصات دانش‌آموز جدید (مهمان بدون دعوت قبلی) را وارد کنید تا همزمان ثبت و در سانس جاری پذیرش شود.
              </p>

              {modalError && <ErrorNotice message={modalError} />}

              {/* 409 Duplicate candidates picker */}
              {candidates.length > 0 && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <DangerCircleIcon className="size-4 text-warning shrink-0" />
                    <span className="text-xs font-semibold text-warning">
                      دانش‌آموز(انی) با این نام یا شماره تماس از قبل در سامانه وجود دارد:
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {candidates.map((cand) => (
                      <div
                        key={cand.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-surface border border-border text-xs"
                      >
                        <div>
                          <strong className="text-foreground">
                            {cand.firstName} {cand.lastName}
                          </strong>
                          {cand.grade && <span className="text-muted mr-1.5">(پایه {cand.grade})</span>}
                          {cand.phone && (
                            <span className="text-muted block text-xs font-mono" dir="ltr">
                              <bdi>{cand.phone}</bdi>
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="primary"
                          isDisabled={busy}
                          onPress={() => {
                            void checkIn(cand.id)
                          }}
                          className="flex items-center gap-1.5"
                        >
                          <UserCheckIcon className="size-3.5" />
                          <span>ثبت حضور همین فرد</span>
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-surface/80 rounded-md p-2.5 border border-border/60 text-xs text-muted leading-relaxed">
                    💡 <strong>تشابه اسمی واقعی؟</strong> اگر این شخص مهمان جدیدی است و تنها تشابه اسمی دارد، لطفاً در فیلد نام‌خانوادگی مشخصه تمایز (مانند نام پدر یا پسوند) را درج فرمایید تا در سامانه تفکیک شود.
                  </div>
                </div>
              )}

              <form
                id="walkin-form"
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  void createWalkIn()
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    required
                    label="نام"
                    value={form.firstName}
                    onChange={(val) => setForm({ ...form, firstName: val })}
                    placeholder="مثال: علی"
                  />
                  <Field
                    required
                    label="نام خانوادگی"
                    value={form.lastName}
                    onChange={(val) => setForm({ ...form, lastName: val })}
                    placeholder="مثال: رضایی"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="walkin-grade" className="text-sm font-medium text-foreground">
                    پایه تحصیلی (اختیاری)
                  </label>
                  <select
                    id="walkin-grade"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-2 focus:outline-accent"
                    value={form.grade}
                    onChange={(event) => setForm({ ...form, grade: event.target.value })}
                  >
                    <option value="">نامشخص</option>
                    {[1, 2, 3, 4, 5, 6].map((grade) => (
                      <option key={grade} value={grade}>
                        پایه {grade}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field
                    type="tel"
                    label="موبایل دانش‌آموز"
                    value={form.mobile}
                    onChange={(val) => setForm({ ...form, mobile: val })}
                    placeholder="اختیاری"
                  />
                  <Field
                    type="tel"
                    label="موبایل مادر"
                    value={form.motherMobile}
                    onChange={(val) => setForm({ ...form, motherMobile: val })}
                    placeholder="اختیاری"
                  />
                  <Field
                    type="tel"
                    label="موبایل پدر"
                    value={form.fatherMobile}
                    onChange={(val) => setForm({ ...form, fatherMobile: val })}
                    placeholder="اختیاری"
                  />
                </div>
              </form>
            </Modal.Body>

            <Modal.Footer className="flex items-center justify-end gap-2">
              <Button variant="outline" isDisabled={busy} onPress={() => setCreating(false)}>
                انصراف
              </Button>
              <Button
                form="walkin-form"
                type="submit"
                variant="primary"
                isDisabled={busy || !sessionId || !form.firstName.trim() || !form.lastName.trim()}
                className="flex items-center gap-1.5"
              >
                <UserPlusIcon className="size-4" />
                <span>{busy ? 'در حال ثبت…' : 'ثبت دانش‌آموز و حضور'}</span>
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  )
}
