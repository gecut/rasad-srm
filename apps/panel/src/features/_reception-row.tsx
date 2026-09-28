import { Button, Chip } from '@heroui/react'
import type { ReceptionStudent } from '@rasad/contracts'
import { DangerCircleIcon, UserCheckIcon } from '../components/icons'

export function ReceptionRow({
  student,
  currentSessionId,
  isSelected,
  busy,
  onCheckIn,
}: {
  student: ReceptionStudent
  currentSessionId: string
  isSelected: boolean
  busy: boolean
  onCheckIn: (id: number) => void
}) {
  const isDifferentSession =
    student.assignedSessionId && student.assignedSessionId !== Number(currentSessionId)

  return (
    <div
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-2.5 rounded-lg border transition-colors min-h-[48px] ${
        isSelected
          ? 'bg-accent/10 border-accent ring-1 ring-accent'
          : 'bg-surface border-border hover:bg-surface-secondary/40'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <span className="font-bold text-foreground text-sm truncate">
          {student.firstName} {student.lastName}
        </span>

        <Chip size="sm" variant="soft" color="default">
          {student.grade ? `پایه ${student.grade}` : 'پایه نامشخص'}
        </Chip>

        {student.phone && (
          <span className="text-xs text-muted font-mono" dir="ltr">
            <bdi>{student.phone}</bdi>
          </span>
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

      <div className="flex items-center gap-2 shrink-0 sm:self-center">
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
