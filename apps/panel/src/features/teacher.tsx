import { useEffect, useState } from 'react'
import { Alert, Button, Card, Chip, Modal, Tabs } from '@heroui/react'
import type { TeacherRoster } from '@rasad/contracts'
import { errorMessage, request } from '../lib/api'
import { ErrorNotice, SuccessNotice, TextareaField } from '../components/ui'
import { CheckCircleIcon, CheckSquareIcon, MagnifierIcon, PhoneIcon, StopwatchIcon, TrashIcon } from '../components/icons'
import { TeacherStudentRow } from './_teacher-student-row'
import { PanelSelect } from '../components/panel-select'

type TeacherStudent = TeacherRoster['classes'][number]['students'][number]

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
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [viewingStudent, setViewingStudent] = useState<TeacherStudent | null>(null)
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
    const previousRoster = roster // Snapshot for rollback on failure
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
    try {
      await request('/panel/teacher/status', {
        studentId: pending.studentId,
        status: pending.status,
        reason,
      })
      const actionName = pending.status === 'absorbed' ? 'جذب' : 'حذف'
      setSuccess(`وضعیت دانش‌آموز با موفقیت به «${actionName} شده» تغییر یافت.`)
      setPending(null)
      setReason('')
      await load()
    } catch (err) {
      // Revert optimistic update on failure!
      if (previousRoster) {
        setRoster(previousRoster)
      }
      setError(`خطا در تغییر وضعیت: ${errorMessage(err)}. تغییرات به حالت قبل بازگردانده شد.`)
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

  const filteredStudents = (selectedClass?.students || []).filter((student) => {
    if (student.lifecycleStatus !== filter) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase()
    const mobile = student.mobile || ''
    return fullName.includes(q) || mobile.includes(q)
  })

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
                <Alert.Description>
                  در حال حاضر هیچ کلاسی به حساب شما اختصاص داده نشده است.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {roster && roster.classes.length > 1 && (
            <PanelSelect
              id="teacher-class-select"
              label="انتخاب کلاس"
              className="max-w-sm"
              value={classId}
              disabled={busy || Boolean(pending)}
              options={roster.classes.map((item) => ({
                value: String(item.id),
                label: item.title,
              }))}
              onChange={(val) => setClassId(val)}
            />
          )}

          {roster && roster.classes.length === 1 && (
            <div className="text-sm text-foreground">
              <span className="text-muted">کلاس جاری:</span>{' '}
              <strong>{roster.classes[0].title}</strong>
            </div>
          )}
        </Card.Content>
      </Card>

      <ErrorNotice message={error} />
      <SuccessNotice message={success} />

      {/* Tabs for Lifecycle Statuses */}
      {selectedClass && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Tabs selectedKey={filter} onSelectionChange={(key) => setFilter(String(key))}>
              <Tabs.ListContainer>
                <Tabs.List aria-label="فیلتر وضعیت دانش‌آموزان">
                  <Tabs.Tab id="referred_to_teacher">
                    <span className="flex items-center gap-1.5">
                      <StopwatchIcon className="size-4" />
                      <span>به مدرس معرفی شده</span>
                      {pendingCount > 0 && (
                        <Chip color="accent" size="sm" variant="soft">
                          {pendingCount}
                        </Chip>
                      )}
                    </span>
                    <Tabs.Indicator />
                  </Tabs.Tab>

                  <Tabs.Tab id="absorbed">
                    <span className="flex items-center gap-1.5">
                      <CheckCircleIcon className="size-4 text-success" />
                      <span>جذب شده</span>
                      <span className="text-xs text-muted">({absorbedCount})</span>
                    </span>
                    <Tabs.Indicator />
                  </Tabs.Tab>

                  <Tabs.Tab id="removed">
                    <span className="flex items-center gap-1.5">
                      <TrashIcon className="size-4 text-danger" />
                      <span>حذف شده</span>
                      <span className="text-xs text-muted">({removedCount})</span>
                    </span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>

            {/* Live Client Filter Input */}
            <div className="relative flex items-center w-full sm:w-64">
              <div className="absolute right-3 pointer-events-none flex items-center text-muted">
                <MagnifierIcon className="size-4" />
              </div>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جست‌وجوی نام یا موبایل..."
                className="w-full rounded-lg border border-border bg-surface pr-9 pl-3 py-1.5 text-sm text-foreground focus:outline-2 focus:outline-accent"
              />
            </div>
          </div>

          {/* Student Roster List */}
          {filteredStudents.length === 0 ? (
            <Alert status="default" className="my-2">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>فهرست خالی</Alert.Title>
                <Alert.Description>
                  {searchQuery.trim()
                    ? 'هیچ دانش‌آموزی با این عبارت در وضعیت جاری یافت نشد.'
                    : `دانش‌آموزی با وضعیت «${STATUS_LABELS[filter]}» در این کلاس وجود ندارد.`}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredStudents.map((student) => (
                <TeacherStudentRow
                  key={student.id}
                  student={student}
                  busy={busy || Boolean(pending)}
                  onViewDetails={(st) => setViewingStudent(st)}
                  onAbsorb={(st) =>
                    setPending({
                      studentId: st.id,
                      status: 'absorbed',
                      name: `${st.firstName} ${st.lastName}`,
                    })
                  }
                  onRemove={(st) =>
                    setPending({
                      studentId: st.id,
                      status: 'removed',
                      name: `${st.firstName} ${st.lastName}`,
                    })
                  }
                />
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
                    حذف دانش‌آموز <strong>«{pending?.name}»</strong> به معنای پایان روند حضور او در
                    این کلاس است. لطفاً علت حذف را ذکر کنید.
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
                {busy
                  ? 'در حال ثبت…'
                  : pending?.status === 'absorbed'
                    ? 'تأیید نهایی جذب'
                    : 'تأیید حذف'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Student Dossier Modal (Read-Only) */}
      <Modal.Backdrop
        isOpen={Boolean(viewingStudent)}
        onOpenChange={(open) => !open && setViewingStudent(null)}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted font-medium">پرونده دانش‌آموز</span>
                  {viewingStudent?.grade && (
                    <Chip size="sm" variant="soft" color="accent">
                      پایه {viewingStudent.grade}
                    </Chip>
                  )}
                  {viewingStudent?.lifecycleStatus && (
                    <Chip
                      size="sm"
                      variant="soft"
                      color={
                        viewingStudent.lifecycleStatus === 'absorbed'
                          ? 'success'
                          : viewingStudent.lifecycleStatus === 'referred_to_teacher'
                            ? 'accent'
                            : 'default'
                      }
                    >
                      {STATUS_LABELS[viewingStudent.lifecycleStatus] ||
                        viewingStudent.lifecycleStatus}
                    </Chip>
                  )}
                </div>
                <Modal.Heading className="text-xl font-bold">
                  {viewingStudent?.firstName} {viewingStudent?.lastName}
                </Modal.Heading>
              </div>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-4 text-sm">
              {/* Contact numbers */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted">شماره‌های تماس:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    ['دانش‌آموز', viewingStudent?.mobile],
                    ['پدر', viewingStudent?.fatherMobile],
                    ['مادر', viewingStudent?.motherMobile],
                    ['تلفن ثابت', viewingStudent?.landline],
                  ].map(([label, phone]) =>
                    phone ? (
                      <a
                        key={label}
                        href={`tel:${phone}`}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface hover:bg-surface-secondary/40 text-foreground transition-colors font-mono"
                        dir="ltr"
                      >
                        <bdi className="font-semibold text-sm">{phone}</bdi>
                        <div className="flex items-center gap-1.5 text-xs text-muted font-sans" dir="rtl">
                          <PhoneIcon className="size-3.5 text-accent" />
                          <span>{label}</span>
                        </div>
                      </a>
                    ) : null,
                  )}
                  {!viewingStudent?.mobile &&
                    !viewingStudent?.fatherMobile &&
                    !viewingStudent?.motherMobile &&
                    !viewingStudent?.landline && (
                      <span className="text-xs text-muted italic">شماره تماسی ثبت نشده است.</span>
                    )}
                </div>
              </div>

              {/* Location and Address */}
              <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border/80 bg-surface-secondary/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">محدوده / محله:</span>
                  <strong className="text-foreground">
                    {viewingStudent?.neighborhood?.name || 'نامشخص'}
                  </strong>
                </div>
                {viewingStudent?.address && (
                  <div className="text-xs pt-1.5 mt-1 border-t border-border/40">
                    <span className="text-muted block mb-0.5">آدرس منزل:</span>
                    <p className="text-foreground leading-relaxed">{viewingStudent.address}</p>
                  </div>
                )}
              </div>

              {/* Referrer and Notes */}
              {(viewingStudent?.referrer || viewingStudent?.notes) && (
                <div className="flex flex-col gap-2 p-3 rounded-lg border border-border/80 bg-surface-secondary/20 text-xs">
                  {viewingStudent.referrer && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted">معرف:</span>
                      <strong className="text-foreground">{viewingStudent.referrer}</strong>
                    </div>
                  )}
                  {viewingStudent.notes && (
                    <div className="pt-1.5 mt-1 border-t border-border/40">
                      <span className="text-muted block mb-0.5">یادداشت‌های پرونده:</span>
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                        {viewingStudent.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Modal.Body>

            <Modal.Footer className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {viewingStudent?.lifecycleStatus === 'referred_to_teacher' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => {
                      const st = viewingStudent
                      setViewingStudent(null)
                      setPending({
                        studentId: st.id,
                        status: 'absorbed',
                        name: `${st.firstName} ${st.lastName}`,
                      })
                    }}
                    className="flex items-center gap-1"
                  >
                    <CheckSquareIcon className="size-3.5" />
                    <span>تأیید جذب</span>
                  </Button>
                )}
                {['referred_to_teacher', 'absorbed'].includes(
                  viewingStudent?.lifecycleStatus || '',
                ) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      const st = viewingStudent!
                      setViewingStudent(null)
                      setPending({
                        studentId: st.id,
                        status: 'removed',
                        name: `${st.firstName} ${st.lastName}`,
                      })
                    }}
                    className="text-danger flex items-center gap-1"
                  >
                    <TrashIcon className="size-3.5" />
                    <span>حذف از روند</span>
                  </Button>
                )}
              </div>

              <Button variant="outline" size="sm" onPress={() => setViewingStudent(null)}>
                بستن
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  )
}
