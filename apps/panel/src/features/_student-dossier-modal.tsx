import { Button, Chip, Modal } from '@heroui/react'
import type { StudentCard } from '@rasad/contracts'
import {
  CalendarIcon,
  CheckCircleIcon,
  NotesIcon,
  PhoneIcon,
} from '../components/icons'
import { formatDate } from '../lib/date'

export interface StudentDossierModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  student: StudentCard
}

export function StudentDossierModal({
  isOpen,
  onOpenChange,
  student,
}: StudentDossierModalProps) {
  const phoneNumbers = [
    { label: 'دانش‌آموز', value: student.mobile },
    { label: 'مادر', value: student.motherMobile },
    { label: 'پدر', value: student.fatherMobile },
    { label: 'تلفن ثابت', value: student.landline },
  ].filter((p): p is { label: string; value: string } => Boolean(p.value))

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-lg">
          <Modal.CloseTrigger />
          <Modal.Header className="flex flex-col gap-1">
            <Modal.Heading className="text-lg font-bold">
              پرونده و سوابق: {student.firstName} {student.lastName}
            </Modal.Heading>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {student.grade && (
                <Chip size="sm" variant="soft" color="accent">
                  پایه {student.grade}
                </Chip>
              )}
              {student.neighborhood && (
                <Chip size="sm" variant="soft" color="default">
                  محله: {student.neighborhood.name}
                </Chip>
              )}
              {student.referrer && (
                <Chip size="sm" variant="soft" color="default">
                  معرف: {student.referrer}
                </Chip>
              )}
            </div>
          </Modal.Header>

          <Modal.Body className="flex flex-col gap-4 py-2 max-h-[65vh] overflow-y-auto pr-0.5">
            {/* Ceremony Attendance History */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
                <CalendarIcon className="size-4 text-accent" />
                سوابق حضور در مراسمات:
              </span>
              {student.recentCheckins && student.recentCheckins.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {student.recentCheckins.map((rc, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-border bg-surface flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="size-4 text-accent shrink-0" />
                        <div>
                          <strong className="text-foreground block">{rc.ceremonyTitle}</strong>
                          <span className="text-muted text-[11px]">{rc.sessionTitle || 'سانس'}</span>
                        </div>
                      </div>
                      <span className="tabular-nums text-muted text-[11px]" dir="ltr">
                        {formatDate(rc.checkedInAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-border/60 bg-surface/50 text-xs text-muted text-center">
                  سابقه حضوری برای این دانش‌آموز ثبت نشده است.
                </div>
              )}
            </div>

            {/* Dossier notes */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
                <NotesIcon className="size-4 text-warning" />
                ملاحظات پرونده:
              </span>
              {student.notes ? (
                <div className="p-3 rounded-lg border border-warning/30 bg-warning/10 text-xs text-foreground leading-relaxed">
                  {student.notes}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-border/60 bg-surface/50 text-xs text-muted text-center">
                  ملاحظه‌ای در پرونده ثبت نشده است.
                </div>
              )}
            </div>

            {/* Contact Details */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
                <PhoneIcon className="size-4 text-accent" />
                شماره‌های تماس:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {phoneNumbers.map((phone) => (
                  <a
                    key={phone.label}
                    href={`tel:${phone.value}`}
                    className="p-2 rounded-lg border border-border bg-surface hover:border-accent hover:bg-accent/5 flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="text-muted font-medium">{phone.label}:</span>
                    <span className="tabular-nums font-semibold text-foreground" dir="ltr">
                      {phone.value}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer className="flex items-center justify-end gap-2">
            <Button variant="outline" onPress={() => onOpenChange(false)}>
              بستن
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
