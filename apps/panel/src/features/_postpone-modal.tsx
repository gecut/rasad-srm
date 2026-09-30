import { useState } from 'react'
import { Button, Modal } from '@heroui/react'
import { TextareaField } from '../components/ui'

export interface PostponeModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onConfirm: (postponedUntil: string, note?: string) => void
  busy: boolean
  initialNote?: string
}

const PRESETS = [
  { label: '۳۰ دقیقه دیگر', minutes: 30 },
  { label: '۱ ساعت دیگر', minutes: 60 },
  { label: '۲ ساعت دیگر', minutes: 120 },
  { label: 'فردا صبح', minutes: 1440 },
]

export function PostponeModal({
  isOpen,
  onOpenChange,
  onConfirm,
  busy,
  initialNote = '',
}: PostponeModalProps) {
  const [selectedMinutes, setSelectedMinutes] = useState(60)
  const [postponeNote, setPostponeNote] = useState(initialNote)

  const handleConfirm = () => {
    const targetDate = new Date(Date.now() + selectedMinutes * 60 * 1000).toISOString()
    onConfirm(targetDate, postponeNote)
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>تعویق و تماس مجدد</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="flex flex-col gap-4 py-2">
            <p className="text-xs text-muted">
              مشخص کنید دانش‌آموز چه مدت دیگر مجدداً در صف تماس قرار گیرد:
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {PRESETS.map((item) => (
                <Button
                  key={item.minutes}
                  variant={selectedMinutes === item.minutes ? 'primary' : 'outline'}
                  size="md"
                  onPress={() => setSelectedMinutes(item.minutes)}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            <TextareaField
              label="توضیح یا علت تعویق (اختیاری)"
              placeholder="مثلاً: گفتند نیم ساعت دیگه تماس بگیرید، بیرون هستند..."
              rows={2}
              value={postponeNote}
              onChange={setPostponeNote}
            />
          </Modal.Body>

          <Modal.Footer className="flex items-center justify-end gap-2">
            <Button variant="outline" onPress={() => onOpenChange(false)} isDisabled={busy}>
              انصراف
            </Button>
            <Button variant="primary" isDisabled={busy} onPress={handleConfirm}>
              {busy ? 'در حال ثبت…' : 'تأیید تعویق'}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
