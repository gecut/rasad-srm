import type { ISmsProvider, SendSmsParams, SendSmsResult } from './types'

export interface SentSmsRecord {
  recipient: string
  message: string
  metadata?: Record<string, unknown>
  sentAt: Date
}

export class MockSmsProvider implements ISmsProvider {
  public sentMessages: SentSmsRecord[] = []
  public shouldFail = false
  public failError = 'Mock SMS provider delivery failure'

  async sendSms(params: SendSmsParams): Promise<SendSmsResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: this.failError,
      }
    }

    const record: SentSmsRecord = {
      recipient: params.recipient,
      message: params.message,
      metadata: params.metadata,
      sentAt: new Date(),
    }

    this.sentMessages.push(record)

    return {
      success: true,
      messageId: `mock-msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    }
  }

  reset(): void {
    this.sentMessages = []
    this.shouldFail = false
    this.failError = 'Mock SMS provider delivery failure'
  }
}

// Global/singleton provider instance
let currentProvider: ISmsProvider = new MockSmsProvider()

export function getSmsProvider(): ISmsProvider {
  if (process.env.NODE_ENV === 'production' && process.env.SMS_PROVIDER !== 'mock')
    throw new Error('SMS provider is not configured; delivery was not attempted')
  return currentProvider
}

export function setSmsProvider(provider: ISmsProvider): void {
  currentProvider = provider
}

export function resetSmsProvider(): void {
  currentProvider = new MockSmsProvider()
}
