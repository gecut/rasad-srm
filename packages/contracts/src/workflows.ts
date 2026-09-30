import type { Student, Session } from './payload-types'

export type AttendancePolicy = 'single' | 'multiple'

export type InvitationOutcome =
  | 'accepted'
  | 'no_answer'
  | 'declined'
  | 'postponed'
  | 'needs_alternative_session'
  | 'no_answer_sms'
  | 'failed'

export interface SessionSummary {
  id: number
  title?: string | null
  startsAt: string
  endsAt?: string | null
  status: Session['status']
  capacity?: number | null
  acceptedCount?: number
  checkedInCount?: number
}

export interface PanelCeremony {
  id: number
  title: string
  attendancePolicy?: AttendancePolicy
  sessions: SessionSummary[]
}

export interface PanelContext {
  ceremonies: PanelCeremony[]
  neighborhoods?: { id: number; name: string }[]
}

export interface StudentCheckinSummary {
  ceremonyId: number
  ceremonyTitle: string
  sessionId: number
  sessionTitle?: string | null
  checkedInAt: string
}

export interface StudentCard {
  id: number
  firstName: string
  lastName: string
  grade?: number | null
  mobile?: string | null
  motherMobile?: string | null
  fatherMobile?: string | null
  landline?: string | null
  neighborhood?: { id: number; name: string } | null
  address?: string | null
  referrer?: string | null
  notes?: string | null
  recentCheckins?: StudentCheckinSummary[]
  attendedCeremonies?: { id: number; title: string }[]
}

export interface InvitationQueue {
  session: SessionSummary | null
  availableSessions?: SessionSummary[]
  claim: { token: string; student: StudentCard; session: SessionSummary; expiresAt: string } | null
}

export interface TeacherRoster {
  classes: {
    id: number
    title: string
    students: (StudentCard & { lifecycleStatus: Student['lifecycleStatus'] })[]
  }[]
}

export interface ReceptionStudent {
  id: number
  firstName: string
  lastName: string
  grade?: number | null
  phone?: string | null
  mobile?: string | null
  motherMobile?: string | null
  fatherMobile?: string | null
  landline?: string | null
  neighborhoodId?: number | null
  neighborhoodName?: string | null
  address?: string | null
  referrer?: string | null
  notes?: string | null
  assignedSessionId?: number | null
  assignedSessionTitle?: string | null
  checkedIn: boolean
  previousCheckin?: {
    ceremonyTitle: string
    sessionTitle?: string | null
    checkedInAt: string
  } | null
}

export interface ReceptionSearch {
  students: ReceptionStudent[]
}

export interface ReceptionQuickEditInput {
  studentId: number
  firstName?: string
  lastName?: string
  grade?: number | null
  mobile?: string | null
  motherMobile?: string | null
  fatherMobile?: string | null
  landline?: string | null
  neighborhoodId?: number | null
  address?: string | null
  referrer?: string | null
  notes?: string | null
  isClassSeeker?: boolean
}

export interface ReceptionWalkInInput {
  sessionId: number
  firstName: string
  lastName: string
  grade?: number | null
  mobile?: string | null
  motherMobile?: string | null
  fatherMobile?: string | null
  landline?: string | null
  neighborhoodId?: number | null
  address?: string | null
  referrer?: string | null
  notes?: string | null
  isClassSeeker?: boolean
  allowSharedPhone?: boolean
}
