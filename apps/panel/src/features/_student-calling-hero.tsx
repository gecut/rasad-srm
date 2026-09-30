import { Button, Card, Chip, Kbd } from '@heroui/react'
import type { InvitationOutcome, SessionSummary, StudentCard } from '@rasad/contracts'
import {
  CalendarIcon,
  CheckCircleIcon,
  DangerCircleIcon,
  EditIcon,
  NotesIcon,
  PhoneIcon,
  StopwatchIcon,
} from '../components/icons'
import { formatDate } from '../lib/date'
import { InvitationTimer } from './_invitation-timer'

export interface StudentCallingHeroProps {
  claim: {
    token: string
    student: StudentCard
    session: SessionSummary
    expiresAt: string
  }
  selectedSession: SessionSummary | undefined
  onOpenSessionSelect: () => void
  onOpenDossier: () => void
  onOpenNote: () => void
  note: string
  onOutcome: (outcome: InvitationOutcome) => void
  isExpired: boolean
  busy: boolean
  onRenewClaim: () => void
  onExpire: () => void
}

export function StudentCallingHero({
  claim,
  selectedSession,
  onOpenSessionSelect,
  onOpenDossier,
  onOpenNote,
  note,
  onOutcome,
  isExpired,
  busy,
  onRenewClaim,
  onExpire,
}: StudentCallingHeroProps) {
  const { student } = claim

  const phoneNumbers = [
    { label: 'دانش‌آموز', value: student.mobile },
    { label: 'مادر', value: student.motherMobile },
    { label: 'پدر', value: student.fatherMobile },
    { label: 'تلفن ثابت', value: student.landline },
  ].filter((p): p is { label: string; value: string } => Boolean(p.value))

  const recentCheckinCount = student.recentCheckins?.length || 0

  return (
    <Card className="border-2 border-accent/30 bg-surface shadow-sm rounded-xl">
      {/* Top Header: Student Identity & Timer */}
      <Card.Header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">
              دانش‌آموز در حال تماس
            </span>
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
              <span className="text-xs text-muted">معرف: {student.referrer}</span>
            )}

            {/* Clickable Dossier Chip */}
            <Chip
              size="sm"
              variant="outline"
              color={recentCheckinCount > 0 ? 'accent' : 'default'}
              className="cursor-pointer hover:bg-surface-secondary transition-colors"
              onClick={onOpenDossier}
            >
              {recentCheckinCount > 0 ? `${recentCheckinCount} حضور قبلی` : 'مشاهده پرونده'}
            </Chip>
          </div>

          <Card.Title className="text-2xl font-bold text-foreground">
            {student.firstName} {student.lastName}
          </Card.Title>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted">مهلت تماس:</span>
          <InvitationTimer expiresAt={claim.expiresAt} onExpire={onExpire} />
        </div>
      </Card.Header>

      <Card.Content className="flex flex-col gap-5 pt-4">
        {/* Expiration Freeze Notice */}
        {isExpired && (
          <div className="bg-warning/15 border border-warning/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <StopwatchIcon className="size-5 text-warning shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-foreground">
                مهلت ثبت نتیجه این تماس منقضی شده است. برای ثبت نتیجه، لطفاً مهلت را تمدید فرمایید (یادداشت حفظ می‌شود).
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              isDisabled={busy}
              onPress={onRenewClaim}
              className="w-full sm:w-auto shrink-0"
            >
              {busy ? 'در حال تمدید…' : 'تمدید مهلت تماس'}
            </Button>
          </div>
        )}

        {/* Phone Numbers: Compact Pill Chips */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted">شماره‌های تماس سریع:</span>
          <div className="flex flex-wrap items-center gap-2">
            {phoneNumbers.length === 0 ? (
              <span className="text-xs text-muted">شماره تماسی ثبت نشده است.</span>
            ) : (
              phoneNumbers.map((phone) => (
                <a
                  key={phone.label}
                  href={`tel:${phone.value}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface hover:border-accent hover:bg-accent/5 text-xs font-medium transition-colors"
                >
                  <PhoneIcon className="size-3.5 text-accent shrink-0" />
                  <span className="text-muted">{phone.label}:</span>
                  <span className="tabular-nums font-bold text-foreground" dir="ltr">
                    {phone.value}
                  </span>
                </a>
              ))
            )}
          </div>
        </div>

        {/* Selected Session & Call Note Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-surface-secondary/50">
          <div className="flex items-center gap-2 text-xs">
            <CalendarIcon className="size-4 text-accent shrink-0" />
            <span className="text-muted">سانس انتخابی:</span>
            {selectedSession ? (
              <strong className="text-foreground">
                {selectedSession.title} ({formatDate(selectedSession.startsAt)})
              </strong>
            ) : (
              <strong className="text-warning">سانسی انتخاب نشده است</strong>
            )}
            <Button
              variant="outline"
              size="sm"
              onPress={onOpenSessionSelect}
              className="mr-2 text-xs py-1 px-2.5 h-auto"
            >
              تغییر سانس…
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={note ? 'soft' : 'outline'}
              color={note ? 'accent' : 'default'}
              size="sm"
              onPress={onOpenNote}
              className="text-xs py-1 px-2.5 h-auto flex items-center gap-1.5"
            >
              {note ? (
                <>
                  <EditIcon className="size-3.5 shrink-0" />
                  <span>ویرایش یادداشت تماس (دارای متن)</span>
                </>
              ) : (
                <>
                  <NotesIcon className="size-3.5 shrink-0" />
                  <span>+ افزودن یادداشت تماس</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 4 Outcome Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">ثبت نتیجه تماس:</span>
            <span className="text-xs text-muted hidden sm:inline">
              میانبر کیبورد (کلیدهای ۱ تا ۴)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. Accepted */}
            <Button
              variant="primary"
              size="md"
              isDisabled={busy || isExpired}
              onPress={() => onOutcome('accepted')}
              className="justify-between"
            >
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="size-4 shrink-0" />
                <span className="font-semibold text-sm">پذیرفت</span>
              </div>
              <Kbd className="tabular-nums font-semibold text-xs">1</Kbd>
            </Button>

            {/* 2. No Answer */}
            <Button
              variant="outline"
              size="md"
              isDisabled={busy || isExpired}
              onPress={() => onOutcome('no_answer')}
              className="justify-between"
            >
              <div className="flex items-center gap-2">
                <PhoneIcon className="size-4 shrink-0" />
                <span className="font-medium text-sm">پاسخ نداد</span>
              </div>
              <Kbd className="tabular-nums font-semibold text-xs">2</Kbd>
            </Button>

            {/* 3. Declined */}
            <Button
              variant="danger"
              size="md"
              isDisabled={busy || isExpired}
              onPress={() => onOutcome('declined')}
              className="justify-between"
            >
              <div className="flex items-center gap-2">
                <DangerCircleIcon className="size-4 shrink-0" />
                <span className="font-medium text-sm">انصراف</span>
              </div>
              <Kbd className="tabular-nums font-semibold text-xs">3</Kbd>
            </Button>

            {/* 4. Postponed */}
            <Button
              variant="secondary"
              size="md"
              isDisabled={busy || isExpired}
              onPress={() => onOutcome('postponed')}
              className="justify-between"
            >
              <div className="flex items-center gap-2">
                <StopwatchIcon className="size-4 shrink-0" />
                <span className="font-medium text-sm">تعویق و تماس مجدد</span>
              </div>
              <Kbd className="tabular-nums font-semibold text-xs">4</Kbd>
            </Button>
          </div>
        </div>
      </Card.Content>
    </Card>
  )
}
