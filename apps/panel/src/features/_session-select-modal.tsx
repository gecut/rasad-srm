import { Button, Card, Chip, Modal } from '@heroui/react'
import type { SessionSummary } from '@rasad/contracts'
import { CalendarIcon, CheckCircleIcon } from '../components/icons'
import { formatDate } from '../lib/date'

export interface SessionSelectModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  sessions: SessionSummary[]
  selectedSessionId: number | null
  onSelect: (sessionId: number) => void
}

export function SessionSelectModal({
  isOpen,
  onOpenChange,
  sessions,
  selectedSessionId,
  onSelect,
}: SessionSelectModalProps) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-lg">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>انتخاب سانس مراسم</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="flex flex-col gap-3 py-2">
            <p className="text-xs text-muted">
              سانس مدنظر برای حضور دانش‌آموز در مراسم را انتخاب کنید:
            </p>

            {sessions.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted">
                سانسی برای این مراسم یافت نشد.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-0.5">
                {sessions.map((s) => {
                  const isSelected = selectedSessionId === s.id
                  const isFilling = s.status === 'filling'
                  const fillRatio = s.capacity
                    ? Math.round(((s.acceptedCount || 0) / s.capacity) * 100)
                    : null

                  return (
                    <Card
                      key={s.id}
                      className={`cursor-pointer transition-colors border ${
                        isSelected
                          ? 'border-accent bg-accent/5 ring-1 ring-accent'
                          : 'border-border hover:border-border-hover bg-surface'
                      }`}
                      onClick={() => {
                        onSelect(s.id)
                        onOpenChange(false)
                      }}
                    >
                      <Card.Content className="p-3.5 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {s.title}
                            </span>
                            {isFilling && (
                              <Chip size="sm" variant="soft" color="accent">
                                سانس پیش‌فرض
                              </Chip>
                            )}
                          </div>
                          {isSelected && (
                            <Chip
                              size="sm"
                              color="accent"
                              variant="primary"
                              className="flex items-center gap-1"
                            >
                              <CheckCircleIcon className="size-3.5 shrink-0 inline-block" />
                              <span>انتخاب شده</span>
                            </Chip>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <CalendarIcon className="size-3.5 shrink-0 text-muted" />
                          <span className="tabular-nums">{formatDate(s.startsAt)}</span>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                          <span className="text-muted">وضعیت ظرفیت:</span>
                          {s.capacity ? (
                            <span
                              className={`tabular-nums font-medium ${
                                fillRatio! >= 100
                                  ? 'text-danger'
                                  : fillRatio! >= 80
                                    ? 'text-warning'
                                    : 'text-foreground'
                              }`}
                            >
                              {s.acceptedCount || 0} از {s.capacity} نفر ({fillRatio}٪)
                            </span>
                          ) : (
                            <span className="tabular-nums font-medium text-foreground">
                              {s.acceptedCount || 0} نفر پذیرفته‌شده
                            </span>
                          )}
                        </div>
                      </Card.Content>
                    </Card>
                  )
                })}
              </div>
            )}
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
