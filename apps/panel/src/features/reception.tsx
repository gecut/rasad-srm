import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Chip,
  Label,
  Modal,
  SearchField,
} from '@heroui/react'
import type { PanelContext, ReceptionSearch, ReceptionStudent } from '@rasad/contracts'
import { APIError, errorMessage, normalizePhone, request } from '../lib/api'
import { ErrorNotice, Field, SuccessNotice } from '../components/ui'
import { formatDate } from '../lib/date'
import {
  CheckSquareIcon,
  DangerCircleIcon,
  EditIcon,
  UserCheckIcon,
  UserPlusIcon,
} from '../components/icons'
import { ReceptionRow } from './_reception-row'
import { PanelSelect } from '../components/panel-select'

const emptyForm = {
  firstName: '',
  lastName: '',
  grade: '',
  mobile: '',
  motherMobile: '',
  fatherMobile: '',
  landline: '',
  neighborhoodId: '',
  address: '',
  referrer: '',
  notes: '',
  isClassSeeker: false,
}

const emptyEditForm = {
  firstName: '',
  lastName: '',
  grade: '',
  mobile: '',
  motherMobile: '',
  fatherMobile: '',
  landline: '',
  neighborhoodId: '',
  address: '',
  referrer: '',
  notes: '',
  isClassSeeker: false,
}

