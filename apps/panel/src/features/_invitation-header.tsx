import { Button, Card, Chip } from '@heroui/react'
import type { SessionSummary } from '@rasad/contracts'
import { PanelSelect } from '../components/panel-select'
import { formatDate } from '../lib/date'

export interface InvitationHeaderProps {
  ceremonies: { id: number; title: string }[]
  selectedCeremonyId: string
  onSelectCeremony: (ceremonyId: string) => void
  busy: boolean
  hasClaim: boolean
  onClaim: () => void
  activeSession?: SessionSummary | null
}

export function InvitationHeader({
  ceremonies,
  selectedCeremonyId,
  onSelectCeremony,
  busy,
  hasClaim,
  onClaim,
  activeSession,
}: InvitationHeaderProps) {
  return (
    <Card className="border border-border bg-surface shadow-xs">
      <Card.Header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div>
          <Card.Title className="text-lg font-bold text-foreground">
            ایستگاه تماس و دعوت
          </Card.Title>
          <Card.Description className="text-xs text-muted">
            تعیین و اختصاص سانس به دانش‌آموزان
          </Card.Description>
        </div>

        {activeSession && (
          <div className="flex items-center gap-2 bg-surface-secondary border border-border px-3 py-1 rounded-md text-xs">
            <span className="text-muted">سانس در حال تکمیل:</span>
            <strong className="text-foreground">{activeSession.title || 'سانس اصلی'}</strong>
            <Chip color="accent" variant="soft" size="sm" className="tabular-nums">
              {formatDate(activeSession.startsAt)}
            </Chip>
          </div>
        )}
      </Card.Header>

      <Card.Content className="pt-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <PanelSelect
            id="ceremony-select"
            label="انتخاب مراسم"
            className="flex-1"
            value={selectedCeremonyId}
            placeholder="مراسم را انتخاب کنید"
            disabled={busy || hasClaim}
            options={ceremonies.map((item) => ({
              value: String(item.id),
              label: item.title,
            }))}
            onChange={onSelectCeremony}
          />

          <Button
            variant="primary"
            size="md"
            isDisabled={!selectedCeremonyId || busy}
            onPress={onClaim}
            className="sm:w-auto shrink-0"
          >
            {busy
              ? 'در حال دریافت…'
              : hasClaim
                ? 'تمدید مهلت تماس'
                : 'دریافت دانش‌آموز بعدی'}
          </Button>
        </div>
      </Card.Content>
    </Card>
  )
}
