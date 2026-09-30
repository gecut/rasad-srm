import type { ISmsProvider, SendPatternParams, SendSmsParams, SendSmsResult } from './types'

export interface SentSmsRecord {
  type: 'plain' | 'pattern'
  recipient: string
  message: string
  patternCode?: string
  tokens?: Record<string, string | number>
  metadata?: Record<string, unknown>
  sentAt: Date
}

/**
 * High-fidelity Simulated / Mock SMS provider.
 * Mimics real-world Iranian pattern-based SMS delivery (e.g., Kavenegar / FarazSMS)
 * while capturing all dispatched messages in-memory for testing, auditing, and development.
 */
export class SimulatedSmsProvider implements ISmsProvider {
  public readonly name = 'simulated'
  public sentMessages: SentSmsRecord[] = []
  public shouldFail = false
  public failError = 'Simulated SMS provider delivery failure'

  async sendSms(params: SendSmsParams): Promise<SendSmsResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: this.failError,
      }
    }

    const record: SentSmsRecord = {
      type: 'plain',
      recipient: params.recipient,
      message: params.message,
      metadata: params.metadata,
      sentAt: new Date(),
    }

    this.sentMessages.push(record)

    if (process.env.NODE_ENV !== 'test') {
      // Structure log for developer visibility
      console.info(`[SMS:Plain] -> ${params.recipient}: "${params.message}"`)
    }

    return {
      success: true,
      messageId: `sim-msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    }
  }

  async sendPatternSms(params: SendPatternParams): Promise<SendSmsResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: this.failError,
      }
    }

    // Render a simulated readable message from tokens
    const tokenSummary = Object.entries(params.tokens)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')
    const renderedMessage = `[Pattern: ${params.patternCode}] (${tokenSummary})`

    const record: SentSmsRecord = {
      type: 'pattern',
      recipient: params.recipient,
      message: renderedMessage,
      patternCode: params.patternCode,
      tokens: params.tokens,
      metadata: params.metadata,
      sentAt: new Date(),
    }

    this.sentMessages.push(record)

    if (process.env.NODE_ENV !== 'test') {
      console.info(
        `[SMS:Pattern] -> ${params.recipient} [Code: ${params.patternCode}]:`,
        params.tokens,
      )
    }

    return {
      success: true,
      messageId: `sim-pattern-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    }
  }

  reset(): void {
    this.sentMessages = []
    this.shouldFail = false
    this.failError = 'Simulated SMS provider delivery failure'
  }
}

/**
 * Backward compatibility alias for existing tests and call sites.
 */
export const MockSmsProvider = SimulatedSmsProvider

// Global/singleton provider instance
let currentProvider: ISmsProvider = new SimulatedSmsProvider()

export function getSmsProvider(): ISmsProvider {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.SMS_PROVIDER !== 'mock' &&
    process.env.SMS_PROVIDER !== 'simulated' &&
    currentProvider.name === 'simulated'
  ) {
    // In production, require an explicit configuration or fallback
    throw new Error('Production SMS provider is not configured; delivery was not attempted')
  }
  return currentProvider
}

export function setSmsProvider(provider: ISmsProvider): void {
  currentProvider = provider
}

export function resetSmsProvider(): void {
  currentProvider = new SimulatedSmsProvider()
}
