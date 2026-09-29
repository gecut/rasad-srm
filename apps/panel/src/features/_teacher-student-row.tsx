import { Button, Chip } from '@heroui/react'
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
  const phones: { label: string; number: string }[] = []
  if (student.mobile) phones.push({ label: 'دانش‌آموز', number: student.mobile })
  if (student.fatherMobile && student.fatherMobile !== student.mobile)
    phones.push({ label: 'پدر', number: student.fatherMobile })
  if (
    student.motherMobile &&
    student.motherMobile !== student.mobile &&
    student.motherMobile !== student.fatherMobile
  )
    phones.push({ label: 'مادر', number: student.motherMobile })
  if (student.landline) phones.push({ label: 'ثابت', number: student.landline })

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border bg-surface hover:bg-surface-secondary/40 transition-colors min-h-[56px]">
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-foreground text-sm font-bold truncate">
            {student.firstName} {student.lastName}
          </strong>

          {student.grade ? (
            <Chip size="sm" variant="soft" color="default">
              پایه {student.grade}
            </Chip>
          ) : (
            <Chip size="sm" variant="soft" color="default" className="text-muted">
              پایه نامشخص
            </Chip>
          )}

          {student.neighborhood && (
            <Chip size="sm" variant="soft" color="default" className="text-muted">
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

        {/* Contact phones */}
        {phones.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            {phones.map((p, i) => (
              <a
                key={i}
                href={`tel:${p.number}`}
                className="inline-flex items-center gap-1 font-mono hover:text-foreground transition-colors"
                dir="ltr"
              >
                <PhoneIcon className="size-3 text-accent shrink-0" />
                <bdi>{p.number}</bdi>
                <span className="text-[10px] text-muted font-sans font-medium" dir="rtl">
                  ({p.label})
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <Button
          variant="outline"
          size="sm"
          isDisabled={busy}
          onPress={() => onViewDetails(student)}
          className="text-xs py-1.5 h-auto flex items-center gap-1"
        >
          <NotesIcon className="size-3.5 text-accent" />
          <span>پرونده</span>
        </Button>

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
