import { Button, Card, Chip } from '@heroui/react'
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
    <Card
      className={`transition-colors border ${
        isSelected
          ? 'border-accent bg-accent/10 ring-2 ring-accent'
          : 'border-border bg-surface hover:bg-surface-secondary/40'
      }`}
    >
      <Card.Content className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 sm:p-4">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-foreground text-sm truncate">
              {student.firstName} {student.lastName}
            </span>

            <Chip size="sm" variant="soft" color="default">
              {student.grade ? `پایه ${student.grade}` : 'پایه نامشخص'}
            </Chip>

            {student.neighborhoodName && (
              <Chip size="sm" variant="soft" color="default">
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

        {/* Action buttons (bottom row on mobile, end-aligned on desktop) */}
        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-border/40 md:border-0 md:pt-0 shrink-0">
          <Button
            size="sm"
            variant="outline"
            isDisabled={busy}
            onPress={() => onQuickEdit(student)}
          >
            <EditIcon className="size-3.5" />
            <span>ویرایش سریع</span>
          </Button>

          <Button
            size="sm"
            variant={student.checkedIn ? 'outline' : 'primary'}
            isDisabled={busy || student.checkedIn || !currentSessionId}
            onPress={() => onCheckIn(student.id)}
          >
            <UserCheckIcon className="size-4" />
            <span>{student.checkedIn ? 'قبلاً پذیرش شده' : 'ثبت حضور'}</span>
          </Button>
        </div>
      </Card.Content>
    </Card>
  )
}
