import type { Student, Session } from './payload-types'

export type InvitationOutcome =
  'accepted' | 'needs_alternative_session' | 'no_answer_sms' | 'failed'
export interface SessionSummary {
  id: number
  title?: string | null
  startsAt: string
  status: Session['status']
}
export interface PanelContext {
  ceremonies: { id: number; title: string; sessions: SessionSummary[] }[]
}
export interface StudentCard {
  id: number
  firstName: string
  lastName: string
  grade?: number | null
  mobile?: string | null
  motherMobile?: string | null
  fatherMobile?: string | null
}
export interface InvitationQueue {
  session: SessionSummary | null
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
  assignedSessionId?: number | null
  assignedSessionTitle?: string | null
  checkedIn: boolean
}
export interface ReceptionSearch {
  students: ReceptionStudent[]
}
