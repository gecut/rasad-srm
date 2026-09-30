import { useEffect, useRef, useState } from 'react'
import { Alert } from '@heroui/react'
import type {
  InvitationOutcome,
  InvitationQueue,
  PanelContext,
  SessionSummary,
} from '@rasad/contracts'
import { errorMessage, request } from '../lib/api'
import { ErrorNotice, SuccessNotice } from '../components/ui'
import { InvitationHeader } from './_invitation-header'
import { StudentCallingHero } from './_student-calling-hero'
import { SessionSelectModal } from './_session-select-modal'
import { StudentDossierModal } from './_student-dossier-modal'
import { NoteModal } from './_note-modal'
import { PostponeModal } from './_postpone-modal'
import { DeclineModal } from './_decline-modal'

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

  // Modals state
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [dossierModalOpen, setDossierModalOpen] = useState(false)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [postponeModalOpen, setPostponeModalOpen] = useState(false)
  const [declineModalOpen, setDeclineModalOpen] = useState(false)

  const isAnyModalOpen =
    sessionModalOpen ||
    dossierModalOpen ||
    noteModalOpen ||
    postponeModalOpen ||
    declineModalOpen

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

  // Auto-select session when queue changes
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

  const selectedSession =
    ceremonySessions.find((s) => s.id === selectedSessionId) ||
    queue?.claim?.session ||
    queue?.session

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

  async function submitOutcome(
    outcome: InvitationOutcome,
    postponedUntilDate?: string,
    extraNote?: string,
  ) {
    if (!queue?.claim || busy || isClaimExpired) return
    if (!selectedSessionId) {
      setError('لطفاً سانس مدنظر را انتخاب کنید.')
      return
    }

    if (outcome === 'postponed' && !postponedUntilDate) {
      setPostponeModalOpen(true)
      return
    }

    if (outcome === 'declined' && extraNote === undefined) {
      setDeclineModalOpen(true)
      return
    }

    setBusy(true)
    setError('')
    setDone('')
    try {
      const finalNote = [note, extraNote].filter(Boolean).join(' - ')
      await request('/panel/invite/submit', {
        ceremonyId: Number(ceremony),
        claimToken: queue.claim.token,
        sessionId: selectedSessionId,
        outcome,
        note: finalNote || undefined,
        postponedUntil: postponedUntilDate,
      })
      setQueue(undefined)
      setNote('')
      setIsClaimExpired(false)
      setPostponeModalOpen(false)
      setDeclineModalOpen(false)
      setDone('نتیجه تماس با موفقیت ثبت شد.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const submitOutcomeRef = useRef(submitOutcome)
  submitOutcomeRef.current = submitOutcome

  // Keyboard hotkeys (1-4) for rapid calling operations
  useEffect(() => {
    if (!queue?.claim || busy || isClaimExpired || isAnyModalOpen) return

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
  }, [Boolean(queue?.claim), busy, isClaimExpired, isAnyModalOpen])

  const studentFullName = queue?.claim?.student
    ? `${queue.claim.student.firstName} ${queue.claim.student.lastName}`
    : undefined

  return (
    <div className="flex flex-col gap-4">
      {/* Header & Claim Station */}
      <InvitationHeader
        ceremonies={context?.ceremonies || []}
        selectedCeremonyId={ceremony}
        onSelectCeremony={(val) => {
          setCeremony(val)
          setQueue(undefined)
          setDone('')
        }}
        busy={busy}
        hasClaim={Boolean(queue?.claim)}
        onClaim={claim}
        activeSession={queue?.session}
      />

      {/* Status Alerts & Notices */}
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

      {/* Main Calling Hero (One-Screen Viewport) */}
      {queue?.claim && (
        <StudentCallingHero
          claim={queue.claim}
          selectedSession={selectedSession}
          onOpenSessionSelect={() => setSessionModalOpen(true)}
          onOpenDossier={() => setDossierModalOpen(true)}
          onOpenNote={() => setNoteModalOpen(true)}
          note={note}
          onOutcome={(outcome) => void submitOutcome(outcome)}
          isExpired={isClaimExpired}
          busy={busy}
          onRenewClaim={claim}
          onExpire={() => setIsClaimExpired(true)}
        />
      )}

      {/* Secondary Workflow Modals */}
      <SessionSelectModal
        isOpen={sessionModalOpen}
        onOpenChange={setSessionModalOpen}
        sessions={ceremonySessions}
        selectedSessionId={selectedSessionId || null}
        onSelect={(id) => setSelectedSessionId(id)}
      />

      {queue?.claim && (
        <StudentDossierModal
          isOpen={dossierModalOpen}
          onOpenChange={setDossierModalOpen}
          student={queue.claim.student}
        />
      )}

      <NoteModal
        isOpen={noteModalOpen}
        onOpenChange={setNoteModalOpen}
        studentName={studentFullName}
        note={note}
        onSave={setNote}
      />

      <PostponeModal
        isOpen={postponeModalOpen}
        onOpenChange={setPostponeModalOpen}
        busy={busy}
        initialNote={note}
        onConfirm={(targetDate, postponeNote) => {
          void submitOutcome('postponed', targetDate, postponeNote)
        }}
      />

      <DeclineModal
        isOpen={declineModalOpen}
        onOpenChange={setDeclineModalOpen}
        busy={busy}
        studentName={studentFullName}
        initialNote={note}
        onConfirm={(reason) => {
          void submitOutcome('declined', undefined, reason)
        }}
      />
    </div>
  )
}
