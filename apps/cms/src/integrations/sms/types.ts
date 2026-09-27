/**
 * Provider-independent SMS boundary interfaces.
 * Allows decoupling domain actions and background tasks from the specific SMS delivery provider.
 */

export interface SendSmsParams {
  recipient: string
  message: string
  metadata?: Record<string, unknown>
}

export interface SendSmsResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface ISmsProvider {
  sendSms(params: SendSmsParams): Promise<SendSmsResult>
}
