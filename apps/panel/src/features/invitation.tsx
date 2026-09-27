import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import type { InvitationOutcome, InvitationQueue, PanelContext } from '@rasad/contracts'
import { errorMessage, request } from '../lib/api'
import { ErrorNotice, Section } from '../components/ui'
import { formatDate } from '../lib/date'
const outcomes: { value: InvitationOutcome; label: string }[] = [
  { value: 'accepted', label: 'پذیرفت' },
  { value: 'needs_alternative_session', label: 'سانس دیگری می‌خواهد' },
  { value: 'no_answer_sms', label: 'پاسخ نداد؛ ارسال پیامک' },
  { value: 'failed', label: 'دعوت ناموفق' },
]
export function Invitation() {
  const [context, setContext] = useState<PanelContext>()
  const [ceremony, setCeremony] = useState('')
  const [queue, setQueue] = useState<InvitationQueue>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [outcome, setOutcome] = useState<InvitationOutcome>('accepted')
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
    try {
      setQueue(
        await request<InvitationQueue>('/panel/invite/claim', { ceremonyId: Number(ceremony) }),
      )
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  async function submit() {
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
      setDone('نتیجه ثبت شد. برای ادامه، دانش‌آموز بعدی را دریافت کنید.')
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main>
      <h1>دعوت دانش‌آموزان</h1>
      <div className="surface stack">
        <label>
          مراسم
          <select
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
        </label>
        <Button isDisabled={!ceremony || busy} onPress={claim}>
          {queue?.claim ? 'بازخوانی وضعیت دعوت' : 'دریافت دانش‌آموز بعدی'}
        </Button>
        {queue?.session && (
          <p>
            سانس فعلی: {queue.session.title || 'سانس مراسم'} — {formatDate(queue.session.startsAt)}
          </p>
        )}
      </div>
      <ErrorNotice message={error} />
      {done && (
        <p role="status" className="notice">
          {done}
        </p>
      )}
      {queue && !queue.claim && (
        <p role="status">در حال حاضر دانش‌آموزی برای تماس در دسترس نیست.</p>
      )}
      {queue?.claim && (
        <Section title={`${queue.claim.student.firstName} ${queue.claim.student.lastName}`}>
          <div className="stack">
            <div className="row">
              {(
                [
                  ['دانش‌آموز', queue.claim.student.mobile],
                  ['مادر', queue.claim.student.motherMobile],
                  ['پدر', queue.claim.student.fatherMobile],
                ] as const
              ).map(
                ([label, phone]) =>
                  phone && (
                    <a key={label} href={`tel:${phone}`} className="notice">
                      {label}: <bdi>{phone}</bdi>
                    </a>
                  ),
              )}
            </div>
            <p className="muted">مهلت ثبت: {formatDate(queue.claim.expiresAt)}</p>
            <label>
              نتیجه تماس
              <select
                value={outcome}
                disabled={busy}
                onChange={(event) => setOutcome(event.target.value as InvitationOutcome)}
              >
                {outcomes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              یادداشت (اختیاری)
              <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
            <Button isDisabled={busy} onPress={submit}>
              {busy ? 'در حال ثبت…' : 'ثبت نتیجه تماس'}
            </Button>
          </div>
        </Section>
      )}
    </main>
  )
}