interface AttendanceConflict {
  studentId: number
  studentName: string
  ceremonyTitle: string
  sessionTitle?: string | null
  checkedInAt: string
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
  const [editingStudent, setEditingStudent] = useState<ReceptionStudent | null>(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [attendanceConflict, setAttendanceConflict] = useState<AttendanceConflict | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [modalError, setModalError] = useState('')
  const [editError, setEditError] = useState('')
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

  // Auto-focus search input with '/' or 'F2' (guarded when modals are open or typing in form controls)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (creating || editingStudent || attendanceConflict) return
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
  }, [creating, editingStudent, attendanceConflict])

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

  function completed(msg = 'حضور دانش‌آموز با موفقیت ثبت شد.') {
    setQuery('')
    setStudents([])
    setSelectedIndex(0)
    setSearched(false)
    setForm(emptyForm)
    setCreating(false)
    setModalError('')
    setSuccess(msg)

    // Increment local session attendee count for live feedback
    if (sessionId) {
      setContext((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          ceremonies: prev.ceremonies.map((c) => ({
            ...c,
            sessions: c.sessions.map((s) =>
              String(s.id) === sessionId
                ? { ...s, checkedInCount: (s.checkedInCount ?? 0) + 1 }
                : s,
            ),
          })),
        }
      })
    }

    requestAnimationFrame(() => searchRef.current?.focus())
  }

  async function checkIn(studentId: number, forceOverride = false) {
    if (busy) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await request('/panel/reception/checkin', {
        studentId,
        sessionId: Number(sessionId),
        forceOverride,
      })
      completed()
    } catch (err) {
      // Check for multi-attendance violation
      if (
        err instanceof APIError &&
        err.status === 409 &&
        err.details &&
        typeof err.details === 'object' &&
        'candidates' in err.details &&
        Array.isArray(err.details.candidates) &&
        err.details.candidates[0] &&
        'ceremonyTitle' in err.details.candidates[0]
      ) {
        const prev = err.details.candidates[0] as {
          ceremonyTitle: string
          sessionTitle?: string | null
          checkedInAt: string
        }
        const st = students.find((s) => s.id === studentId)
        setAttendanceConflict({
          studentId,
          studentName: st ? `${st.firstName} ${st.lastName}` : 'دانش‌آموز',
          ceremonyTitle: prev.ceremonyTitle,
          sessionTitle: prev.sessionTitle,
          checkedInAt: prev.checkedInAt,
        })
      } else {
        setError(errorMessage(err))
      }
    } finally {
      setBusy(false)
    }
  }

  async function createWalkIn() {
    if (busy) return
    setBusy(true)
    setModalError('')
    try {
      await request('/panel/reception/walkin', {
        sessionId: Number(sessionId),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        ...(form.grade ? { grade: Number(form.grade) } : {}),
        ...(form.neighborhoodId ? { neighborhoodId: Number(form.neighborhoodId) } : {}),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        ...(form.referrer.trim() ? { referrer: form.referrer.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        ...(form.landline.trim() ? { landline: form.landline.trim() } : {}),
        ...(form.isClassSeeker ? { isClassSeeker: true } : {}),
        ...Object.fromEntries(
          (['mobile', 'motherMobile', 'fatherMobile'] as const)
            .filter((key) => form[key].trim())
            .map((key) => [key, normalizePhone(form[key])]),
        ),
      })
      completed()
    } catch (err) {
      setModalError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function openQuickEdit(student: ReceptionStudent) {
    setEditingStudent(student)
    setEditError('')
    setEditForm({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      grade: student.grade ? String(student.grade) : '',
      mobile: student.mobile || student.phone || '',
      motherMobile: student.motherMobile || '',
      fatherMobile: student.fatherMobile || '',
      landline: student.landline || '',
      neighborhoodId: student.neighborhoodId ? String(student.neighborhoodId) : '',
      address: student.address || '',
      referrer: student.referrer || '',
      notes: student.notes || '',
      isClassSeeker: false,
    })
  }

  async function saveQuickEdit() {
    if (!editingStudent || busy) return
    setBusy(true)
    setEditError('')
    try {
      await request('/panel/reception/student/update', {
        studentId: editingStudent.id,
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        grade: editForm.grade ? Number(editForm.grade) : null,
        mobile: editForm.mobile.trim() ? normalizePhone(editForm.mobile) : null,
        motherMobile: editForm.motherMobile.trim() ? normalizePhone(editForm.motherMobile) : null,
        fatherMobile: editForm.fatherMobile.trim() ? normalizePhone(editForm.fatherMobile) : null,
        landline: editForm.landline.trim() || null,
        neighborhoodId: editForm.neighborhoodId ? Number(editForm.neighborhoodId) : null,
        address: editForm.address.trim() || null,
        referrer: editForm.referrer.trim() || null,
        notes: editForm.notes.trim() || null,
        isClassSeeker: editForm.isClassSeeker,
      })

      const targetNeighborhood = context?.neighborhoods?.find(
        (n) => n.id === Number(editForm.neighborhoodId),
      )

      // Update local students list immediately
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editingStudent.id
            ? {
                ...s,
                firstName: editForm.firstName.trim() || s.firstName,
                lastName: editForm.lastName.trim() || s.lastName,
                grade: editForm.grade ? Number(editForm.grade) : null,
                mobile: editForm.mobile.trim() ? normalizePhone(editForm.mobile) : null,
                motherMobile: editForm.motherMobile.trim()
                  ? normalizePhone(editForm.motherMobile)
                  : null,
                fatherMobile: editForm.fatherMobile.trim()
                  ? normalizePhone(editForm.fatherMobile)
                  : null,
                landline: editForm.landline.trim() || null,
                phone: editForm.mobile.trim()
                  ? normalizePhone(editForm.mobile)
                  : editForm.fatherMobile.trim()
                    ? normalizePhone(editForm.fatherMobile)
                    : editForm.motherMobile.trim()
                      ? normalizePhone(editForm.motherMobile)
                      : s.phone,
                neighborhoodId: editForm.neighborhoodId ? Number(editForm.neighborhoodId) : null,
                neighborhoodName:
                  targetNeighborhood?.name || (editForm.neighborhoodId ? s.neighborhoodName : null),
                address: editForm.address.trim() || null,
                referrer: editForm.referrer.trim() || null,
                notes: editForm.notes.trim() || null,
              }
            : s,
        ),
      )

      setEditingStudent(null)
      setSuccess('اطلاعات دانش‌آموز با موفقیت به‌روزرسانی شد.')
    } catch (err) {
      setEditError(errorMessage(err))
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
              جست‌وجوی سریع مهمانان، ویرایش مشخصات و ثبت حضور فیزیکی در سانس
            </Card.Description>
          </div>

          {activeSession && (
            <div className="flex flex-wrap items-center gap-3 bg-surface/80 border border-border px-3 py-1.5 rounded-lg text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted">سانس:</span>
                <strong className="text-foreground">{activeSession.title || 'سانس'}</strong>
                <Chip color="accent" variant="soft" size="sm">
                  {formatDate(activeSession.startsAt)}
                </Chip>
              </div>

              <div className="flex items-center gap-1.5 mr-auto">
                <span className="text-muted">حاضرین:</span>
                {activeSession.capacity ? (
                  <Chip
                    size="sm"
                    color={
                      (activeSession.checkedInCount ?? 0) >= activeSession.capacity
                        ? 'danger'
                        : (activeSession.checkedInCount ?? 0) >= activeSession.capacity * 0.8
                          ? 'warning'
                          : 'success'
                    }
                    variant="soft"
                    className="font-medium"
                  >
                    {activeSession.checkedInCount ?? 0} / {activeSession.capacity} (
                    {Math.round(
                      ((activeSession.checkedInCount ?? 0) / activeSession.capacity) * 100,
                    )}
                    ٪)
                  </Chip>
                ) : (
                  <Chip size="sm" color="default" variant="soft">
                    {activeSession.checkedInCount ?? 0} نفر
                  </Chip>
                )}
              </div>
            </div>
          )}
        </Card.Header>

        <Card.Content className="pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PanelSelect
              id="reception-ceremony"
              label="انتخاب مراسم"
              value={ceremony}
              placeholder="مراسم را انتخاب کنید"
              disabled={busy}
              options={
                context?.ceremonies.map((item) => ({
                  value: String(item.id),
                  label: item.title,
                })) || []
              }
              onChange={(val) => {
                setCeremony(val)
                setSessionId('')
                resetSearch()
              }}
            />

            <PanelSelect
              id="reception-session"
              label="سانس پذیرش فیزیکی"
              value={sessionId}
              placeholder="سانس را انتخاب کنید"
              disabled={busy || !ceremony}
              options={sessions.map((item) => ({
                value: String(item.id),
                label: item.title || 'سانس',
                isFilling: item.status === 'filling',
                secondaryLabel: `${formatDate(item.startsAt)}${item.capacity ? ` (${item.checkedInCount ?? 0} / ${item.capacity})` : ` (${item.checkedInCount ?? 0} نفر)`}`,
              }))}
              onChange={(val) => {
                setSessionId(val)
                resetSearch()
              }}
            />
          </div>

          {sessions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted">
                  تفکیک آمار حاضرین در سانس‌های مراسم:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">مجموع کل حاضرین این مراسم:</span>
                  <Chip size="sm" variant="soft" color="accent" className="font-bold">
                    {sessions.reduce((sum, s) => sum + (s.checkedInCount ?? 0), 0)} نفر
                    {sessions.reduce((sum, s) => sum + (s.capacity ?? 0), 0) > 0
                      ? ` (از ظرفیت کل ${sessions.reduce((sum, s) => sum + (s.capacity ?? 0), 0)})`
                      : ''}
                  </Chip>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {sessions.map((s) => {
                  const isCurrent = String(s.id) === sessionId
                  const fillRatio = s.capacity
                    ? Math.round(((s.checkedInCount ?? 0) / s.capacity) * 100)
                    : null
                  return (
                    <Card
                      key={s.id}
                      role="button"
                      tabIndex={busy ? -1 : 0}
                      aria-pressed={isCurrent}
                      aria-disabled={busy}
                      onClick={() => {
                        if (busy) return
                        setSessionId(String(s.id))
                        resetSearch()
                      }}
                      onKeyDown={(event) => {
                        if (busy) return
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSessionId(String(s.id))
                          resetSearch()
                        }
                      }}
                      className={`transition-all border text-right cursor-pointer select-none ${
                        isCurrent
                          ? 'border-accent bg-accent/10 ring-2 ring-accent'
                          : 'border-border bg-surface hover:bg-surface-secondary/40'
                      }`}
                    >
                      <Card.Content className="p-2.5 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs gap-1">
                          <strong className="truncate text-foreground font-bold">
                            {s.title || 'سانس'}
                          </strong>
                          {s.status === 'filling' && (
                            <Chip size="sm" variant="soft" color="accent" className="text-[10px] h-4 px-1 shrink-0">
                              در حال تکمیل
                            </Chip>
                          )}
                        </div>
                        <span className="text-[11px] text-muted truncate">
                          {formatDate(s.startsAt)}
                        </span>
                        <div className="flex items-center justify-between text-[11px] pt-1 mt-1 border-t border-border/50">
                          <span className="text-muted">حاضرین:</span>
                          <span
                            className={`font-semibold ${
                              fillRatio && fillRatio >= 100
                                ? 'text-danger'
                                : fillRatio && fillRatio >= 80
                                  ? 'text-warning'
                                  : 'text-foreground'
                            }`}
                          >
                            {s.checkedInCount ?? 0} {s.capacity ? `/ ${s.capacity}` : 'نفر'}
                            {fillRatio !== null ? ` (${fillRatio}٪)` : ''}
                          </span>
                        </div>
                      </Card.Content>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
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
            <SearchField
              value={query}
              onChange={(val) => {
                setQuery(val)
                if (searched) setSearched(false)
              }}
              className="w-full"
              aria-label="نام یا شماره موبایل دانش‌آموز"
            >
              <Label>نام یا شماره موبایل دانش‌آموز</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
                  id="reception-search-input"
                  ref={searchRef}
                  placeholder="نام دانش‌آموز یا شماره موبایل را وارد کنید... (کلید / برای جست‌وجو)"
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
                />
                <SearchField.ClearButton onPress={() => resetSearch()} />
              </SearchField.Group>
            </SearchField>

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
                  setModalError('')
                  setForm(emptyForm)
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
              دانش‌آموزی با این مشخصات پیدا نشد. می‌توانید با دکمه «دانش‌آموز جدید (مهمان)» او را
              سریعاً ثبت کنید.
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
                onQuickEdit={openQuickEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Multi-attendance Policy Violation Warning Modal */}
      <Modal.Backdrop
        isOpen={Boolean(attendanceConflict)}
        onOpenChange={(open) => !open && setAttendanceConflict(null)}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="text-warning flex items-center gap-2">
                <DangerCircleIcon className="size-5" />
                <span>هشدار: حضور قبلی در همین مراسم</span>
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3 text-sm">
              <p className="text-foreground leading-relaxed">
                دانش‌آموز <strong>{attendanceConflict?.studentName}</strong> قبلاً در مراسم{' '}
                <strong>{attendanceConflict?.ceremonyTitle}</strong>
                {attendanceConflict?.sessionTitle
                  ? ` (سانس «${attendanceConflict.sessionTitle}»)`
                  : ''}{' '}
                در تاریخ{' '}
                <strong>
                  {attendanceConflict ? formatDate(attendanceConflict.checkedInAt) : ''}
                </strong>{' '}
                پذیرش شده است.
              </p>
              <p className="text-xs text-muted leading-relaxed">
                سیاست این مراسم بر مبنای «تک‌حضوری» تنظیم شده است و ورود مجدد دانش‌آموزان به طور
                خودکار مسدود می‌باشد. در صورتی که با تأیید مسئول پذیرش قصد ثبت حضور مجدد او به عنوان
                استثنا را دارید، دکمه زیر را تأیید کنید.
              </p>
            </Modal.Body>
            <Modal.Footer className="flex items-center justify-end gap-2">
              <Button variant="outline" onPress={() => setAttendanceConflict(null)}>
                انصراف
              </Button>
              <Button
                variant="secondary"
                isDisabled={busy}
                onPress={() => {
                  if (attendanceConflict) {
                    const id = attendanceConflict.studentId
                    setAttendanceConflict(null)
                    void checkIn(id, true)
                  }
                }}
                className="flex items-center gap-1.5"
              >
                <UserCheckIcon className="size-4" />
                <span>ثبت حضور با مجوز استثنا</span>
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Quick-Edit Student Modal */}
      <Modal.Backdrop
        isOpen={Boolean(editingStudent)}
        onOpenChange={(open) => !open && setEditingStudent(null)}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <EditIcon className="size-5" />
                <span>ویرایش سریع مشخصات دانش‌آموز</span>
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              {editError && <ErrorNotice message={editError} />}
              <form
                id="quick-edit-form"
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  void saveQuickEdit()
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="نام"
                    value={editForm.firstName}
                    onChange={(val) => setEditForm({ ...editForm, firstName: val })}
                    required
                  />
                  <Field
                    label="نام خانوادگی"
                    value={editForm.lastName}
                    onChange={(val) => setEditForm({ ...editForm, lastName: val })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PanelSelect
                    id="edit-grade"
                    label="پایه تحصیلی"
                    value={editForm.grade}
                    placeholder="نامشخص"
                    options={[1, 2, 3, 4, 5, 6].map((g) => ({
                      value: String(g),
                      label: `پایه ${g}`,
                    }))}
                    onChange={(val) => setEditForm({ ...editForm, grade: val })}
                  />
                  <PanelSelect
                    id="edit-neighborhood"
                    label="محدوده / محله منزل"
                    value={editForm.neighborhoodId}
                    placeholder="انتخاب محله"
                    options={(context?.neighborhoods || []).map((n) => ({
                      value: String(n.id),
                      label: n.name,
                    }))}
                    onChange={(val) => setEditForm({ ...editForm, neighborhoodId: val })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Field
                    type="tel"
                    label="موبایل دانش‌آموز"
                    value={editForm.mobile}
                    onChange={(val) => setEditForm({ ...editForm, mobile: val })}
                    placeholder="اختیاری"
                  />
                  <Field
                    type="tel"
                    label="موبایل پدر"
                    value={editForm.fatherMobile}
                    onChange={(val) => setEditForm({ ...editForm, fatherMobile: val })}
                    placeholder="اختیاری"
                  />
                  <Field
                    type="tel"
                    label="موبایل مادر"
                    value={editForm.motherMobile}
                    onChange={(val) => setEditForm({ ...editForm, motherMobile: val })}
                    placeholder="اختیاری"
                  />
                  <Field
                    type="tel"
                    label="تلفن ثابت منزل"
                    value={editForm.landline}
                    onChange={(val) => setEditForm({ ...editForm, landline: val })}
                    placeholder="اختیاری"
                  />
                </div>

                <Field
                  label="آدرس منزل"
                  value={editForm.address}
                  onChange={(val) => setEditForm({ ...editForm, address: val })}
                  placeholder="خیابان، کوچه، پلاک..."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="معرف"
                    value={editForm.referrer}
                    onChange={(val) => setEditForm({ ...editForm, referrer: val })}
                    placeholder="نام معرف یا نحوه آشنایی"
                  />
                  <Field
                    label="یادداشت پذیرش"
                    value={editForm.notes}
                    onChange={(val) => setEditForm({ ...editForm, notes: val })}
                    placeholder="نکات ضروری یا توضیح خاص"
                  />
                </div>

                <div className="pt-2">
                  <Checkbox
                    isSelected={editForm.isClassSeeker}
                    onChange={(val) => setEditForm({ ...editForm, isClassSeeker: val })}
                  >
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Content className="text-sm font-medium">
                      خواهان کلاس و دوره‌های آموزشی (تغییر وضعیت به جذب آموزشی)
                    </Checkbox.Content>
                  </Checkbox>
                </div>
              </form>
            </Modal.Body>
            <Modal.Footer className="flex items-center justify-end gap-2">
              <Button variant="outline" isDisabled={busy} onPress={() => setEditingStudent(null)}>
                انصراف
              </Button>
              <Button
                form="quick-edit-form"
                type="submit"
                variant="primary"
                isDisabled={busy || !editForm.firstName.trim() || !editForm.lastName.trim()}
                className="flex items-center gap-1.5"
              >
                <CheckSquareIcon className="size-4" />
                <span>{busy ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</span>
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

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
                مشخصات دانش‌آموز جدید (مهمان بدون دعوت قبلی) را وارد کنید تا همزمان ثبت و در سانس
                جاری پذیرش شود.
              </p>

              {modalError && <ErrorNotice message={modalError} />}

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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PanelSelect
                    id="walkin-grade"
                    label="پایه تحصیلی"
                    value={form.grade}
                    placeholder="نامشخص"
                    options={[1, 2, 3, 4, 5, 6].map((grade) => ({
                      value: String(grade),
                      label: `پایه ${grade}`,
                    }))}
                    onChange={(val) => setForm({ ...form, grade: val })}
                  />
                  <PanelSelect
                    id="walkin-neighborhood"
                    label="محدوده / محله منزل"
                    value={form.neighborhoodId}
                    placeholder="انتخاب محله"
                    options={(context?.neighborhoods || []).map((n) => ({
                      value: String(n.id),
                      label: n.name,
                    }))}
                    onChange={(val) => setForm({ ...form, neighborhoodId: val })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Field
                    type="tel"
                    label="موبایل دانش‌آموز"
                    value={form.mobile}
                    onChange={(val) => setForm({ ...form, mobile: val })}
                    placeholder="اختیاری"
                  />
                  <Field
                    type="tel"
                    label="موبایل پدر"
                    value={form.fatherMobile}
                    onChange={(val) => setForm({ ...form, fatherMobile: val })}
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
                    label="تلفن ثابت منزل"
                    value={form.landline}
                    onChange={(val) => setForm({ ...form, landline: val })}
                    placeholder="اختیاری"
                  />
                </div>

                <Field
                  label="آدرس منزل"
                  value={form.address}
                  onChange={(val) => setForm({ ...form, address: val })}
                  placeholder="اختیاری"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="معرف"
                    value={form.referrer}
                    onChange={(val) => setForm({ ...form, referrer: val })}
                    placeholder="اختیاری"
                  />
                  <Field
                    label="یادداشت"
                    value={form.notes}
                    onChange={(val) => setForm({ ...form, notes: val })}
                    placeholder="اختیاری"
                  />
                </div>

                <div className="pt-2">
                  <Checkbox
                    isSelected={form.isClassSeeker}
                    onChange={(val) => setForm({ ...form, isClassSeeker: val })}
                  >
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Content className="text-sm font-medium">
                      خواهان کلاس و دوره‌های آموزشی
                    </Checkbox.Content>
                  </Checkbox>
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
