import { Button, Chip } from '@heroui/react'
import type { TeacherRoster } from '@rasad/contracts'
import { CheckSquareIcon, PhoneIcon, TrashIcon } from '../components/icons'

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
}: {
  student: TeacherStudent
  busy: boolean
  onAbsorb: (student: TeacherStudent) => void
  onRemove: (student: TeacherStudent) => void
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-border bg-surface hover:bg-surface-secondary/40 transition-colors min-h-[48px]">
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
        <strong className="text-foreground text-sm font-bold truncate">
          {student.firstName} {student.lastName}
        </strong>

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

        {student.mobile && (
          <a
            href={`tel:${student.mobile}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors font-mono"
            dir="ltr"
          >
            <PhoneIcon className="size-3.5 text-accent" />
            <bdi>{student.mobile}</bdi>
          </a>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 sm:self-center">
        {student.lifecycleStatus === 'referred_to_teacher' && (
          <Button
            variant="primary"
            size="sm"
            isDisabled={busy}
            onPress={() => onAbsorb(student)}
            className="text-xs py-1.5 h-auto flex items-center gap-1.5"
          >
            <CheckSquareIcon className="size-4" />
            <span>تأیید جذب</span>
          </Button>
        )}

        {['referred_to_teacher', 'absorbed'].includes(student.lifecycleStatus) && (
          <Button
            variant="outline"
            size="sm"
            isDisabled={busy}
            onPress={() => onRemove(student)}
            className="text-xs py-1.5 h-auto flex items-center gap-1.5"
          >
            <TrashIcon className="size-4 text-danger" />
            <span>حذف از روند</span>
          </Button>
        )}
      </div>
    </div>
  )
}
