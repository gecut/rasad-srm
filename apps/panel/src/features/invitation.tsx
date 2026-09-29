import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Chip, Kbd, Modal } from '@heroui/react'
import type {
  InvitationOutcome,
  InvitationQueue,
  PanelContext,
  SessionSummary,
} from '@rasad/contracts'
import { errorMessage, request } from '../lib/api'
import { ErrorNotice, SuccessNotice, TextareaField } from '../components/ui'
import { formatDate } from '../lib/date'
import {
  CalendarIcon,
  CheckCircleIcon,
  CloseCircleIcon,
  ChatLineIcon,
  PhoneIcon,
  StopwatchIcon,
} from '../components/icons'
import { InvitationTimer } from './_invitation-timer'
import { PanelSelect } from '../components/panel-select'

const OUTCOME_CONFIG: Record<
  string,
  {
    label: string
    variant: 'primary' | 'secondary' | 'outline' | 'danger'
    hotkey: string
    icon: typeof CheckCircleIcon
  }
> = {
  accepted: {
    label: 'پذیرفت (ثبت در سانس)',
    variant: 'primary',
    hotkey: '1',
    icon: CheckCircleIcon,
  },
  no_answer: {
    label: 'عدم پاسخ (تماس در دور بعد)',
    variant: 'outline',
    hotkey: '2',
    icon: ChatLineIcon,
  },
  declined: {
    label: 'انصراف / عدم تمایل',
    variant: 'danger',
    hotkey: '3',
    icon: CloseCircleIcon,
  },
  postponed: {
    label: 'تماس مجدد (تعویق)',
    variant: 'secondary',
    hotkey: '4',
    icon: StopwatchIcon,
  },
}

