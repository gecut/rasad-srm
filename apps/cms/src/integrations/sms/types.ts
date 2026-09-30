/**
 * Provider-independent SMS boundary interfaces.
 * Allows decoupling domain actions and background tasks from the specific SMS delivery provider.
 */

export interface SendSmsParams {
  recipient: string
  message: string
  metadata?: Record<string, unknown>
}

export interface SendPatternParams {
  recipient: string
  patternCode: string
  tokens: Record<string, string | number>
  metadata?: Record<string, unknown>
}

export interface SendSmsResult {
  success: boolean
  messageId?: string
  error?: string
  rawResponse?: unknown
}

export interface ISmsProvider {
  readonly name: string
  sendSms(params: SendSmsParams): Promise<SendSmsResult>
  sendPatternSms(params: SendPatternParams): Promise<SendSmsResult>
}

export const SMS_PATTERN_KEYS = {
  INVITATION_ACCEPTED: 'invitation_accepted',
  NO_ANSWER: 'no_answer',
} as const
