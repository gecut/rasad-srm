import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Chip,
  Label,
  Modal,
  SearchField,
  Tabs,
  TextArea,
  TextField,
} from '@heroui/react'
import type { TeacherRoster } from '@rasad/contracts'
import { errorMessage, request } from '../lib/api'
import { ErrorNotice, SuccessNotice } from '../components/ui'
import {
  CheckCircleIcon,
  CheckSquareIcon,
  PhoneIcon,
  StopwatchIcon,
  TrashIcon,
} from '../components/icons'
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
              <Chip color="accent" variant="soft" size="sm">
                در انتظار: {pendingCount}
              </Chip>
              <Chip color="success" variant="soft" size="sm">
                جذب شده: {absorbedCount}
              </Chip>
              <Chip color="default" variant="soft" size="sm">
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
            <Tabs
              className="w-full sm:w-auto"
              selectedKey={filter}
              onSelectionChange={(key) => setFilter(String(key))}
            >
              <Tabs.ListContainer className="w-full sm:w-auto">
                <Tabs.List
                  className="w-full flex sm:w-auto"
                  aria-label="فیلتر وضعیت دانش‌آموزان"
                >
                  <Tabs.Tab
                    id="referred_to_teacher"
                    className="flex-1 sm:flex-none px-2 sm:px-3.5 min-h-[38px] sm:min-h-[32px] text-xs sm:text-sm"
                  >
                    <span className="flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0">
                      <StopwatchIcon className="size-3.5 sm:size-4 shrink-0 text-accent" />
                      <span className="font-medium">
                        <span className="inline sm:hidden">معرفی‌شده</span>
                        <span className="hidden sm:inline">به مدرس معرفی شده</span>
                      </span>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={pendingCount > 0 ? 'accent' : 'default'}
                        className="h-5 min-w-5 px-1.5 text-[11px] font-semibold tabular-nums shrink-0"
                      >
                        {pendingCount}
                      </Chip>
                    </span>
                    <Tabs.Indicator />
                  </Tabs.Tab>

                  <Tabs.Tab
                    id="absorbed"
                    className="flex-1 sm:flex-none px-2 sm:px-3.5 min-h-[38px] sm:min-h-[32px] text-xs sm:text-sm"
                  >
                    <span className="flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0">
                      <CheckCircleIcon className="size-3.5 sm:size-4 shrink-0 text-success" />
                      <span className="font-medium">
                        <span className="inline sm:hidden">جذب‌شده</span>
                        <span className="hidden sm:inline">جذب شده</span>
                      </span>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={absorbedCount > 0 ? 'success' : 'default'}
                        className="h-5 min-w-5 px-1.5 text-[11px] font-semibold tabular-nums shrink-0"
                      >
                        {absorbedCount}
                      </Chip>
                    </span>
                    <Tabs.Indicator />
                  </Tabs.Tab>

                  <Tabs.Tab
                    id="removed"
                    className="flex-1 sm:flex-none px-2 sm:px-3.5 min-h-[38px] sm:min-h-[32px] text-xs sm:text-sm"
                  >
                    <span className="flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0">
                      <TrashIcon className="size-3.5 sm:size-4 shrink-0 text-danger" />
                      <span className="font-medium">
                        <span className="inline sm:hidden">حذف‌شده</span>
                        <span className="hidden sm:inline">حذف شده</span>
                      </span>
                      <Chip
                        size="sm"
                        variant="soft"
                        color="default"
                        className="h-5 min-w-5 px-1.5 text-[11px] font-semibold tabular-nums shrink-0"
                      >
                        {removedCount}
                      </Chip>
                    </span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>

            {/* Native HeroUI v3 SearchField */}
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full sm:w-64"
              aria-label="جست‌وجوی دانش‌آموز"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="جست‌وجوی نام یا موبایل..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
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
                  <TextField
                    isRequired
                    value={reason}
                    onChange={setReason}
                    className="w-full"
                  >
                    <Label className="text-sm font-medium">دلیل حذف (الزامی)</Label>
                    <TextArea
                      rows={3}
                      placeholder="علت انصراف یا عدم امکان ادامه حضور دانش‌آموز..."
                    />
                  </TextField>
                </div>
              )}
            </Modal.Body>

            <Modal.Footer className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
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
                size="sm"
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
              {/* Complete contact numbers (per grill-me decision) */}
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
                        <div
                          className="flex items-center gap-1.5 text-xs text-muted font-sans"
                          dir="rtl"
                        >
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
                  >
                    <CheckSquareIcon className="size-4" />
                    <span>تأیید جذب</span>
                  </Button>
                )}
                {['referred_to_teacher', 'absorbed'].includes(
                  viewingStudent?.lifecycleStatus || '',
                ) && (
                  <Button
                    variant="danger-soft"
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
                  >
                    <TrashIcon className="size-4" />
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
