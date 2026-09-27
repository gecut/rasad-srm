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

    // Only invitations with outcome 'no_answer_sms' require SMS
    if (invitation.outcome !== 'no_answer_sms' || invitation.smsStatus === 'sent') {
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

    // Determine target recipient phone number
    const recipient = student.mobile || student.motherMobile || student.fatherMobile

    if (!recipient) {
      await req.payload.update({
        collection: 'invitations',
        id: invitationId,
        data: { smsStatus: 'failed' },
        req,
      })
      throw new Error(`شماره تماسی برای ارسال پیامک به دانش‌آموز شناسه ${student.id} موجود نیست.`)
    }

    const message = `دانش‌آموز گرامی، تماس ما در ارتباط با برنامه رصد بی‌پاسخ ماند. جهت هماهنگی با شما تماس خواهیم گرفت.`

    const provider = getSmsProvider()
    const sendResult = await provider.sendSms({
      recipient,
      message,
      metadata: {
        invitationId,
        studentId: student.id,
      },
    })

    if (!sendResult.success) {
      await req.payload.update({
        collection: 'invitations',
        id: invitationId,
        data: { smsStatus: 'failed' },
        req,
      })
      throw new Error(sendResult.error || 'ارسال پیامک با خطا مواجه شد.')
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
        messageId: sendResult.messageId,
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
