import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import type { TeacherRoster } from '@rasad/contracts'
import { errorMessage, request } from '../lib/api'
import { ErrorNotice, Section } from '../components/ui'
const labels: Record<string, string> = {
  referred_to_teacher: 'به مدرس معرفی شده',
  absorbed: 'جذب شده',
  removed: 'حذف شده',
  stabilized: 'تثبیت شده',
  unknown: 'نامعلوم',
  class_seeker: 'خواهان کلاس',
}
export function Teacher() {
  const [roster, setRoster] = useState<TeacherRoster>()
  const [classId, setClassId] = useState('')
  const [filter, setFilter] = useState('referred_to_teacher')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<{
    studentId: number
    status: 'absorbed' | 'removed'
    name: string
  } | null>(null)
  const [reason, setReason] = useState('')
  const [success, setSuccess] = useState('')
  async function load() {
    try {
      const data = await request<TeacherRoster>('/panel/teacher')
      setRoster(data)
      setClassId((current) => current || String(data.classes[0]?.id || ''))
    } catch (error) {
      setError(errorMessage(error))
    }
  }
  useEffect(() => {
    void load()
  }, [])
  async function save() {
    if (!pending || busy) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await request('/panel/teacher/status', {
        studentId: pending.studentId,
        status: pending.status,
        reason,
      })
      // The mutation succeeded even if a subsequent roster refresh fails.
      setRoster(
        (current) =>
          current && {
            classes: current.classes.map((item) => ({
              ...item,
              students: item.students.map((student) =>
                student.id === pending.studentId
                  ? { ...student, lifecycleStatus: pending.status }
                  : student,
              ),
            })),
          },
      )
      setPending(null)
      setReason('')
      setSuccess('وضعیت دانش‌آموز ثبت شد.')
      await load()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  const selected = roster?.classes.find((item) => String(item.id) === classId)
  return (
    <main>
      <h1>دانش‌آموزان کلاس من</h1>
      <ErrorNotice message={error} />
      {success && (
        <p role="status" className="notice">
          {success}
        </p>
      )}
      {!roster && <Button onPress={load}>دریافت فهرست کلاس‌ها</Button>}
      {roster?.classes.length === 0 && <p>کلاسی به شما اختصاص داده نشده است.</p>}
      <div className="grid surface">
        <label>
          کلاس
          <select
            value={classId}
            disabled={busy || !!pending}
            onChange={(event) => setClassId(event.target.value)}
          >
            {roster?.classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          وضعیت
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            {['referred_to_teacher', 'absorbed', 'removed'].map((status) => (
              <option key={status} value={status}>
                {labels[status]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {pending && (
        <Section title={`تأیید ${labels[pending.status]}: ${pending.name}`}>
          <div className="stack">
            {pending.status === 'removed' && (
              <label>
                دلیل حذف
                <textarea
                  required
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
            )}
            <div className="row">
              <Button
                isDisabled={busy || (pending.status === 'removed' && !reason.trim())}
                onPress={save}
              >
                تأیید و ثبت
              </Button>
              <Button
                variant="secondary"
                isDisabled={busy}
                onPress={() => {
                  setPending(null)
                  setReason('')
                }}
              >
                انصراف
              </Button>
            </div>
          </div>
        </Section>
      )}
      {selected && !selected.students.some((student) => student.lifecycleStatus === filter) && (
        <p>دانش‌آموزی با این وضعیت وجود ندارد.</p>
      )}
      {selected?.students
        .filter((student) => student.lifecycleStatus === filter)
        .map((student) => (
          <div className="surface row spread" key={student.id}>
            <div>
              <strong>
                {student.firstName} {student.lastName}
              </strong>
              <p>{labels[student.lifecycleStatus]}</p>
              {student.mobile && (
                <a href={`tel:${student.mobile}`}>
                  <bdi>{student.mobile}</bdi>
                </a>
              )}
            </div>
            <div className="row">
              {student.lifecycleStatus === 'referred_to_teacher' && (
                <Button
                  isDisabled={busy || !!pending}
                  onPress={() =>
                    setPending({
                      studentId: student.id,
                      status: 'absorbed',
                      name: `${student.firstName} ${student.lastName}`,
                    })
                  }
                >
                  تأیید جذب
                </Button>
              )}
              {['referred_to_teacher', 'absorbed'].includes(student.lifecycleStatus) && (
                <Button
                  variant="secondary"
                  isDisabled={busy || !!pending}
                  onPress={() =>
                    setPending({
                      studentId: student.id,
                      status: 'removed',
                      name: `${student.firstName} ${student.lastName}`,
                    })
                  }
                >
                  حذف از روند
                </Button>
              )}
            </div>
          </div>
        ))}
    </main>
  )
}
