import { useEffect, useState } from 'react'
import { Alert, Button, Card, Chip, Kbd } from '@heroui/react'
import type { InvitationOutcome, InvitationQueue, PanelContext } from '@rasad/contracts'
import { errorMessage, request } from '../lib/api'
import { ErrorNotice, SuccessNotice, TextareaField } from '../components/ui'
import { formatDate } from '../lib/date'

const OUTCOME_CONFIG: Record<
  InvitationOutcome,
  { label: string; variant: 'primary' | 'secondary' | 'outline' | 'danger'; hotkey: string }
> = {
  accepted: { label: 'پذیرفت (ثبت در سانس)', variant: 'primary', hotkey: '1' },
  needs_alternative_session: { label: 'سانس دیگری می‌خواهد', variant: 'secondary', hotkey: '2' },
  no_answer_sms: { label: 'پاسخ نداد؛ ارسال پیامک', variant: 'outline', hotkey: '3' },
  failed: { label: 'دعوت ناموفق', variant: 'danger', hotkey: '4' },
}

export function Invitation() {
  const [context, setContext] = useState<PanelContext>()
  const [ceremony, setCeremony] = useState('')
  const [queue, setQueue] = useState<InvitationQueue>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [done, setDone] = useState('')

  useEffect(() => {
    let active = true
    request<PanelContext>('/panel/context')
      .then((data) => {
        if (active) setContext(data)
      })
      .catch((error) => {
        if (active) setError(errorMessage(error))
      })
    return () => {
      active = false
    }
  }, [])

  async function claim() {
    if (!ceremony || busy) return
    setBusy(true)
    setError('')
    setDone('')
    try {
      const data = await request<InvitationQueue>('/panel/invite/claim', {
        ceremonyId: Number(ceremony),
      })
      setQueue(data)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function submitOutcome(outcome: InvitationOutcome) {
    if (!queue?.claim || busy) return
    setBusy(true)
    setError('')
    setDone('')
    try {
      await request('/panel/invite/submit', {
        ceremonyId: Number(ceremony),
        claimToken: queue.claim.token,
        sessionId: queue.claim.session.id,
        outcome,
        note,
      })
      setQueue(undefined)
      setNote('')
      setDone('نتیجه تماس با موفقیت ثبت شد. برای ادامه، دانش‌آموز بعدی را دریافت کنید.')
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  // Keyboard hotkeys (1-4) for high-throughput outcome selection
  useEffect(() => {
    if (!queue?.claim || busy) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return
      }

      if (event.key === '1') {
        event.preventDefault()
        void submitOutcome('accepted')
      } else if (event.key === '2') {
        event.preventDefault()
        void submitOutcome('needs_alternative_session')
      } else if (event.key === '3') {
        event.preventDefault()
        void submitOutcome('no_answer_sms')
      } else if (event.key === '4') {
        event.preventDefault()
        void submitOutcome('failed')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [queue?.claim, busy, ceremony, note])

  return (
    <div className="flex flex-col gap-6">
      {/* Context Banner */}
      <Card className="border border-border bg-surface">
        <Card.Header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Card.Title className="text-xl font-bold">دعوت دانش‌آموزان</Card.Title>
            <Card.Description className="text-sm text-muted">
              ایستگاه تماس و تعیین سانس مراسم
            </Card.Description>
          </div>

          {queue?.session && (
            <div className="flex items-center gap-2 bg-surface/60 border border-border px-3 py-1.5 rounded-lg text-sm">
              <span className="text-muted">سانس در حال پر شدن:</span>
              <strong className="text-foreground">{queue.session.title || 'سانس اصلی'}</strong>
              <Chip color="accent" variant="soft">
                {formatDate(queue.session.startsAt)}
              </Chip>
            </div>
          )}
        </Card.Header>

        <Card.Content>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <label htmlFor="ceremony-select" className="text-sm font-medium text-foreground">
                انتخاب مراسم
              </label>
              <select
                id="ceremony-select"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-2 focus:outline-accent"
                value={ceremony}
                disabled={busy || Boolean(queue?.claim)}
                onChange={(event) => {
                  setCeremony(event.target.value)
                  setQueue(undefined)
                  setDone('')
                }}
              >
                <option value="">مراسم را انتخاب کنید</option>
                {context?.ceremonies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              size="md"
              isDisabled={!ceremony || busy}
              onPress={claim}
              className="sm:w-auto"
            >
              {busy ? 'در حال دریافت…' : queue?.claim ? 'بازخوانی وضعیت دعوت' : 'دریافت دانش‌آموز بعدی'}
            </Button>
          </div>
        </Card.Content>
      </Card>

      <ErrorNotice message={error} />
      <SuccessNotice message={done} />

      {queue && !queue.claim && (
        <Alert status="default" className="my-2">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>صف دعوت خالی است</Alert.Title>
            <Alert.Description>
              در حال حاضر دانش‌آموز واجد شرایطی برای تماس در دسترس نیست.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Dominant Calling Card */}
      {queue?.claim && (
        <Card className="border-2 border-accent/40 bg-surface shadow-md">
          <Card.Header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border pb-4">
            <div>
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                دانش‌آموز در حال تماس
              </span>
              <Card.Title className="text-2xl font-bold mt-1 text-foreground">
                {queue.claim.student.firstName} {queue.claim.student.lastName}
              </Card.Title>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">مهلت ثبت ادعا:</span>
              <Chip color="warning" variant="soft">
                {formatDate(queue.claim.expiresAt)}
              </Chip>
            </div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-6 pt-5">
            {/* Phone Click-to-Call Buttons */}
            <div>
              <span className="text-sm font-medium text-muted block mb-2">شماره‌های تماس:</span>
              <div className="flex flex-wrap items-center gap-3">
                {(
                  [
                    ['دانش‌آموز', queue.claim.student.mobile],
                    ['مادر', queue.claim.student.motherMobile],
                    ['پدر', queue.claim.student.fatherMobile],
                  ] as const
                ).map(
                  ([label, phone]) =>
                    phone && (
                      <a
                        key={label}
                        href={`tel:${phone}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-surface hover:bg-muted/30 text-foreground transition-colors font-medium shadow-xs"
                      >
                        <span className="text-xs text-muted">{label}:</span>
                        <bdi className="font-mono text-base font-semibold" dir="ltr">
                          {phone}
                        </bdi>
                      </a>
                    ),
                )}
              </div>
            </div>

            {/* Note field */}
            <TextareaField
              label="یادداشت تماس (اختیاری)"
              placeholder="در صورت نیاز توضیحات را وارد کنید..."
              rows={2}
              value={note}
              onChange={setNote}
            />

            {/* 4-Outcome Matrix */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">ثبت نتیجه تماس:</span>
                <span className="text-xs text-muted hidden sm:inline">
                  میانبرهای کیبورد فعال هستند (کلیدهای ۱ تا ۴)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.entries(OUTCOME_CONFIG) as [InvitationOutcome, (typeof OUTCOME_CONFIG)[InvitationOutcome]][]).map(
                  ([outcomeKey, config]) => (
                    <Button
                      key={outcomeKey}
                      variant={config.variant}
                      size="lg"
                      isDisabled={busy}
                      onPress={() => submitOutcome(outcomeKey)}
                      className="justify-between h-auto py-3 px-4"
                    >
                      <span className="font-medium text-sm">{config.label}</span>
                      <Kbd className="font-mono text-xs">{config.hotkey}</Kbd>
                    </Button>
                  ),
                )}
              </div>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  )
}
