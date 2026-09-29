import { Button, Chip } from '@heroui/react'
import type { ReceptionStudent } from '@rasad/contracts'
import { DangerCircleIcon, EditIcon, UserCheckIcon } from '../components/icons'

export function ReceptionRow({
  student,
  currentSessionId,
  isSelected,
  busy,
  onCheckIn,
  onQuickEdit,
}: {
  student: ReceptionStudent
  currentSessionId: string
  isSelected: boolean
  busy: boolean
  onCheckIn: (id: number) => void
  onQuickEdit: (student: ReceptionStudent) => void
}) {
  const isDifferentSession =
    student.assignedSessionId && student.assignedSessionId !== Number(currentSessionId)

  // Collect available phones with labels
  const phones: { label: string; number: string }[] = []
  const mainPhone = student.mobile || student.phone
  if (mainPhone) {
    phones.push({ label: 'دانش‌آموز', number: mainPhone })
  }
  if (student.fatherMobile && student.fatherMobile !== mainPhone) {
    phones.push({ label: 'پدر', number: student.fatherMobile })
  }
  if (
    student.motherMobile &&
    student.motherMobile !== mainPhone &&
    student.motherMobile !== student.fatherMobile
  ) {
    phones.push({ label: 'مادر', number: student.motherMobile })
  }
  if (student.landline) {
    phones.push({ label: 'ثابت', number: student.landline })
  }

  return (
    <div
      className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 py-3 rounded-lg border transition-colors min-h-[56px] ${
        isSelected
          ? 'bg-accent/10 border-accent ring-1 ring-accent'
          : 'bg-surface border-border hover:bg-surface-secondary/40'
      }`}
    >
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-foreground text-sm truncate">
            {student.firstName} {student.lastName}
          </span>

          <Chip size="sm" variant="soft" color="default">
            {student.grade ? `پایه ${student.grade}` : 'پایه نامشخص'}
          </Chip>

          {student.neighborhoodName && (
            <Chip size="sm" variant="soft" color="default" className="text-muted">
              {student.neighborhoodName}
            </Chip>
          )}

          {isDifferentSession ? (
            <Chip
              size="sm"
              color="warning"
              variant="soft"
              className="flex items-center gap-1"
              title={`دعوت برای «${student.assignedSessionTitle || 'سانس دیگری'}»`}
            >
              <DangerCircleIcon className="size-3.5 inline ml-1" />
              <span>سانس مغایر: {student.assignedSessionTitle || 'سانس دیگر'}</span>
            </Chip>
          ) : student.assignedSessionId ? (
            <Chip size="sm" color="accent" variant="soft">
              دعوت شده
            </Chip>
          ) : (
            <Chip size="sm" color="default" variant="soft">
              مهمان آزاد
            </Chip>
          )}

          {student.checkedIn && (
            <Chip size="sm" color="success" variant="soft">
              حضور ثبت شده
            </Chip>
          )}
        </div>

        {/* Phones list */}
        {phones.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            {phones.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1 font-mono" dir="ltr">
                <bdi>{p.number}</bdi>
                <span className="text-[10px] text-muted font-sans font-medium" dir="rtl">
                  ({p.label})
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
        <Button
          size="sm"
          variant="outline"
          isDisabled={busy}
          onPress={() => onQuickEdit(student)}
          className="text-xs py-1.5 h-auto flex items-center gap-1"
        >
          <EditIcon className="size-3.5" />
          <span>ویرایش سریع</span>
        </Button>

        <Button
          size="sm"
          variant={student.checkedIn ? 'outline' : 'primary'}
          isDisabled={busy || student.checkedIn || !currentSessionId}
          onPress={() => onCheckIn(student.id)}
          className="text-xs py-1.5 h-auto flex items-center gap-1.5"
        >
          <UserCheckIcon className="size-4" />
          <span>{student.checkedIn ? 'قبلاً پذیرش شده' : 'ثبت حضور'}</span>
        </Button>
      </div>
    </div>
  )
}
