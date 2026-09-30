import { Button, Card, Chip } from '@heroui/react'
import type { TeacherRoster } from '@rasad/contracts'
import { CheckSquareIcon, NotesIcon, PhoneIcon, TrashIcon } from '../components/icons'

type TeacherStudent = TeacherRoster['classes'][number]['students'][number]

const STATUS_LABELS: Record<string, string> = {
  referred_to_teacher: 'به مدرس معرفی شده',
  absorbed: 'جذب شده',
  removed: 'حذف شده',
  unknown: 'نامعلوم',
  class_seeker: 'خواهان کلاس',
  stabilized: 'تثبیت شده',
}

export function TeacherStudentRow({
  student,
  busy,
  onAbsorb,
  onRemove,
  onViewDetails,
}: {
  student: TeacherStudent
  busy: boolean
  onAbsorb: (student: TeacherStudent) => void
  onRemove: (student: TeacherStudent) => void
  onViewDetails: (student: TeacherStudent) => void
}) {
  return (
    <Card className="transition-colors hover:bg-surface-secondary/40 border border-border bg-surface">
      <Card.Content className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4">
        {/* Student identity, chips, and primary contact */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-foreground text-sm font-bold truncate">
              {student.firstName} {student.lastName}
            </strong>

            {student.grade ? (
              <Chip size="sm" variant="soft" color="default">
                پایه {student.grade}
              </Chip>
            ) : (
              <Chip size="sm" variant="soft" color="default">
                پایه نامشخص
              </Chip>
            )}

            {student.neighborhood && (
              <Chip size="sm" variant="soft" color="default">
                {student.neighborhood.name}
              </Chip>
            )}

            <Chip
              size="sm"
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

          {/* Primary mobile phone only on card row (per grill-me decision) */}
          {student.mobile ? (
            <div className="flex items-center text-xs text-muted">
              <a
                href={`tel:${student.mobile}`}
                className="inline-flex items-center gap-1.5 font-mono text-foreground/85 hover:text-accent transition-colors"
                dir="ltr"
              >
                <PhoneIcon className="size-3.5 text-accent shrink-0" />
                <bdi>{student.mobile}</bdi>
              </a>
            </div>
          ) : (
            <span className="text-xs text-muted/70 italic">شماره موبایل ثبت نشده</span>
          )}
        </div>

        {/* Action buttons (bottom row on mobile, end-aligned on desktop) */}
        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-border/40 sm:border-0 sm:pt-0 shrink-0">
          <Button
            variant="outline"
            size="sm"
            isDisabled={busy}
            onPress={() => onViewDetails(student)}
          >
            <NotesIcon className="size-4 text-accent" />
            <span>پرونده</span>
          </Button>

          {student.lifecycleStatus === 'referred_to_teacher' && (
            <Button
              variant="primary"
              size="sm"
              isDisabled={busy}
              onPress={() => onAbsorb(student)}
            >
              <CheckSquareIcon className="size-4" />
              <span>تأیید جذب</span>
            </Button>
          )}

          {['referred_to_teacher', 'absorbed'].includes(student.lifecycleStatus) && (
            <Button
              variant="danger-soft"
              size="sm"
              isDisabled={busy}
              onPress={() => onRemove(student)}
            >
              <TrashIcon className="size-4" />
              <span>حذف از روند</span>
            </Button>
          )}
        </div>
      </Card.Content>
    </Card>
  )
}
