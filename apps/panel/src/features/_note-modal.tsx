import { useEffect, useState } from 'react'
import { Button, Modal } from '@heroui/react'
import { TextareaField } from '../components/ui'

export interface NoteModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  studentName?: string
  note: string
  onSave: (note: string) => void
}

export function NoteModal({
  isOpen,
  onOpenChange,
  studentName,
  note,
  onSave,
}: NoteModalProps) {
  const [value, setValue] = useState(note)

  useEffect(() => {
    if (isOpen) {
      setValue(note)
    }
  }, [isOpen, note])

  const handleSave = () => {
    onSave(value)
    onOpenChange(false)
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md">
          <Modal.CloseTrigger />
          <Modal.Header className="flex flex-col gap-1">
            <Modal.Heading className="text-lg font-bold">یادداشت تماس</Modal.Heading>
            {studentName && (
              <p className="text-xs text-muted">دانش‌آموز: {studentName}</p>
            )}
          </Modal.Header>

          <Modal.Body className="py-2">
            <TextareaField
              label="توضیحات یا موارد ضروری تماس"
              placeholder="نکات مهم یا درخواست‌های مطرح‌شده در مکالمه..."
              rows={4}
              value={value}
              onChange={setValue}
            />
          </Modal.Body>

          <Modal.Footer className="flex items-center justify-end gap-2">
            <Button variant="outline" onPress={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button variant="primary" onPress={handleSave}>
              ذخیره یادداشت
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