export function Invitation() {
  const [context, setContext] = useState<PanelContext>()
  const [ceremony, setCeremony] = useState('')
  const [queue, setQueue] = useState<InvitationQueue>()
  const [selectedSessionId, setSelectedSessionId] = useState<number>()
  const [busy, setBusy] = useState(false)
  const [isClaimExpired, setIsClaimExpired] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [done, setDone] = useState('')

  // Postpone modal state
  const [postponeModalOpen, setPostponeModalOpen] = useState(false)
  const [postponeMinutes, setPostponeMinutes] = useState(60)

  useEffect(() => {
    let active = true
    request<PanelContext>('/panel/context')
      .then((data) => {
        if (active) setContext(data)
      })
      .catch((err) => {
        if (active) setError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [])

  // Update selectedSessionId whenever queue/claim changes
  useEffect(() => {
    if (queue?.claim?.session.id) {
      setSelectedSessionId(queue.claim.session.id)
    } else if (queue?.session?.id) {
      setSelectedSessionId(queue.session.id)
    }
  }, [queue?.claim?.session.id, queue?.session?.id])

  const ceremonySessions: SessionSummary[] =
    queue?.availableSessions ||
    context?.ceremonies.find((c) => String(c.id) === ceremony)?.sessions ||
    []

  async function claim() {
    if (!ceremony || busy) return
    setBusy(true)
    setError('')
    setDone('')
    try {
      const next = await request<InvitationQueue>('/panel/invite/claim', {
        ceremonyId: Number(ceremony),
      })
      setQueue(next)
      setIsClaimExpired(false)
      if (!queue?.claim) {
        setNote('')
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function submitOutcome(outcome: InvitationOutcome, postponedUntilDate?: string) {
    if (!queue?.claim || busy || isClaimExpired) return
    if (!selectedSessionId) {
      setError('لطفاً سانس مدنظر را انتخاب کنید.')
      return
    }

    if (outcome === 'postponed' && !postponedUntilDate) {
      setPostponeModalOpen(true)
      return
    }

    setBusy(true)
    setError('')
    setDone('')
    try {
      await request('/panel/invite/submit', {
        ceremonyId: Number(ceremony),
        claimToken: queue.claim.token,
        sessionId: selectedSessionId,
        outcome,
        note,
        postponedUntil: postponedUntilDate,
      })
      setQueue(undefined)
      setNote('')
      setIsClaimExpired(false)
      setPostponeModalOpen(false)
      setDone(
        'نتیجه تماس با موفقیت ثبت شد. برای ادامه، بر روی «بروزرسانی ظرفیت خالی و دریافت دانش‌آموز بعدی» کلیک فرمایید.',
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const submitOutcomeRef = useRef(submitOutcome)
  submitOutcomeRef.current = submitOutcome

  // Keyboard hotkeys (1-4) for high-throughput outcome selection
  useEffect(() => {
    if (!queue?.claim || busy || isClaimExpired || postponeModalOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.isContentEditable)
      ) {
        return
      }

      if (event.key === '1') {
        event.preventDefault()
        void submitOutcomeRef.current('accepted')
      } else if (event.key === '2') {
        event.preventDefault()
        void submitOutcomeRef.current('no_answer')
      } else if (event.key === '3') {
        event.preventDefault()
        void submitOutcomeRef.current('declined')
      } else if (event.key === '4') {
        event.preventDefault()
        void submitOutcomeRef.current('postponed')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [Boolean(queue?.claim), busy, isClaimExpired, postponeModalOpen])

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
              <span className="text-muted">سانس در حال تکمیل:</span>
              <strong className="text-foreground">{queue.session.title || 'سانس اصلی'}</strong>
              <Chip color="accent" variant="soft">
                {formatDate(queue.session.startsAt)}
              </Chip>
            </div>
          )}
        </Card.Header>

        <Card.Content>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            <PanelSelect
              id="ceremony-select"
              label="انتخاب مراسم"
              className="flex-1"
              value={ceremony}
              placeholder="مراسم را انتخاب کنید"
              disabled={busy || Boolean(queue?.claim)}
              options={
                context?.ceremonies.map((item) => ({
                  value: String(item.id),
                  label: item.title,
                })) || []
              }
              onChange={(val) => {
                setCeremony(val)
                setQueue(undefined)
                setDone('')
              }}
            />

            <Button
              variant="primary"
              size="md"
              isDisabled={!ceremony || busy}
              onPress={claim}
              className="sm:w-auto"
            >
              {busy
                ? 'در حال دریافت…'
                : queue?.claim
                  ? 'بروزرسانی ظرفیت خالی'
                  : 'بروزرسانی ظرفیت خالی و دریافت دانش‌آموز بعدی'}
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
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                  دانش‌آموز در حال تماس
                </span>
                {queue.claim.student.grade && (
                  <Chip size="sm" variant="soft" color="accent">
                    پایه {queue.claim.student.grade}
                  </Chip>
                )}
                {queue.claim.student.neighborhood && (
                  <Chip size="sm" variant="soft" color="default">
                    محله: {queue.claim.student.neighborhood.name}
                  </Chip>
                )}
                {queue.claim.student.referrer && (
                  <span className="text-xs text-muted">معرف: {queue.claim.student.referrer}</span>
                )}
              </div>
              <Card.Title className="text-2xl font-bold text-foreground">
                {queue.claim.student.firstName} {queue.claim.student.lastName}
              </Card.Title>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">مهلت تماس:</span>
              <InvitationTimer
                expiresAt={queue.claim.expiresAt}
                onExpire={() => setIsClaimExpired(true)}
              />
            </div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-6 pt-5">
            {/* Expiration Freeze Banner */}
            {isClaimExpired && (
              <div className="bg-warning/15 border border-warning/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <StopwatchIcon className="size-5 text-warning shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    مهلت ثبت این تماس منقضی شده است. برای ثبت نتیجه، لطفاً مهلت تماس را تمدید
                    فرمایید (یادداشت حفظ می‌شود).
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  isDisabled={busy}
                  onPress={claim}
                  className="w-full sm:w-auto shrink-0"
                >
                  {busy ? 'در حال تمدید…' : 'تمدید مهلت تماس'}
                </Button>
              </div>
            )}

            {/* Past 2 Ceremonies Attendance History */}
            {queue.claim.student.recentCheckins &&
              queue.claim.student.recentCheckins.length > 0 && (
                <div className="bg-surface/70 border border-border rounded-xl p-3.5 flex flex-col gap-2">
                  <span className="text-xs font-semibold text-muted block">
                    سابقه حضور در ۲ مراسم اخیر:
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {queue.claim.student.recentCheckins.map((rc, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-surface text-xs font-medium"
                      >
                        <CheckCircleIcon className="size-3.5 text-accent" />
                        <strong className="text-foreground">{rc.ceremonyTitle}</strong>
                        <span className="text-muted">({rc.sessionTitle || 'سانس'})</span>
                        <span className="text-muted text-xs font-mono" dir="ltr">
                          {formatDate(rc.checkedInAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Dossier notes */}
            {queue.claim.student.notes && (
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-xs text-foreground leading-relaxed">
                <strong className="text-warning">ملاحظات پرونده:</strong>{' '}
                {queue.claim.student.notes}
              </div>
            )}

            {/* Phone Click-to-Call Buttons */}
            <div>
              <span className="text-sm font-medium text-muted block mb-2">شماره‌های تماس:</span>
              <div className="flex flex-wrap items-center gap-3">
                {(
                  [
                    ['دانش‌آموز', queue.claim.student.mobile],
                    ['مادر', queue.claim.student.motherMobile],
                    ['پدر', queue.claim.student.fatherMobile],
                    ['تلفن ثابت', queue.claim.student.landline],
                  ] as const
                ).map(
                  ([label, phone]) =>
                    phone && (
                      <a
                        key={label}
                        href={`tel:${phone}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-surface hover:bg-muted/30 text-foreground transition-colors font-medium shadow-xs"
                      >
                        <PhoneIcon className="size-4 text-accent" />
                        <span className="text-xs text-muted">{label}:</span>
                        <bdi className="font-mono text-base font-semibold" dir="ltr">
                          {phone}
                        </bdi>
                      </a>
                    ),
                )}
              </div>
            </div>

            {/* Session Selection Grid with Live Capacity */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  انتخاب سانس جهت ثبت حضور:
                </span>
                <span className="text-xs text-muted">
                  در صورت درخواست خانواده برای ساعت دیگر، سانس را انتخاب کنید
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ceremonySessions.map((s) => {
                  const isSelected = selectedSessionId === s.id
                  const fillRatio = s.capacity
                    ? Math.round(((s.acceptedCount || 0) / s.capacity) * 100)
                    : null
                  return (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedSessionId(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedSessionId(s.id)
                        }
                      }}
                      className={`flex flex-col p-3.5 rounded-xl border text-right transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'border-accent bg-accent/10 ring-2 ring-accent'
                          : 'border-border bg-surface hover:bg-muted/15'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <strong className="text-sm font-bold text-foreground">
                          {s.title || 'سانس'}
                        </strong>
                        {s.status === 'filling' && (
                          <Chip size="sm" variant="soft" color="accent">
                            پیش‌فرض
                          </Chip>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <CalendarIcon className="size-3.5 text-muted shrink-0" />
                        <span>{formatDate(s.startsAt)}</span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                        <span className="text-muted">ظرفیت:</span>
                        {s.capacity ? (
                          <span
                            className={`font-semibold ${
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
                          <span className="font-semibold text-foreground">
                            {s.acceptedCount || 0} نفر پذیرفته‌شده
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
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
                {(
                  Object.entries(OUTCOME_CONFIG) as [
                    InvitationOutcome,
                    (typeof OUTCOME_CONFIG)[string],
                  ][]
                ).map(([outcomeKey, config]) => (
                  <Button
                    key={outcomeKey}
                    variant={config.variant}
                    size="lg"
                    isDisabled={busy || isClaimExpired}
                    onPress={() => submitOutcome(outcomeKey)}
                    className="justify-between h-auto py-3 px-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <config.icon className="size-5 shrink-0" />
                      <span className="font-medium text-sm">{config.label}</span>
                    </div>
                    <Kbd className="font-mono text-xs">{config.hotkey}</Kbd>
                  </Button>
                ))}
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Postpone Callback Modal */}
      <Modal.Backdrop isOpen={postponeModalOpen} onOpenChange={setPostponeModalOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>تعویق و تماس مجدد</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-xs text-muted">
                مشخص کنید دانش‌آموز چه مدت دیگر مجدداً در صف تماس قرار گیرد:
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: '۳۰ دقیقه دیگر', minutes: 30 },
                  { label: '۱ ساعت دیگر', minutes: 60 },
                  { label: '۲ ساعت دیگر', minutes: 120 },
                  { label: 'فردا صبح', minutes: 1440 },
                ].map((item) => (
                  <Button
                    key={item.minutes}
                    variant={postponeMinutes === item.minutes ? 'primary' : 'outline'}
                    size="md"
                    onPress={() => setPostponeMinutes(item.minutes)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </Modal.Body>
            <Modal.Footer className="flex items-center justify-end gap-2">
              <Button variant="outline" onPress={() => setPostponeModalOpen(false)}>
                انصراف
              </Button>
              <Button
                variant="primary"
                isDisabled={busy}
                onPress={() => {
                  const targetTime = new Date(
                    Date.now() + postponeMinutes * 60 * 1000,
                  ).toISOString()
                  void submitOutcome('postponed', targetTime)
                }}
              >
                {busy ? 'در حال ثبت…' : 'تأیید تعویق'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  )
}
