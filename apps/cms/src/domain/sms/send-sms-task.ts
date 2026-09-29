import type { TaskConfig } from 'payload'
import type { Invitation, Student } from '@/payload-types'
import { getSmsProvider } from '../../integrations/sms/mockProvider'

export interface SendSmsInput {
  invitationId: number
}

/**
 * Payload Background Task for processing SMS fallback for 'no_answer_sms' invitations.
 * Decoupled from the synchronous invitation response workflow.
 */
export const sendSmsTask: TaskConfig = {
  slug: 'send-sms',
  label: 'ارسال پیامک پیگیری دعوت',
  inputSchema: [
    {
      name: 'invitationId',
      type: 'number',
      required: true,
    },
  ],
  outputSchema: [
    {
      name: 'success',
      type: 'checkbox',
    },
    {
      name: 'messageId',
      type: 'text',
    },
  ],
  handler: async ({ input, req }) => {
    const { invitationId } = input as SendSmsInput

    const invitation = (await req.payload.findByID({
      collection: 'invitations',
      id: invitationId,
      req,
    })) as Invitation

    if (!invitation) {
      throw new Error(`دعوت با شناسه ${invitationId} یافت نشد.`)
    }

    // Invitations with outcome 'accepted' or legacy 'no_answer_sms' require SMS
    if (
      (invitation.outcome !== 'accepted' && invitation.outcome !== 'no_answer_sms') ||
      invitation.smsStatus === 'sent'
    ) {
      return {
        output: { success: true },
        state: 'succeeded',
      }
    }

    // Fetch student
    const studentId =
      typeof invitation.student === 'object' && invitation.student !== null
        ? invitation.student.id
        : (invitation.student as number)

    const student = (await req.payload.findByID({
      collection: 'students',
      id: studentId,
      req,
    })) as Student

    if (!student) {
      await req.payload.update({
        collection: 'invitations',
        id: invitationId,
        data: { smsStatus: 'failed' },
        req,
      })
      throw new Error(`دانش‌آموز با شناسه ${studentId} یافت نشد.`)
    }

    // Determine target recipient phone numbers
    const recipients = [student.mobile, student.motherMobile, student.fatherMobile].filter(
      (p): p is string => Boolean(p && /^09\d{9}$/.test(p)),
    )

    if (!recipients.length) {
      await req.payload.update({
        collection: 'invitations',
        id: invitationId,
        data: { smsStatus: 'failed' },
        req,
      })
      throw new Error(`شماره تماسی برای ارسال پیامک به دانش‌آموز شناسه ${student.id} موجود نیست.`)
    }

    const provider = getSmsProvider()
    let lastMessageId = ''
    let anySuccess = false

    const studentFullName =
      `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'دانش‌آموز گرامی'

    let patternCode: string
    let tokens: Record<string, string | number>
    let plainMessage: string

    if (invitation.outcome === 'accepted') {
      let sessionTitle = 'سانس مراسم'
      if (invitation.assignedSession) {
        const sess = await req.payload.findByID({
          collection: 'sessions',
          id:
            typeof invitation.assignedSession === 'object'
              ? invitation.assignedSession.id
              : invitation.assignedSession,
          depth: 0,
          req,
        })
        if (sess?.title) sessionTitle = sess.title
      }

      patternCode = process.env.SMS_PATTERN_INVITATION_ACCEPTED || 'invitation_accepted'
      tokens = {
        name: studentFullName,
        session: sessionTitle,
      }
      plainMessage = `دانش‌آموز گرامی ${studentFullName}، دعوت شما به مراسم (${sessionTitle}) با موفقیت ثبت شد.`
    } else {
      patternCode = process.env.SMS_PATTERN_NO_ANSWER || 'no_answer'
      tokens = {
        name: studentFullName,
      }
      plainMessage = `دانش‌آموز گرامی ${studentFullName}، تماس ما در ارتباط با برنامه رصد بی‌پاسخ ماند. جهت هماهنگی با شما تماس خواهیم گرفت.`
    }

    for (const recipient of recipients) {
      const sendResult =
        typeof provider.sendPatternSms === 'function'
          ? await provider.sendPatternSms({
              recipient,
              patternCode,
              tokens,
              metadata: {
                invitationId,
                studentId: student.id,
              },
            })
          : await provider.sendSms({
              recipient,
              message: plainMessage,
              metadata: {
                invitationId,
                studentId: student.id,
              },
            })

      if (sendResult.success) {
        anySuccess = true
        lastMessageId = sendResult.messageId || ''
      }
    }

    if (!anySuccess) {
      await req.payload.update({
        collection: 'invitations',
        id: invitationId,
        data: { smsStatus: 'failed' },
        req,
      })
      throw new Error('ارسال پیامک با خطا مواجه شد.')
    }

    // Update invitation technical smsStatus to sent
    await req.payload.update({
      collection: 'invitations',
      id: invitationId,
      data: { smsStatus: 'sent' },
      req,
    })

    return {
      output: {
        success: true,
        messageId: lastMessageId,
      },
      state: 'succeeded',
    }
  },
  onFail: async ({ input, req }) => {
    if (input && typeof input === 'object' && 'invitationId' in input) {
      try {
        await req.payload.update({
          collection: 'invitations',
          id: (input as SendSmsInput).invitationId,
          data: { smsStatus: 'failed' },
          req,
        })
      } catch {
        // Prevent recursive error in failure hook
      }
    }
  },
}
