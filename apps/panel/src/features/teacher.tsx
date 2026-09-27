import { useEffect, useState } from 'react'
import { Alert, Button, Card, Chip, Modal, Tabs } from '@heroui/react'
import type { TeacherRoster } from '@rasad/contracts'
import { errorMessage, request } from '../lib/api'
import { ErrorNotice, SuccessNotice, TextareaField } from '../components/ui'

const STATUS_LABELS: Record<string, string> = {
  referred_to_teacher: 'به مدرس معرفی شده',
  absorbed: 'جذب شده',
  removed: 'حذف شده',
  unknown: 'نامعلوم',
  class_seeker: 'خواهان کلاس',
  stabilized: 'تثبیت شده',
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
    } catch (err) {
      setError(errorMessage(err))
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
      // Optimistic update of local roster
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
      const actionName = pending.status === 'absorbed' ? 'جذب' : 'حذف'
      setSuccess(`وضعیت دانش‌آموز با موفقیت به «${actionName} شده» تغییر یافت.`)
      setPending(null)
      setReason('')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const selectedClass = roster?.classes.find((item) => String(item.id) === classId)

  const pendingCount =
    selectedClass?.students.filter((s) => s.lifecycleStatus === 'referred_to_teacher').length || 0
  const absorbedCount =
    selectedClass?.students.filter((s) => s.lifecycleStatus === 'absorbed').length || 0
  const removedCount =
    selectedClass?.students.filter((s) => s.lifecycleStatus === 'removed').length || 0

  const filteredStudents =
    selectedClass?.students.filter((student) => student.lifecycleStatus === filter) || []

  return (
    <div className="flex flex-col gap-6">
      {/* Header and Class Context */}
      <Card className="border border-border bg-surface shadow-xs">
        <Card.Header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border">
          <div>
            <Card.Title className="text-xl font-bold">دانش‌آموزان کلاس من</Card.Title>
            <Card.Description className="text-sm text-muted">
              مدیریت و تأیید جذب دانش‌آموزان معرفی‌شده به کلاس‌های تحت تدریس
            </Card.Description>
          </div>

          {selectedClass && (
            <div className="flex flex-wrap items-center gap-2">
              <Chip color="accent" variant="soft">
                در انتظار: {pendingCount}
              </Chip>
              <Chip color="success" variant="soft">
                جذب شده: {absorbedCount}
              </Chip>
              <Chip color="default" variant="soft">
                حذف شده: {removedCount}
              </Chip>
            </div>
          )}
        </Card.Header>

        <Card.Content className="pt-3">
          {roster && roster.classes.length === 0 && (
            <Alert status="default">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>کلاسی یافت نشد</Alert.Title>
                <Alert.Description>در حال حاضر هیچ کلاسی به حساب شما اختصاص داده نشده است.</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {roster && roster.classes.length > 1 && (
            <div className="flex flex-col gap-1.5 max-w-sm">
              <label htmlFor="teacher-class-select" className="text-sm font-medium text-foreground">
                انتخاب کلاس
              </label>
              <select
                id="teacher-class-select"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-2 focus:outline-accent"
                value={classId}
                disabled={busy || Boolean(pending)}
                onChange={(event) => setClassId(event.target.value)}
              >
                {roster.classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {roster && roster.classes.length === 1 && (
            <div className="text-sm text-foreground">
              <span className="text-muted">کلاس جاری:</span> <strong>{roster.classes[0].title}</strong>
            </div>
          )}
        </Card.Content>
      </Card>

      <ErrorNotice message={error} />
      <SuccessNotice message={success} />

      {/* Tabs for Lifecycle Statuses */}
      {selectedClass && (
        <div className="flex flex-col gap-4">
          <Tabs selectedKey={filter} onSelectionChange={(key) => setFilter(String(key))}>
            <Tabs.ListContainer>
              <Tabs.List aria-label="فیلتر وضعیت دانش‌آموزان">
                <Tabs.Tab id="referred_to_teacher">
                  <span className="flex items-center gap-2">
                    به مدرس معرفی شده
                    {pendingCount > 0 && (
                      <Chip color="accent" size="sm" variant="soft">
                        {pendingCount}
                      </Chip>
                    )}
                  </span>
                  <Tabs.Indicator />
                </Tabs.Tab>

                <Tabs.Tab id="absorbed">
                  <span className="flex items-center gap-2">
                    جذب شده
                    <span className="text-xs text-muted">({absorbedCount})</span>
                  </span>
                  <Tabs.Indicator />
                </Tabs.Tab>

                <Tabs.Tab id="removed">
                  <span className="flex items-center gap-2">
                    حذف شده
                    <span className="text-xs text-muted">({removedCount})</span>
                  </span>
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>

          {/* Student Roster List */}
          {filteredStudents.length === 0 ? (
            <Alert status="default" className="my-2">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>فهرست خالی</Alert.Title>
                <Alert.Description>
                  دانش‌آموزی با وضعیت «{STATUS_LABELS[filter]}» در این کلاس وجود ندارد.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredStudents.map((student) => (
                <Card key={student.id} className="border border-border bg-surface shadow-xs">
                  <Card.Content className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2.5">
                        <strong className="text-lg font-bold text-foreground">
                          {student.firstName} {student.lastName}
                        </strong>
                        <Chip
                          color={
                            student.lifecycleStatus === 'absorbed'
                              ? 'success'
                              : student.lifecycleStatus === 'referred_to_teacher'
                                ? 'accent'
                                : 'default'
                          }
                          variant="soft"
                        >
                          {STATUS_LABELS[student.lifecycleStatus] || student.lifecycleStatus}
                        </Chip>
                      </div>

                      {student.mobile && (
                        <a
                          href={`tel:${student.mobile}`}
                          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors font-mono"
                          dir="ltr"
                        >
                          <bdi>{student.mobile}</bdi>
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:self-center">
                      {student.lifecycleStatus === 'referred_to_teacher' && (
                        <Button
                          variant="primary"
                          size="md"
                          isDisabled={busy || Boolean(pending)}
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
                          variant="outline"
                          size="md"
                          isDisabled={busy || Boolean(pending)}
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
                  </Card.Content>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal.Backdrop
        isOpen={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null)
            setReason('')
          }
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                {pending?.status === 'absorbed' ? 'تأیید جذب دانش‌آموز' : 'حذف دانش‌آموز از کلاس'}
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-4">
              {pending?.status === 'absorbed' ? (
                <p className="text-sm text-foreground leading-relaxed">
                  آیا از جذب دانش‌آموز <strong>«{pending?.name}»</strong> در این کلاس اطمینان دارید؟
                  با این تأیید، وضعیت او به عنوان عضو فعال کلاس ثبت می‌گردد.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-foreground leading-relaxed">
                    حذف دانش‌آموز <strong>«{pending?.name}»</strong> به معنای پایان روند حضور او در این
                    کلاس است. لطفاً علت حذف را ذکر کنید.
                  </p>
                  <TextareaField
                    required
                    label="دلیل حذف (الزامی)"
                    placeholder="علت انصراف یا عدم امکان ادامه حضور دانش‌آموز..."
                    value={reason}
                    onChange={setReason}
                    rows={3}
                  />
                </div>
              )}
            </Modal.Body>

            <Modal.Footer className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                isDisabled={busy}
                onPress={() => {
                  setPending(null)
                  setReason('')
                }}
              >
                انصراف
              </Button>

              <Button
                variant={pending?.status === 'absorbed' ? 'primary' : 'danger'}
                isDisabled={busy || (pending?.status === 'removed' && !reason.trim())}
                onPress={save}
              >
                {busy ? 'در حال ثبت…' : pending?.status === 'absorbed' ? 'تأیید نهایی جذب' : 'تأیید حذف'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  )
}
