import { useState } from 'react'
import { Button, Chip, Modal } from '@heroui/react'
import { TextareaField } from '../components/ui'

export interface DeclineModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onConfirm: (reason: string) => void
  busy: boolean
  studentName?: string
  initialNote?: string
}

const DECLINE_REASONS = [
  'مسافت دور و عدم امکان رفت‌وآمد',
  'عدم تمایل دانش‌آموز یا خانواده',
  'مسافرت یا تداخل با برنامه دیگر',
  'بیماری یا کسالت',
  'سایر موارد',
]

export function DeclineModal({
  isOpen,
  onOpenChange,
  onConfirm,
  busy,
  studentName,
  initialNote = '',
}: DeclineModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [customNote, setCustomNote] = useState<string>(initialNote)

  const handleConfirm = () => {
    const combinedReason = [selectedReason, customNote].filter(Boolean).join(' - ')
    onConfirm(combinedReason)
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md">
          <Modal.CloseTrigger />
          <Modal.Header className="flex flex-col gap-1">
            <Modal.Heading className="text-lg font-bold text-danger">
              ثبت انصراف از دعوت
            </Modal.Heading>
            {studentName && (
              <p className="text-xs text-muted">دانش‌آموز: {studentName}</p>
            )}
          </Modal.Header>

          <Modal.Body className="flex flex-col gap-3 py-2">
            <p className="text-xs text-muted">
              علت انصراف دانش‌آموز از شرکت در این مراسم را مشخص کنید:
            </p>

            <div className="flex flex-wrap gap-1.5">
              {DECLINE_REASONS.map((reason) => {
                const isSelected = selectedReason === reason
                return (
                  <Chip
                    key={reason}
                    size="sm"
                    variant={isSelected ? 'primary' : 'soft'}
                    color={isSelected ? 'danger' : 'default'}
                    className="cursor-pointer transition-colors"
                    onClick={() => setSelectedReason(isSelected ? '' : reason)}
                  >
                    {reason}
                  </Chip>
                )
              })}
            </div>

            <TextareaField
              label="توضیحات تکمیلی (اختیاری)"
              placeholder="نکات تکمیلی یا علت دقیق عدم حضور..."
              rows={3}
              value={customNote}
              onChange={setCustomNote}
            />
          </Modal.Body>

          <Modal.Footer className="flex items-center justify-end gap-2">
            <Button variant="outline" onPress={() => onOpenChange(false)} isDisabled={busy}>
              انصراف
            </Button>
            <Button variant="danger" isDisabled={busy} onPress={handleConfirm}>
              {busy ? 'در حال ثبت…' : 'تأیید انصراف نهایی'}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
